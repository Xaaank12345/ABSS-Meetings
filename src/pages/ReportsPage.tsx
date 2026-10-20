import React from 'react';
import { Department, Meeting, ActionItem, MeetingSubmission, ProposedAgendaItem } from '../types';
import { BarChart3, TrendingUp, CheckCircle2, Clock, AlertTriangle, Building } from 'lucide-react';

interface ReportsPageProps {
  departments: Department[];
  meetings: Meeting[];
  actionItems: ActionItem[];
  submissions: MeetingSubmission[];
  proposedItems: ProposedAgendaItem[];
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  departments,
  meetings,
  actionItems,
  submissions,
  proposedItems
}) => {
  const totalActions = actionItems.length;
  const completedActions = actionItems.filter((a) => a.status === 'Completed').length;
  const overallRate = totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0;

  const today = new Date().toISOString().split('T')[0];
  const overdueCount = actionItems.filter(
    (a) => a.status !== 'Completed' && a.status !== 'Cancelled' && a.dueDate < today
  ).length;

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner */}
      <div className="bg-[#1B1B25] border border-[#30303D] rounded-xl p-5 shadow-lg">
        <span className="text-xs uppercase font-bold text-[#A1A1B5] tracking-wider">
          Real-Time Governance Analytics
        </span>
        <h1 className="text-xl font-bold text-[#F5F5F7] mt-0.5">
          Reports & Accountability Intelligence
        </h1>
        <p className="text-xs text-[#A1A1B5] mt-1">
          Actual metrics calculated dynamically from Firestore database records.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#1B1B25] border border-[#30303D] rounded-xl p-4">
          <span className="text-xs text-[#A1A1B5] block mb-1">Company Action Completion</span>
          <div className="text-3xl font-bold text-[#22C55E]">{overallRate}%</div>
          <span className="text-[11px] text-[#A1A1B5] mt-1 block">
            {completedActions} of {totalActions} tasks closed
          </span>
        </div>

        <div className="bg-[#1B1B25] border border-[#30303D] rounded-xl p-4">
          <span className="text-xs text-[#A1A1B5] block mb-1">Overdue Action Items</span>
          <div className="text-3xl font-bold text-red-400">{overdueCount}</div>
          <span className="text-[11px] text-red-400/80 mt-1 block">
            Require deadline extension or closure
          </span>
        </div>

        <div className="bg-[#1B1B25] border border-[#30303D] rounded-xl p-4">
          <span className="text-xs text-[#A1A1B5] block mb-1">Total Meetings Held</span>
          <div className="text-3xl font-bold text-[#8B5CF6]">{meetings.length}</div>
          <span className="text-[11px] text-[#A1A1B5] mt-1 block">
            Official management sessions
          </span>
        </div>

        <div className="bg-[#1B1B25] border border-[#30303D] rounded-xl p-4">
          <span className="text-xs text-[#A1A1B5] block mb-1">New Matters Proposed</span>
          <div className="text-3xl font-bold text-[#F5F5F7]">{proposedItems.length}</div>
          <span className="text-[11px] text-[#22C55E] mt-1 block">
            Across upcoming agendas
          </span>
        </div>
      </div>

      {/* Department Breakdown */}
      <div className="bg-[#1B1B25] border border-[#30303D] rounded-xl p-6 shadow-xl space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#F5F5F7] flex items-center justify-between">
          <span>Department Performance & Task Execution Rate</span>
          <span className="text-xs text-[#A1A1B5] font-normal">Live Firestore Calculation</span>
        </h2>

        <div className="space-y-4">
          {departments.map((dept) => {
            const deptActions = actionItems.filter((a) => a.departmentId === dept.id);
            const deptDone = deptActions.filter((a) => a.status === 'Completed').length;
            const rate = deptActions.length > 0 ? Math.round((deptDone / deptActions.length) * 100) : 100;
            const deptOverdue = deptActions.filter(
              (a) => a.status !== 'Completed' && a.status !== 'Cancelled' && a.dueDate < today
            ).length;

            return (
              <div key={dept.id} className="p-4 rounded-xl bg-[#15151C] border border-[#30303D] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#F5F5F7]">{dept.name}</span>
                    <span className="text-[10px] text-[#A1A1B5]">({dept.headName})</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {deptOverdue > 0 && (
                      <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/30">
                        {deptOverdue} Overdue
                      </span>
                    )}
                    <span className="font-bold text-[#22C55E] font-mono">{rate}%</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 rounded-full bg-[#242432] overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#8B5CF6] to-[#22C55E] rounded-full transition-all duration-500"
                    style={{ width: `${rate}%` }}
                  />
                </div>

                <div className="flex justify-between text-[11px] text-[#A1A1B5] pt-1">
                  <span>{deptDone} of {deptActions.length} completed</span>
                  <span>{deptActions.length - deptDone} in progress</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
