import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { INITIAL_USERS } from '../services/seedData';
import { auth } from '../services/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { getUsers, addUser } from '../services/db';

interface AuthContextType {
  currentUser: User;
  allUsers: User[];
  setCurrentUser: (user: User) => void;
  switchUserById: (userId: string) => void;
  createNewUser: (user: Omit<User, 'uid' | 'createdAt'>) => Promise<User>;
  isAuthorizedForDepartment: (deptId: string) => boolean;
  isManagementOrAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  logOut: () => Promise<void>;
  refreshUsers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Start with the single Admin user
  const [currentUser, setCurrentUser] = useState<User>(INITIAL_USERS[0]);
  const [allUsers, setAllUsers] = useState<User[]>(INITIAL_USERS);

  const refreshUsers = async () => {
    try {
      const dbUsers = await getUsers();
      if (dbUsers && dbUsers.length > 0) {
        setAllUsers(dbUsers);
      }
    } catch (e) {
      console.warn('Failed refreshing users:', e);
    }
  };

  useEffect(() => {
    refreshUsers();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // If logged in via Google Auth
        const existing = allUsers.find(u => u.email.toLowerCase() === firebaseUser.email?.toLowerCase());
        if (existing) {
          setCurrentUser(existing);
        } else {
          // Grant admin rights to the authenticated user
          const adminProfile: User = {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || 'Engr. Ahmed Al-Saeed',
            email: firebaseUser.email || 'admin@abstarsands.com',
            role: 'admin',
            departmentIds: ['dept-hr', 'dept-fin', 'dept-visa', 'dept-it', 'dept-ops', 'dept-maint', 'dept-bd'],
            departmentName: 'Executive Management',
            designation: 'Managing Director & System Administrator',
            active: true,
            createdAt: new Date().toISOString()
          };
          setCurrentUser(adminProfile);
        }
      }
    });
    return () => unsubscribe();
  }, [allUsers]);

  const switchUserById = (userId: string) => {
    const found = allUsers.find(u => u.uid === userId);
    if (found) {
      setCurrentUser(found);
    }
  };

  const createNewUser = async (userData: Omit<User, 'uid' | 'createdAt'>): Promise<User> => {
    const newUser: User = {
      ...userData,
      uid: `user-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    await addUser(newUser);
    setAllUsers(prev => [...prev, newUser]);
    return newUser;
  };

  const isAuthorizedForDepartment = (deptId: string): boolean => {
    if (currentUser.role === 'admin' || currentUser.role === 'management') return true;
    return currentUser.departmentIds.includes(deptId);
  };

  const isManagementOrAdmin = currentUser.role === 'admin' || currentUser.role === 'management';

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.warn('Google sign-in fallback:', err);
    }
  };

  const logOut = async () => {
    try {
      await signOut(auth);
      // Reset to default admin user
      setCurrentUser(INITIAL_USERS[0]);
    } catch (e) {
      console.warn('Logout error:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        allUsers,
        setCurrentUser,
        switchUserById,
        createNewUser,
        isAuthorizedForDepartment,
        isManagementOrAdmin,
        signInWithGoogle,
        logOut,
        refreshUsers
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
