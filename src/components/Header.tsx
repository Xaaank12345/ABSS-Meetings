import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Bell,
  Search,
  UserCheck,
  ChevronDown,
  LogOut,
  LogIn,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Menu
} from 'lucide-react';
import { AppNotification } from '../types';

interface HeaderProps {
  notifications: AppNotification[];
  onMarkNotificationRead: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onNavigateToPrep?: () => void;
  onOpenMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  notifications,
  onMarkNotificationRead,
  searchQuery,
  onSearchChange,
  onNavigateToPrep,
  onOpenMobileMenu
}) => {
  const { currentUser, allUsers, switchUserById, signInWithGoogle, logOut } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="h-16 bg-[#15151C] border-b border-[#30303D] px-4 md:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Mobile Menu & Search Input */}
      <div className="flex items-center gap-2 md:gap-3 w-60 sm:w-72 md:w-96">
        {onOpenMobileMenu && (
          <button
            onClick={onOpenMobileMenu}
            className="md:hidden p-2 rounded-lg text-[#A1A1B5] hover:text-white hover:bg-[#242432]"
            title="Open Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="relative w-full">
          <Search className="w-4 h-4 text-[#A1A1B5] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search meetings, topics, actions, decisions..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-[#1B1B25] border border-[#30303D] rounded-lg pl-9 pr-4 py-1.5 text-xs text-[#F5F5F7] placeholder-[#A1A1B5] focus:outline-none focus:border-[#8B5CF6] transition-colors"
          />
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifMenu(!showNotifMenu);
              setShowUserMenu(false);
            }}
            className="p-2 rounded-lg text-[#A1A1B5] hover:text-[#F5F5F7] hover:bg-[#242432] relative transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#22C55E] rounded-full ring-2 ring-[#15151C] animate-pulse" />
            )}
          </button>

          {showNotifMenu && (
            <div className="absolute right-0 mt-2 w-80 md:w-96 bg-[#1B1B25] border border-[#30303D] rounded-xl shadow-2xl py-2 z-50">
              <div className="px-4 py-2 border-b border-[#30303D] flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#F5F5F7]">Notifications</span>
                <span className="text-xs text-[#8B5CF6] font-medium">{unreadCount} new</span>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-[#30303D]/50">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[#A1A1B5]">No new notifications</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        onMarkNotificationRead(n.id);
                        if (onNavigateToPrep) onNavigateToPrep();
                        setShowNotifMenu(false);
                      }}
                      className={`p-3 text-xs hover:bg-[#242432] cursor-pointer transition-colors ${
                        !n.read ? 'bg-[#242432]/50 border-l-2 border-[#22C55E]' : 'opacity-70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-[#F5F5F7]">{n.title}</span>
                        {!n.read && <span className="text-[10px] text-[#22C55E] shrink-0 font-medium">New</span>}
                      </div>
                      <p className="text-[#A1A1B5] mt-1 text-[11px] leading-relaxed">{n.message}</p>
                      <span className="text-[10px] text-gray-500 mt-1.5 block">
                        {new Date(n.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Role & User Switcher */}
        <div className="relative">
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifMenu(false);
            }}
            className="flex items-center gap-2.5 bg-[#1B1B25] hover:bg-[#242432] border border-[#30303D] px-3 py-1.5 rounded-lg text-left transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#8B5CF6] to-[#22C55E] flex items-center justify-center text-white text-xs font-bold">
              {currentUser.displayName.charAt(0)}
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-semibold text-[#F5F5F7] leading-tight flex items-center gap-1.5">
                {currentUser.displayName}
                <span className="text-[10px] font-normal uppercase px-1.5 py-0.2 rounded bg-[#30303D] text-[#C4B5FD]">
                  {currentUser.role === 'dept_head' ? 'Dept Head' : currentUser.role}
                </span>
              </div>
              <div className="text-[11px] text-[#A1A1B5] truncate max-w-[130px]">
                {currentUser.departmentName || currentUser.designation}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#A1A1B5] ml-1" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-72 bg-[#1B1B25] border border-[#30303D] rounded-xl shadow-2xl py-2 z-50">
              <div className="px-3 py-2 border-b border-[#30303D]">
                <div className="text-xs font-semibold text-[#F5F5F7]">{currentUser.displayName}</div>
                <div className="text-[11px] text-[#A1A1B5]">{currentUser.email}</div>
                <div className="text-[11px] text-[#22C55E] mt-0.5">{currentUser.designation}</div>
              </div>

              {allUsers.length > 1 ? (
                <>
                  <div className="px-3 py-1.5 text-[10px] uppercase font-semibold text-[#8B5CF6] tracking-wider">
                    Switch User Profile
                  </div>
                  <div className="max-h-56 overflow-y-auto">
                    {allUsers.map((u) => (
                      <button
                        key={u.uid}
                        onClick={() => {
                          switchUserById(u.uid);
                          setShowUserMenu(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-[#242432] transition-colors ${
                          u.uid === currentUser.uid ? 'bg-[#242432] text-[#22C55E] font-medium' : 'text-[#F5F5F7]'
                        }`}
                      >
                        <div>
                          <div className="font-medium">{u.displayName}</div>
                          <div className="text-[10px] text-[#A1A1B5]">{u.departmentName || u.designation}</div>
                        </div>
                        {u.uid === currentUser.uid && <UserCheck className="w-3.5 h-3.5 text-[#22C55E]" />}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="px-3 py-2 text-[11px] text-[#A1A1B5] bg-[#15151C]/50 rounded-lg m-2">
                  <span className="text-[#22C55E] font-semibold block mb-0.5">Single Admin Mode</span>
                  Full management access across all ABSS departments and meetings.
                </div>
              )}

              <div className="border-t border-[#30303D] mt-2 pt-1 px-2 flex flex-col gap-1">
                <button
                  onClick={signInWithGoogle}
                  className="w-full text-xs flex items-center gap-2 px-2 py-1.5 text-[#A78BFA] hover:bg-[#242432] rounded transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Sign In with Google Account
                </button>
                <button
                  onClick={logOut}
                  className="w-full text-xs flex items-center gap-2 px-2 py-1.5 text-red-400 hover:bg-[#242432] rounded transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Reset / Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
