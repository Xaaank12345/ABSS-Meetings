import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  PlusCircle,
  Building2,
  CheckSquare,
  Users,
  BarChart3,
  FileSpreadsheet,
  Settings,
  FileEdit,
  ClipboardCheck,
  BookOpen,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type NavTab =
  | 'dashboard'
  | 'submit-agenda'
  | 'management-review'
  | 'minutes-recorder'
  | 'meetings'
  | 'create-meeting'
  | 'departments'
  | 'actions'
  | 'employees'
  | 'reports'
  | 'import-export'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  mobileOpen = false,
  onCloseMobile
}) => {
  const { currentUser, isManagementOrAdmin } = useAuth();

  const navItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'submit-agenda' as NavTab,
      label: 'Dept Minutes Submission',
      icon: FileEdit,
      badge: 'Prep'
    },
    {
      id: 'management-review' as NavTab,
      label: 'Management Review & Agenda',
      icon: ClipboardCheck,
      badge: isManagementOrAdmin ? 'Admin' : null
    },
    {
      id: 'minutes-recorder' as NavTab,
      label: 'Post-Meeting Minutes',
      icon: BookOpen,
      badge: null
    },
    {
      id: 'meetings' as NavTab,
      label: 'All Meetings',
      icon: Calendar,
      badge: null
    },
    {
      id: 'create-meeting' as NavTab,
      label: 'Create Meeting',
      icon: PlusCircle,
      badge: null
    },
    {
      id: 'actions' as NavTab,
      label: 'Action Tracker',
      icon: CheckSquare,
      badge: null
    },
    {
      id: 'departments' as NavTab,
      label: 'Departments',
      icon: Building2,
      badge: null
    },
    {
      id: 'employees' as NavTab,
      label: 'Employees & Participants',
      icon: Users,
      badge: null
    },
    {
      id: 'reports' as NavTab,
      label: 'Reports & Analytics',
      icon: BarChart3,
      badge: null
    },
    {
      id: 'import-export' as NavTab,
      label: 'Import / Export (XLSX)',
      icon: FileSpreadsheet,
      badge: null
    },
    {
      id: 'settings' as NavTab,
      label: 'Settings & Audit Log',
      icon: Settings,
      badge: null
    }
  ];

  const content = (
    <div className="flex flex-col h-full">
      {/* Brand Header */}
      <div className="h-16 border-b border-[#30303D] flex items-center justify-between px-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#22C55E] via-[#10B981] to-[#8B5CF6] flex items-center justify-center shadow-lg shadow-emerald-950/40">
            <span className="text-white font-black text-sm tracking-tighter">ABSS</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-[#F5F5F7] tracking-wider uppercase font-mono">
              AB STAR SANDS
            </span>
            <span className="text-[10px] text-[#A1A1B5] font-medium tracking-tight">
              (PVT) LTD • Meeting System
            </span>
          </div>
        </div>

        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 text-[#A1A1B5] hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Role Banner */}
      <div className="mx-3 mt-3 p-2.5 rounded-lg bg-[#1B1B25] border border-[#30303D] flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-[#A1A1B5] tracking-wider">Active Workspace</span>
          <span className="text-xs font-semibold text-[#22C55E] truncate max-w-[140px]">
            {currentUser.departmentName || 'All Departments'}
          </span>
        </div>
        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#8B5CF6]/20 text-[#A78BFA] font-medium">
          {currentUser.role === 'dept_head' ? 'Dept Head' : currentUser.role}
        </span>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#A1A1B5]/60">
          Core Workflow
        </div>

        {navItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onSelectTab(item.id);
                if (onCloseMobile) onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all text-left cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-[#8B5CF6]/20 to-[#22C55E]/10 text-white border border-[#8B5CF6]/50 shadow-sm'
                  : 'text-[#A1A1B5] hover:text-[#F5F5F7] hover:bg-[#1B1B25]'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#8B5CF6]' : 'text-[#A1A1B5]'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-semibold ${
                    item.badge === 'Prep'
                      ? 'bg-[#22C55E]/20 text-[#4ADE80]'
                      : 'bg-[#8B5CF6]/20 text-[#C4B5FD]'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        <div className="px-2 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#A1A1B5]/60">
          Management & Records
        </div>

        {navItems.slice(4).map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onSelectTab(item.id);
                if (onCloseMobile) onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all text-left cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-[#8B5CF6]/20 to-[#22C55E]/10 text-white border border-[#8B5CF6]/50 shadow-sm'
                  : 'text-[#A1A1B5] hover:text-[#F5F5F7] hover:bg-[#1B1B25]'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#22C55E]' : 'text-[#A1A1B5]'}`} />
                <span className="truncate">{item.label}</span>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-[#30303D] text-[10px] text-[#A1A1B5] flex items-center justify-between">
        <span>Firestore Synced</span>
        <span className="inline-flex items-center gap-1 text-[#22C55E]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-ping" />
          Active
        </span>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-[#15151C] border-r border-[#30303D] flex-col shrink-0 min-h-screen">
        {content}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[85vw] bg-[#15151C] border-r border-[#30303D] h-full shadow-2xl flex flex-col z-10">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
