import React, { useState, useEffect } from 'react';
import { AuditLog, User } from '../types';
import { getAuditLogs } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { Settings, Shield, Database, History, UserCheck, RefreshCw } from 'lucide-react';

interface SettingsPageProps {
  users: User[];
  onRefreshData: () => Promise<void>;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ users, onRefreshData }) => {
  const { currentUser } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    getAuditLogs().then(setLogs);
  }, []);

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner */}
      <div className="bg-[#1B1B25] border border-[#30303D] rounded-xl p-5 shadow-lg">
        <span className="text-xs uppercase font-bold text-[#A1A1B5] tracking-wider">
          System Administration & Compliance
        </span>
        <h1 className="text-xl font-bold text-[#F5F5F7] mt-0.5">
          System Settings & Audit Log
        </h1>
        <p className="text-xs text-[#A1A1B5] mt-1">
          Review governance operations, user permissions, and persistent Firestore connection parameters.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: System & Security */}
        <div className="space-y-6">
          <div className="bg-[#1B1B25] border border-[#30303D] rounded-xl p-5 space-y-4">
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

          <div className="bg-[#1B1B25] border border-[#30303D] rounded-xl p-5 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#F5F5F7] flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#8B5CF6]" />
              Role-Based Access Control (RBAC)
            </h2>
            <div className="space-y-2 text-xs text-[#A1A1B5] leading-relaxed">
              <p>
                <strong>Department Heads:</strong> Can only create, update, and submit preparation records (Section A & B) for authorized departments.
              </p>
              <p>
                <strong>Management & Approvers:</strong> Review all submissions across departments, approve or request revisions, and consolidate the official meeting agenda.
              </p>
              <p>
                <strong>Minute-Takers:</strong> Record actual discussions and convert agreed resolutions into live action tracker items.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Audit Logs */}
        <div className="lg:col-span-2 bg-[#1B1B25] border border-[#30303D] rounded-xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-[#30303D]">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#F5F5F7] flex items-center gap-2">
              <History className="w-4 h-4 text-[#22C55E]" />
              Official System Audit Trail
            </h2>
            <span className="text-xs text-[#A1A1B5]">{logs.length} Logged Events</span>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
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
  );
};
