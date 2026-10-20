import React from 'react';
import { Department, User } from '../types';
import { Building, Users, Mail, CheckCircle2, ShieldCheck } from 'lucide-react';

interface DepartmentsPageProps {
  departments: Department[];
  users: User[];
}

export const DepartmentsPage: React.FC<DepartmentsPageProps> = ({
  departments,
  users
}) => {
  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner */}
      <div className="bg-[#1B1B25] border border-[#30303D] rounded-xl p-5 shadow-lg">
        <span className="text-xs uppercase font-bold text-[#A1A1B5] tracking-wider">
          Organizational Architecture
        </span>
        <h1 className="text-xl font-bold text-[#F5F5F7] mt-0.5">
          Departments & Leadership Directory
        </h1>
        <p className="text-xs text-[#A1A1B5] mt-1">
          Authorized departmental leadership structure for AB STAR SANDS (PVT) LTD meeting submissions.
        </p>
      </div>

      {/* Departments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map((dept) => {
          const deptUsers = users.filter((u) => u.departmentIds.includes(dept.id));

          return (
            <div
              key={dept.id}
              className="bg-[#1B1B25] border border-[#30303D] rounded-xl p-5 space-y-4 hover:border-[#8B5CF6]/50 transition-colors shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#8B5CF6]/20 text-[#C4B5FD] flex items-center justify-center font-bold text-sm font-mono">
                    {dept.code}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#F5F5F7]">{dept.name}</h3>
                    <span className="text-[11px] text-[#22C55E] flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      Active Department
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-[#A1A1B5] leading-relaxed">
                {dept.description}
              </p>

              <div className="pt-3 border-t border-[#30303D]/60 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#A1A1B5]">Department Head:</span>
                  <span className="font-semibold text-[#F5F5F7]">{dept.headName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#A1A1B5]">Assigned Staff:</span>
                  <span className="text-[#C4B5FD] font-mono">{deptUsers.length} members</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
