import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { INITIAL_USERS } from '../services/seedData';
import { auth } from '../services/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';

interface AuthContextType {
  currentUser: User;
  allUsers: User[];
  setCurrentUser: (user: User) => void;
  switchUserById: (userId: string) => void;
  isAuthorizedForDepartment: (deptId: string) => boolean;
  isManagementOrAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default to HR Head Fatima Zahra so Department Head dashboard & submission workflow is immediately front & center!
  const [currentUser, setCurrentUser] = useState<User>(INITIAL_USERS[1]); // Fatima Zahra (HR)
  const [allUsers] = useState<User[]>(INITIAL_USERS);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // If logged in via Google Auth
        const existing = allUsers.find(u => u.email.toLowerCase() === firebaseUser.email?.toLowerCase());
        if (existing) {
          setCurrentUser(existing);
        } else {
          // Default to admin profile with their email
          const newAdmin: User = {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || 'Authorized User',
            email: firebaseUser.email || 'user@abstarsands.com',
            role: 'admin',
            departmentIds: ['dept-hr', 'dept-fin', 'dept-visa', 'dept-it', 'dept-ops', 'dept-maint', 'dept-bd'],
            departmentName: 'Executive Management',
            designation: 'Executive Administrator',
            active: true,
            createdAt: new Date().toISOString()
          };
          setCurrentUser(newAdmin);
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
      // Revert to demo user
      setCurrentUser(INITIAL_USERS[1]);
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
        isAuthorizedForDepartment,
        isManagementOrAdmin,
        signInWithGoogle,
        logOut
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
