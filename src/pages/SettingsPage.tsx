import React, { useState, useEffect } from 'react';
import { AuditLog, User } from '../types';
import { getAuditLogs, resetToSingleAdminState, addUser } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { Shield, Database, History, UserCheck, RefreshCw, Plus, CheckCircle2, AlertTriangle, Trash2 } from 'lucide-react';

interface SettingsPageProps {
  users: User[];
  onRefreshData: () => Promise<void>;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ users, onRefreshData }) => {
  const { currentUser, refreshUsers } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isResetting, setIsResetting] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // New User Form Modal state
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'management' | 'dept_head'>('dept_head');
  const [newUserDesignation, setNewUserDesignation] = useState('');
  const [newUserDept, setNewUserDept] = useState('dept-hr');

  useEffect(() => {
    getAuditLogs().then(setLogs);
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleResetToClean = async () => {
    if (!window.confirm('Reset database? This will remove all created meetings and accounts, leaving ONLY the single Admin account.')) {
      return;
    }
    setIsResetting(true);
    try {
      await resetToSingleAdminState();
      await refreshUsers();
      await onRefreshData();
      const updatedLogs = await getAuditLogs();
      setLogs(updatedLogs);
      showToast('Database reset: all meetings removed and restored to Single Admin account.');
    } catch (err) {
      console.error(err);
      showToast('Error resetting database.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    try {
      const created: User = {
        uid: `user-${Date.now()}`,
        displayName: newUserName.trim(),
        email: newUserEmail.trim(),
        role: newUserRole,
        departmentIds: newUserRole === 'admin' ? ['dept-hr', 'dept-fin', 'dept-visa', 'dept-it', 'dept-ops', 'dept-maint', 'dept-bd'] : [newUserDept],
        departmentName: newUserRole === 'admin' ? 'Executive Management' : newUserDept.replace('dept-', '').toUpperCase(),
        designation: newUserDesignation.trim() || (newUserRole === 'dept_head' ? 'Department Head' : 'Manager'),
        active: true,
        createdAt: new Date().toISOString()
      };

      await addUser(created);
      await refreshUsers();
      await onRefreshData();
      setShowAddUserModal(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserDesignation('');
      showToast(`User ${created.displayName} created successfully.`);
    } catch (err) {
      console.error(err);
      showToast('Failed to create user account.');
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#22C55E] text-gray-950 font-semibold px-4 py-3 rounded-lg shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-gray-950" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-[#1B1B25] border border-[#30303D] rounded-xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold text-[#A1A1B5] tracking-wider">
            System Administration & Governance
          </span>
          <h1 className="text-xl font-bold text-[#F5F5F7] mt-0.5">
            System Settings & Accounts
          </h1>
          <p className="text-xs text-[#A1A1B5] mt-1">
            Managing administrator credentials, role-based access, and clean Firestore state for AB STAR SANDS (PVT) LTD.
          </p>
        </div>

        <button
          onClick={handleResetToClean}
          disabled={isResetting}
          className="px-4 py-2.5 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 font-semibold text-xs flex items-center gap-2 hover:bg-red-900/50 transition-all cursor-pointer"
          title="Clears all meetings and resets to single admin account"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
          <span>{isResetting ? 'Resetting...' : 'Reset to Clean Single Admin'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Accounts & System Info */}
        <div className="space-y-6">
          {/* Active Admin Account */}
          <div className="bg-[#1B1B25] border border-[#30303D] rounded-xl p-5 space-y-4 shadow-md">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#F5F5F7] flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#22C55E]" />
                Authorized Admin Account
              </h2>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-mono px-2 py-0.5 rounded border border-emerald-500/20">
                1 Account Active
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-[#15151C] border border-[#30303D] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#F5F5F7] text-sm">{currentUser.displayName}</span>
                <span className="text-[10px] bg-[#8B5CF6]/20 text-[#C4B5FD] uppercase font-bold px-2 py-0.5 rounded">
                  {currentUser.role}
                </span>
              </div>
              <div className="text-[11px] text-[#A1A1B5] font-mono">{currentUser.email}</div>
              <div className="text-[11px] text-[#22C55E]">{currentUser.designation}</div>
              <div className="pt-2 border-t border-[#30303D]/60 text-[11px] text-[#A1A1B5]">
                Full administrative access to all departmental minutes, submissions, meetings, and reviews.
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowAddUserModal(true)}
                className="w-full py-2 bg-[#242432] hover:bg-[#30303D] text-[#C4B5FD] border border-[#8B5CF6]/30 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Department Head / User Account</span>
              </button>
            </div>
          </div>

          {/* Database Architecture */}
          <div className="bg-[#1B1B25] border border-[#30303D] rounded-xl p-5 space-y-4 shadow-md">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#F5F5F7] flex items-center gap-2">
              <Database className="w-4 h-4 text-[#22C55E]" />
              Database Architecture
            </h2>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-[#30303D]/60">
                <span className="text-[#A1A1B5]">Storage Engine:</span>
                <span className="font-semibold text-[#F5F5F7]">Google Cloud Firestore</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#30303D]/60">
                <span className="text-[#A1A1B5]">Database ID:</span>
                <span className="font-mono text-[#C4B5FD] text-[11px]">ai-studio-19e2b673</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#30303D]/60">
                <span className="text-[#A1A1B5]">Security Rules:</span>
                <span className="font-semibold text-emerald-400">Deployed & Enforced</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#A1A1B5]">Authentication:</span>
                <span className="font-semibold text-[#8B5CF6]">Firebase Auth Enabled</span>
              </div>
            </div>
          </div>

          {/* RBAC Overview */}
          <div className="bg-[#1B1B25] border border-[#30303D] rounded-xl p-5 space-y-3 shadow-md">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#F5F5F7] flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#8B5CF6]" />
              Security Architecture
            </h2>
            <div className="space-y-2 text-xs text-[#A1A1B5] leading-relaxed">
              <p>
                <strong>Administrator:</strong> Can create meetings, review submissions across all departments, build official agendas, and record minutes.
              </p>
              <p>
                <strong>Department Heads:</strong> When created, can only submit and edit Section A & B preparation for their authorized department.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: User Directory & Audit Logs */}
        <div className="lg:col-span-2 space-y-6">
          {/* User Directory */}
          <div className="bg-[#1B1B25] border border-[#30303D] rounded-xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#30303D]">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#F5F5F7] flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#8B5CF6]" />
                User Accounts Directory
              </h2>
              <span className="text-xs text-[#A1A1B5]">{users.length} Registered Account{users.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="space-y-2.5">
              {users.map((u) => (
                <div
                  key={u.uid}
                  className="p-3.5 rounded-lg bg-[#15151C] border border-[#30303D] flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#8B5CF6] to-[#22C55E] flex items-center justify-center font-bold text-white text-xs">
                      {u.displayName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-[#F5F5F7] flex items-center gap-2">
                        {u.displayName}
                        <span className="text-[10px] bg-[#8B5CF6]/20 text-[#C4B5FD] px-1.5 py-0.2 rounded font-mono uppercase">
                          {u.role}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#A1A1B5]">{u.email} • {u.designation}</div>
                    </div>
                  </div>
                  <span className="text-[11px] text-[#22C55E] font-medium">Active</span>
                </div>
              ))}
            </div>
          </div>

          {/* Audit Logs */}
          <div className="bg-[#1B1B25] border border-[#30303D] rounded-xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#30303D]">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#F5F5F7] flex items-center gap-2">
                <History className="w-4 h-4 text-[#22C55E]" />
                Official System Audit Trail
              </h2>
              <span className="text-xs text-[#A1A1B5]">{logs.length} Logged Events</span>
            </div>

            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-3.5 rounded-lg bg-[#15151C] border border-[#30303D] space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] bg-[#8B5CF6]/20 text-[#C4B5FD] px-2 py-0.5 rounded font-semibold">
                        {log.operation}
                      </span>
                      <span className="font-bold text-[#F5F5F7]">{log.userName}</span>
                    </div>
                    <span className="text-[10px] text-gray-500 font-mono">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[#A1A1B5] text-[11px] leading-relaxed pt-0.5">
                    {log.details}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-[#1B1B25] border border-[#30303D] rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#30303D]">
              <h3 className="text-sm font-bold text-[#F5F5F7]">Create New User Account</h3>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#A1A1B5] font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tariq Mehmood"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full bg-[#15151C] border border-[#30303D] rounded-lg px-3 py-2 text-[#F5F5F7]"
                />
              </div>

              <div>
                <label className="block text-[#A1A1B5] font-semibold mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. tariq@abstarsands.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full bg-[#15151C] border border-[#30303D] rounded-lg px-3 py-2 text-[#F5F5F7]"
                />
              </div>

              <div>
                <label className="block text-[#A1A1B5] font-semibold mb-1">Designation / Title</label>
                <input
                  type="text"
                  placeholder="e.g. Head of Visa & Government Liaison"
                  value={newUserDesignation}
                  onChange={(e) => setNewUserDesignation(e.target.value)}
                  className="w-full bg-[#15151C] border border-[#30303D] rounded-lg px-3 py-2 text-[#F5F5F7]"
                />
              </div>

              <div>
                <label className="block text-[#A1A1B5] font-semibold mb-1">Role</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as any)}
                  className="w-full bg-[#15151C] border border-[#30303D] rounded-lg px-3 py-2 text-[#F5F5F7]"
                >
                  <option value="dept_head">Department Head</option>
                  <option value="management">Management / Reviewer</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              {newUserRole === 'dept_head' && (
                <div>
                  <label className="block text-[#A1A1B5] font-semibold mb-1">Authorized Department</label>
                  <select
                    value={newUserDept}
                    onChange={(e) => setNewUserDept(e.target.value)}
                    className="w-full bg-[#15151C] border border-[#30303D] rounded-lg px-3 py-2 text-[#F5F5F7]"
                  >
                    <option value="dept-hr">Human Resources</option>
                    <option value="dept-fin">Finance & Accounts</option>
                    <option value="dept-visa">Visa & Government Relations</option>
                    <option value="dept-it">Information Technology</option>
                    <option value="dept-ops">Operations & Logistics</option>
                    <option value="dept-maint">Plant & Heavy Maintenance</option>
                    <option value="dept-bd">Business Development</option>
                  </select>
                </div>
              )}

              <div className="pt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 bg-[#242432] hover:bg-[#30303D] rounded-lg text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-[#22C55E] to-[#10B981] text-gray-950 font-semibold rounded-lg hover:opacity-95"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
