import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Department,
  Meeting,
  ActionItem,
  MeetingSubmission,
  ProposedAgendaItem,
  FollowUpUpdate
} from '../types';
import { StatusBadge } from '../components/StatusBadge';
import {
  Calendar,
  Clock,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Building,
  HelpCircle,
  Sparkles,
  TrendingUp,
  Send
} from 'lucide-react';

interface DepartmentDashboardProps {
  departments: Department[];
  meetings: Meeting[];
  actionItems: ActionItem[];
  submissions: MeetingSubmission[];
  proposedItems: ProposedAgendaItem[];
  followUps: FollowUpUpdate[];
  onNavigateToWorkspace: () => void;
  onNavigateToReview: () => void;
  onNavigateToCreateMeeting?: () => void;
}

export const DepartmentDashboard: React.FC<DepartmentDashboardProps> = ({
  departments,
  meetings,
  actionItems,
  submissions,
  proposedItems,
  followUps,
  onNavigateToWorkspace,
  onNavigateToReview,
  onNavigateToCreateMeeting
}) => {
  const { currentUser, isManagementOrAdmin } = useAuth();

  // Find user's active department
  const userDeptId = currentUser.departmentIds[0] || 'dept-hr';
  const currentDept = departments.find(d => d.id === userDeptId) || departments[0];

  // Latest approved meeting and upcoming meeting
  const upcomingMeeting = meetings.find(m => m.lifecycleStatus === 'Upcoming' || m.lifecycleStatus === 'Draft') || meetings[0];
  const previousApprovedMeeting = upcomingMeeting
    ? meetings.find(
        m => m.lifecycleStatus === 'Completed' && new Date(m.meetingDate) < new Date(upcomingMeeting.meetingDate)
      )
    : meetings.find(m => m.lifecycleStatus === 'Completed');

  // Submissions for this department
  const currentSubmission = upcomingMeeting
    ? submissions.find(
        s => s.meetingId === upcomingMeeting.id && s.departmentId === currentDept?.id
      )
    : undefined;

  const submissionStatus = currentSubmission?.status || 'Not Started';

  // Department specific actions
  const deptActions = actionItems.filter(a => a.departmentId === currentDept?.id);
  const pendingActions = deptActions.filter(a => a.status !== 'Completed' && a.status !== 'Cancelled');
  const completedActions = deptActions.filter(a => a.status === 'Completed');

  // Proposed topics for this upcoming meeting
  const deptProposedItems = upcomingMeeting
    ? proposedItems.filter(
        p => p.meetingId === upcomingMeeting.id && p.departmentId === currentDept?.id
      )
    : [];

  // Follow-ups updated for upcoming meeting
  const deptFollowUps = upcomingMeeting
    ? followUps.filter(
        f => f.upcomingMeetingId === upcomingMeeting.id && f.departmentId === currentDept?.id
      )
    : [];

  // Check deadline
  const deadlineStr = upcomingMeeting?.submissionDeadline || 'No active deadline';
  const isChangesRequested = submissionStatus === 'Changes Requested';

  return (
    <div className="space-y-6">
      {/* Top Banner: Department & Status */}
      <div className="bg-gradient-to-r from-[#1B1B25] via-[#242432] to-[#1B1B25] border border-[#30303D] rounded-xl p-6 relative overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-[#8B5CF6]/10 to-transparent pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs uppercase font-bold tracking-wider text-[#A1A1B5]">
                Department Head Preparation Workspace
              </span>
              <span className="text-xs text-gray-500">•</span>
              <span className="text-xs text-[#22C55E] font-medium font-mono">{currentDept?.code}</span>
            </div>
            <h1 className="text-2xl font-bold text-[#F5F5F7] flex items-center gap-3">
              {currentDept?.name}
              <StatusBadge status={submissionStatus} size="lg" />
            </h1>
            <p className="text-xs text-[#A1A1B5] mt-1 max-w-2xl leading-relaxed">
              {currentDept?.description}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {upcomingMeeting ? (
              <button
                onClick={onNavigateToWorkspace}
                className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-[#22C55E] to-[#10B981] text-gray-950 font-semibold text-xs flex items-center gap-2 hover:opacity-95 shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
              >
                <span>Prepare Meeting Submission</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              isManagementOrAdmin && onNavigateToCreateMeeting && (
                <button
                  onClick={onNavigateToCreateMeeting}
                  className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-[#22C55E] to-[#10B981] text-gray-950 font-semibold text-xs flex items-center gap-2 hover:opacity-95 shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
                >
                  <span>Schedule First Meeting</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )
            )}

            {isManagementOrAdmin && (
              <button
                onClick={onNavigateToReview}
                className="px-4 py-2.5 rounded-lg bg-[#8B5CF6]/20 border border-[#8B5CF6]/50 text-[#C4B5FD] font-semibold text-xs flex items-center gap-2 hover:bg-[#8B5CF6]/30 transition-all cursor-pointer"
              >
                <span>Management Review Page</span>
              </button>
            )}
          </div>
        </div>

        {/* Change Request Alert Banner */}
        {isChangesRequested && (
          <div className="mt-4 p-3.5 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-200">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-300">Management Requested Revisions: </span>
              {currentSubmission?.reviewerComments || 'Please adjust the highlighted topics and provide additional budget breakdown before final approval.'}
            </div>
          </div>
        )}
      </div>

      {/* Meeting Schedule & Deadlines Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Previous Meeting */}
        <div className="bg-[#1B1B25] border border-[#30303D] rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-[#A1A1B5] mb-2">
            <span className="uppercase font-semibold tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#8B5CF6]" />
              Previous Meeting
            </span>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
              Approved
            </span>
          </div>
          <div className="text-base font-bold text-[#F5F5F7]">
            {previousApprovedMeeting?.meetingDate || 'No Prior Records'}
          </div>
          <div className="text-xs text-[#A1A1B5] truncate mt-0.5">
            {previousApprovedMeeting?.title || 'No previous approved minutes'}
          </div>
          <div className="mt-3 pt-3 border-t border-[#30303D]/60 flex items-center justify-between text-xs">
            <span className="text-[#A1A1B5]">Actions Assigned:</span>
            <span className="font-semibold text-[#F5F5F7]">{deptActions.length} items</span>
          </div>
        </div>

        {/* Upcoming Meeting */}
        <div className="bg-[#1B1B25] border border-[#30303D] rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-[#A1A1B5] mb-2">
            <span className="uppercase font-semibold tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#22C55E]" />
              Upcoming Meeting
            </span>
            <span className="text-[10px] bg-[#8B5CF6]/20 text-[#C4B5FD] px-2 py-0.5 rounded border border-[#8B5CF6]/30">
              {upcomingMeeting ? 'Scheduled' : 'None Scheduled'}
            </span>
          </div>
          <div className="text-base font-bold text-[#F5F5F7]">
            {upcomingMeeting?.meetingDate || 'No Upcoming Meeting'}
          </div>
          <div className="text-xs text-[#A1A1B5] truncate mt-0.5">
            {upcomingMeeting?.title || 'Waiting for Management to schedule'}
          </div>
          <div className="mt-3 pt-3 border-t border-[#30303D]/60 flex items-center justify-between text-xs">
            <span className="text-[#A1A1B5]">Venue:</span>
            <span className="font-medium text-[#F5F5F7] truncate max-w-[150px]">
              {upcomingMeeting?.venue || 'TBD'}
            </span>
          </div>
        </div>

        {/* Submission Deadline */}
        <div className="bg-[#1B1B25] border border-[#30303D] rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-[#A1A1B5] mb-2">
            <span className="uppercase font-semibold tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Submission Deadline
            </span>
            <span className="text-[10px] text-amber-400 font-mono font-medium">Mandatory</span>
          </div>
          <div className="text-base font-bold text-amber-300 font-mono">{deadlineStr}</div>
          <div className="text-xs text-[#A1A1B5] mt-0.5">Department submission cutoff</div>
          <div className="mt-3 pt-3 border-t border-[#30303D]/60 flex items-center justify-between text-xs">
            <span className="text-[#A1A1B5]">Current Status:</span>
            <StatusBadge status={submissionStatus} size="sm" />
          </div>
        </div>
      </div>

      {/* Submission Breakdown Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#1B1B25] border border-[#30303D] rounded-xl p-4">
          <span className="text-xs text-[#A1A1B5] block mb-1">Assigned Action Items</span>
          <div className="text-2xl font-bold text-[#F5F5F7]">{deptActions.length}</div>
          <span className="text-[11px] text-emerald-400 mt-1 block">
            {completedActions.length} completed
          </span>
        </div>

        <div className="bg-[#1B1B25] border border-[#30303D] rounded-xl p-4">
          <span className="text-xs text-[#A1A1B5] block mb-1">Pending Follow-Ups (Sec A)</span>
          <div className="text-2xl font-bold text-amber-400">{pendingActions.length}</div>
          <span className="text-[11px] text-[#A1A1B5] mt-1 block">
            {deptFollowUps.length} drafted / updated
          </span>
        </div>

        <div className="bg-[#1B1B25] border border-[#30303D] rounded-xl p-4">
          <span className="text-xs text-[#A1A1B5] block mb-1">New Matters Proposed (Sec B)</span>
          <div className="text-2xl font-bold text-[#8B5CF6]">{deptProposedItems.length}</div>
          <span className="text-[11px] text-[#A1A1B5] mt-1 block">
            New topics for discussion
          </span>
        </div>

        <div className="bg-[#1B1B25] border border-[#30303D] rounded-xl p-4">
          <span className="text-xs text-[#A1A1B5] block mb-1">Management Decisions Required</span>
          <div className="text-2xl font-bold text-[#22C55E]">
            {deptProposedItems.filter(p => p.decisionRequired).length + deptFollowUps.filter(f => f.managementSupportRequired).length}
          </div>
          <span className="text-[11px] text-[#A1A1B5] mt-1 block">
            Items awaiting sign-off
          </span>
        </div>
      </div>

      {/* Two Columns: Section A Follow-up summary & Section B Topics summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section A Preview */}
        <div className="bg-[#1B1B25] border border-[#30303D] rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#30303D]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#8B5CF6]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#F5F5F7]">
                  Section A: Previous Meeting Follow-ups
                </h3>
              </div>
              <span className="text-xs text-[#A1A1B5]">Source: {previousApprovedMeeting?.meetingDate}</span>
            </div>

            <div className="mt-4 space-y-3">
              {pendingActions.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#A1A1B5] bg-[#242432]/40 rounded-lg">
                  No pending action items from the previous meeting!
                </div>
              ) : (
                pendingActions.map((action) => {
                  const hasUpdate = deptFollowUps.find(f => f.actionItemId === action.id);
                  return (
                    <div
                      key={action.id}
                      className="p-3.5 rounded-lg bg-[#242432]/60 border border-[#30303D] flex flex-col gap-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-semibold text-[#F5F5F7]">{action.topic}</span>
                        <StatusBadge status={hasUpdate ? hasUpdate.status : action.status} size="sm" />
                      </div>
                      <p className="text-xs text-[#A1A1B5] line-clamp-2">{action.description}</p>
                      <div className="flex items-center justify-between text-[11px] text-gray-400 pt-2 border-t border-[#30303D]/40">
                        <span>Due: {action.dueDate}</span>
                        {hasUpdate ? (
                          <span className="text-emerald-400 flex items-center gap-1 font-medium">
                            <CheckCircle2 className="w-3 h-3" /> Update Registered
                          </span>
                        ) : (
                          <span className="text-amber-400 font-medium">Update Required</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#30303D]">
            <button
              onClick={onNavigateToWorkspace}
              className="w-full py-2 rounded-lg bg-[#242432] hover:bg-[#30303D] text-[#C4B5FD] text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span>Update Previous Action Items in Section A</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Section B Preview */}
        <div className="bg-[#1B1B25] border border-[#30303D] rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#30303D]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#F5F5F7]">
                  Section B: New Agenda Topics Proposed
                </h3>
              </div>
              <span className="text-xs text-[#A1A1B5]">{deptProposedItems.length} Topics</span>
            </div>

            <div className="mt-4 space-y-3">
              {deptProposedItems.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#A1A1B5] bg-[#242432]/40 rounded-lg">
                  No new discussion matters added yet for {upcomingMeeting?.meetingDate}.
                </div>
              ) : (
                deptProposedItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-lg bg-[#242432]/60 border border-[#30303D] flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#F5F5F7]">{item.topic}</span>
                        <StatusBadge status={item.priority} size="sm" />
                      </div>
                      <StatusBadge status={item.status} size="sm" />
                    </div>
                    <p className="text-xs text-[#A1A1B5] line-clamp-2">{item.description}</p>
                    {item.decisionRequired && (
                      <div className="text-[11px] bg-[#1B1B25] p-2 rounded border border-[#30303D]/60 text-purple-300">
                        <span className="font-semibold text-purple-400">Decision Required: </span>
                        {item.decisionRequired}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#30303D]">
            <button
              onClick={onNavigateToWorkspace}
              className="w-full py-2 rounded-lg bg-[#242432] hover:bg-[#30303D] text-[#4ADE80] text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span>+ Add or Edit Proposed Agenda Items in Section B</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
