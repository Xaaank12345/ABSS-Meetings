import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Department,
  Meeting,
  ActionItem,
  MeetingSubmission,
  ProposedAgendaItem,
  FollowUpUpdate,
  SubmissionStatus,
  ProposedItemStatus,
  PriorityLevel
} from '../types';
import { StatusBadge } from '../components/StatusBadge';
import {
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Printer,
  FileSpreadsheet,
  Building,
  ArrowUpDown,
  Filter,
  Check,
  Edit3,
  ExternalLink,
  ChevronDown,
  Layers,
  Sparkles,
  Search
} from 'lucide-react';
import {
  saveOrUpdateSubmission,
  saveProposedItem,
  updateMeeting
} from '../services/db';
import { calculateDepartmentProgress, consolidateOfficialAgenda } from '../utils/workflowLogic';

interface ManagementReviewProps {
  departments: Department[];
  meetings: Meeting[];
  actionItems: ActionItem[];
  submissions: MeetingSubmission[];
  proposedItems: ProposedAgendaItem[];
  followUps: FollowUpUpdate[];
  onRefreshData: () => Promise<void>;
  onNavigateToWorkspace: () => void;
}

export const ManagementReview: React.FC<ManagementReviewProps> = ({
  departments,
  meetings,
  actionItems,
  submissions,
  proposedItems,
  followUps,
  onRefreshData,
  onNavigateToWorkspace
}) => {
  const { currentUser, isManagementOrAdmin } = useAuth();

  const upcomingMeetings = meetings.filter(m => m.lifecycleStatus === 'Upcoming' || m.lifecycleStatus === 'Draft');
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>(upcomingMeetings[0]?.id || meetings[0]?.id);

  // Filters
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<string>('all');

  // Active view: 'departments' | 'consolidated_agenda'
  const [activeTab, setActiveTab] = useState<'departments' | 'consolidated_agenda'>('departments');

  // Currently focused department modal/drawer
  const [focusedDeptId, setFocusedDeptId] = useState<string | null>(null);

  // Item Review Modal state
  const [reviewingItem, setReviewingItem] = useState<ProposedAgendaItem | null>(null);
  const [itemDecision, setItemDecision] = useState<ProposedItemStatus>('Approved');
  const [itemComments, setItemComments] = useState<string>('');
  const [itemAgendaOrder, setItemAgendaOrder] = useState<number>(1);

  // Department Level Review modal
  const [reviewingDeptSub, setReviewingDeptSub] = useState<MeetingSubmission | null>(null);
  const [deptDecision, setDeptDecision] = useState<SubmissionStatus>('Approved');
  const [deptComments, setDeptComments] = useState<string>('');

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const selectedMeeting = meetings.find(m => m.id === selectedMeetingId);

  // Progress summary
  const progressList = calculateDepartmentProgress(
    departments,
    submissions.filter(s => s.meetingId === selectedMeetingId).map(s => ({
      departmentId: s.departmentId,
      status: s.status,
      submittedAt: s.submittedAt,
      itemCount: proposedItems.filter(p => p.meetingId === selectedMeetingId && p.departmentId === s.departmentId).length,
      followUpCount: followUps.filter(f => f.upcomingMeetingId === selectedMeetingId && f.departmentId === s.departmentId).length
    }))
  );

  // All proposed items for this meeting
  const meetingProposedItems = proposedItems.filter(p => p.meetingId === selectedMeetingId);

  // Filtered items
  const filteredProposedItems = meetingProposedItems.filter(item => {
    if (selectedDeptFilter !== 'all' && item.departmentId !== selectedDeptFilter) return false;
    if (selectedStatusFilter !== 'all' && item.status !== selectedStatusFilter) return false;
    if (selectedPriorityFilter !== 'all' && item.priority !== selectedPriorityFilter) return false;
    return true;
  });

  // Consolidated Official Agenda
  const consolidatedAgenda = consolidateOfficialAgenda(meetingProposedItems);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Handle Item Review Submit
  const handleSaveItemReview = async () => {
    if (!reviewingItem) return;
    try {
      await saveProposedItem({
        ...reviewingItem,
        status: itemDecision,
        reviewerComments: itemComments,
        agendaOrder: itemAgendaOrder
      });
      setReviewingItem(null);
      await onRefreshData();
      showToast(`Topic updated: ${itemDecision}`);
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Department Overall Review Submit
  const handleSaveDeptReview = async () => {
    if (!reviewingDeptSub) return;
    try {
      await saveOrUpdateSubmission({
        ...reviewingDeptSub,
        status: deptDecision,
        reviewedBy: currentUser.uid,
        reviewedByName: currentUser.displayName,
        reviewedAt: new Date().toISOString(),
        reviewerComments: deptComments
      });
      setReviewingDeptSub(null);
      await onRefreshData();
      showToast(`Department submission set to ${deptDecision}`);
    } catch (err) {
      console.error(err);
    }
  };

  // Quick Approve item
  const handleQuickApproveItem = async (item: ProposedAgendaItem) => {
    try {
      await saveProposedItem({
        ...item,
        status: 'Approved',
        reviewerComments: 'Approved by Management for official meeting agenda.'
      });
      await onRefreshData();
      showToast(`Approved topic: ${item.topic}`);
    } catch (e) {
      console.error(e);
    }
  };

  // Quick Request Changes to item
  const handleQuickRequestChanges = (item: ProposedAgendaItem) => {
    setReviewingItem(item);
    setItemDecision('Changes Requested');
    setItemComments(item.reviewerComments || 'Please provide revised budget figures and alternative vendors.');
    setItemAgendaOrder(item.agendaOrder || 1);
  };

  // Quick Defer item
  const handleQuickDeferItem = async (item: ProposedAgendaItem) => {
    try {
      await saveProposedItem({
        ...item,
        status: 'Deferred to a Future Meeting',
        reviewerComments: 'Deferred by Management committee to subsequent review.'
      });
      await onRefreshData();
      showToast(`Deferred topic to future meeting: ${item.topic}`);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePrintAgenda = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-16">
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#22C55E] text-gray-950 font-semibold px-4 py-3 rounded-lg shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-[#1B1B25] border border-[#30303D] rounded-xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase font-bold text-[#A1A1B5] tracking-wider">
                Management Oversight & Governance
              </span>
              <span className="text-xs text-gray-500">•</span>
              <span className="text-xs text-[#22C55E] font-mono">Consolidated Agenda Builder</span>
            </div>
            <h1 className="text-xl font-bold text-[#F5F5F7] flex items-center gap-3">
              Meeting Preparation & Management Review Dashboard
            </h1>
            <p className="text-xs text-[#A1A1B5] mt-1">
              Evaluate departmental submissions, approve or request revisions on individual agenda topics, and consolidate the official upcoming meeting agenda.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-[#15151C] border border-[#30303D] p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('departments')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'departments'
                    ? 'bg-[#8B5CF6] text-white shadow-sm'
                    : 'text-[#A1A1B5] hover:text-white'
                }`}
              >
                Department Submissions
              </button>
              <button
                onClick={() => setActiveTab('consolidated_agenda')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'consolidated_agenda'
                    ? 'bg-[#22C55E] text-gray-950 shadow-sm'
                    : 'text-[#A1A1B5] hover:text-white'
                }`}
              >
                <span>Consolidated Agenda</span>
                <span className="w-4 h-4 rounded-full bg-[#15151C] text-[10px] text-[#22C55E] flex items-center justify-center font-bold">
                  {consolidatedAgenda.length}
                </span>
              </button>
            </div>

            <button
              onClick={handlePrintAgenda}
              className="px-3 py-2 bg-[#242432] hover:bg-[#30303D] border border-[#30303D] rounded-lg text-xs font-medium text-[#F5F5F7] flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-[#C4B5FD]" />
              <span>Print / Export Agenda</span>
            </button>
          </div>
        </div>

        {/* Meeting Selector */}
        <div className="mt-4 pt-4 border-t border-[#30303D] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-[#A1A1B5] uppercase">Target Meeting:</label>
            <select
              value={selectedMeetingId}
              onChange={(e) => setSelectedMeetingId(e.target.value)}
              className="bg-[#15151C] border border-[#30303D] rounded-lg px-3 py-1.5 text-xs text-[#F5F5F7] focus:outline-none focus:border-[#8B5CF6]"
            >
              {meetings.length === 0 ? (
                <option value="">No meetings scheduled</option>
              ) : (
                meetings.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.meetingDate} — {m.title}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#A1A1B5]">
            <span>Chairperson: <strong className="text-[#F5F5F7]">{selectedMeeting?.chairperson || 'Administrator'}</strong></span>
            <span>•</span>
            <span>Venue: <strong className="text-[#F5F5F7]">{selectedMeeting?.venue || 'TBD'}</strong></span>
          </div>
        </div>
      </div>

      {meetings.length === 0 && (
        <div className="bg-[#1B1B25] border border-dashed border-[#30303D] rounded-xl p-8 text-center space-y-2">
          <Calendar className="w-8 h-8 text-[#8B5CF6] mx-auto opacity-70" />
          <h3 className="text-sm font-bold text-[#F5F5F7]">No meetings to review</h3>
          <p className="text-xs text-[#A1A1B5] max-w-md mx-auto">
            There are currently no upcoming or completed meetings. Once an upcoming meeting is created, departmental preparations, follow-ups, and submitted agenda items will appear here for management review.
          </p>
        </div>
      )}

      {/* Department Submission Progress Banner (Calculated from Actual DB Records) */}
      <div className="bg-[#1B1B25] border border-[#30303D] rounded-xl p-5 shadow-lg">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#A1A1B5] mb-3 flex items-center justify-between">
          <span>Participating Department Submission Progress</span>
          <span className="text-[11px] font-normal text-emerald-400">
            {progressList.filter(p => p.status === 'Submitted' || p.status === 'Approved' || p.status === 'Under Review').length} of {progressList.length} Departments Responded
          </span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {progressList.map((prog) => {
            const isSelected = selectedDeptFilter === prog.departmentId;
            return (
              <div
                key={prog.departmentId}
                onClick={() => setSelectedDeptFilter(isSelected ? 'all' : prog.departmentId)}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#242432] border-[#8B5CF6] shadow-md ring-1 ring-[#8B5CF6]'
                    : 'bg-[#15151C] border-[#30303D] hover:border-[#8B5CF6]/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-[#F5F5F7] truncate">{prog.departmentName}</span>
                </div>
                <StatusBadge status={prog.status} size="sm" />
                <div className="mt-2 text-[10px] text-[#A1A1B5] flex justify-between">
                  <span>{prog.itemCount} topics</span>
                  <span>{prog.followUpCount} f-ups</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* VIEW 1: DEPARTMENT SUBMISSIONS */}
      {activeTab === 'departments' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="bg-[#1B1B25] border border-[#30303D] rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-[#A1A1B5] flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5" />
                Filters:
              </span>

              {/* Department Filter */}
              <select
                value={selectedDeptFilter}
                onChange={(e) => setSelectedDeptFilter(e.target.value)}
                className="bg-[#15151C] border border-[#30303D] rounded-lg px-2.5 py-1.5 text-xs text-[#F5F5F7]"
              >
                <option value="all">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="bg-[#15151C] border border-[#30303D] rounded-lg px-2.5 py-1.5 text-xs text-[#F5F5F7]"
              >
                <option value="all">All Item Statuses</option>
                <option value="Draft">Draft</option>
                <option value="Submitted">Submitted</option>
                <option value="Approved">Approved</option>
                <option value="Changes Requested">Changes Requested</option>
                <option value="Deferred to a Future Meeting">Deferred to Future Meeting</option>
              </select>

              {/* Priority Filter */}
              <select
                value={selectedPriorityFilter}
                onChange={(e) => setSelectedPriorityFilter(e.target.value)}
                className="bg-[#15151C] border border-[#30303D] rounded-lg px-2.5 py-1.5 text-xs text-[#F5F5F7]"
              >
                <option value="all">All Priorities</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div className="text-xs text-[#A1A1B5]">
              Showing <strong>{filteredProposedItems.length}</strong> proposed items across departments
            </div>
          </div>

          {/* Department Submissions Table / Cards */}
          <div className="space-y-4">
            {departments
              .filter(dept => selectedDeptFilter === 'all' || dept.id === selectedDeptFilter)
              .map(dept => {
                const sub = submissions.find(s => s.meetingId === selectedMeetingId && s.departmentId === dept.id);
                const deptItems = meetingProposedItems.filter(p => p.departmentId === dept.id);
                const deptFollowUps = followUps.filter(f => f.upcomingMeetingId === selectedMeetingId && f.departmentId === dept.id);

                return (
                  <div key={dept.id} className="bg-[#1B1B25] border border-[#30303D] rounded-xl overflow-hidden shadow-lg">
                    {/* Department Header Bar */}
                    <div className="bg-[#242432]/60 p-4 border-b border-[#30303D] flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#8B5CF6]/20 text-[#C4B5FD] flex items-center justify-center font-bold text-xs font-mono">
                          {dept.code}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-[#F5F5F7]">{dept.name}</h3>
                            <StatusBadge status={sub?.status || 'Not Started'} size="sm" />
                          </div>
                          <span className="text-[11px] text-[#A1A1B5]">
                            Dept Head: <strong>{dept.headName}</strong> • {deptItems.length} Proposed Topics • {deptFollowUps.length} Follow-ups
                          </span>
                        </div>
                      </div>

                      {/* Department Actions */}
                      <div className="flex items-center gap-2">
                        {sub && (
                          <button
                            onClick={() => {
                              setReviewingDeptSub(sub);
                              setDeptDecision(sub.status === 'Approved' ? 'Approved' : 'Approved');
                              setDeptComments(sub.reviewerComments || '');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[#8B5CF6]/20 hover:bg-[#8B5CF6]/30 text-[#C4B5FD] border border-[#8B5CF6]/40 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Review Department Submission</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Content Section: Section A & Section B inside this department */}
                    <div className="p-5 space-y-4">
                      {/* Section A Follow-ups Summary */}
                      {deptFollowUps.length > 0 && (
                        <div className="p-3.5 rounded-lg bg-[#15151C] border border-[#30303D]/60">
                          <span className="text-[10px] uppercase font-bold text-[#8B5CF6] tracking-wider block mb-2">
                            Section A: Previous Action Progress Updates ({deptFollowUps.length})
                          </span>
                          <div className="space-y-2">
                            {deptFollowUps.map(f => (
                              <div key={f.id} className="text-xs p-2.5 rounded bg-[#1B1B25] border border-[#30303D]/40">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="font-semibold text-[#F5F5F7]">{f.topic}</span>
                                  <StatusBadge status={f.status} size="sm" />
                                </div>
                                <p className="text-[#A1A1B5] text-[11px]">{f.progressUpdate}</p>
                                {f.managementSupportRequired && (
                                  <div className="mt-1.5 text-[11px] text-[#C4B5FD] bg-[#8B5CF6]/10 p-1.5 rounded">
                                    <strong>Management Support Required:</strong> {f.managementSupportRequired}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Section B Proposed Topics Items */}
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#22C55E] tracking-wider block mb-2">
                          Section B: Proposed Agenda Topics ({deptItems.length})
                        </span>

                        {deptItems.length === 0 ? (
                          <div className="p-4 text-center text-xs text-[#A1A1B5] bg-[#15151C] rounded border border-[#30303D]/40">
                            No new agenda items submitted by this department yet.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {deptItems.map(item => (
                              <div
                                key={item.id}
                                className="p-4 rounded-xl bg-[#15151C] border border-[#30303D] hover:border-[#22C55E]/40 transition-colors"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                  <div className="space-y-1.5 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-xs font-bold text-[#F5F5F7]">{item.topic}</span>
                                      <StatusBadge status={item.priority} size="sm" />
                                      <StatusBadge status={item.status} size="sm" />
                                      {item.agendaOrder && (
                                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#8B5CF6]/20 text-[#C4B5FD]">
                                          Agenda #{item.agendaOrder}
                                        </span>
                                      )}
                                    </div>

                                    <p className="text-xs text-[#A1A1B5] leading-relaxed">{item.description}</p>

                                    {/* Decision Required Pill */}
                                    {item.decisionRequired && (
                                      <div className="text-[11px] bg-[#1B1B25] p-2.5 rounded-lg border border-[#8B5CF6]/30 text-purple-200">
                                        <span className="font-bold text-[#C4B5FD]">Decision Required from Management: </span>
                                        {item.decisionRequired}
                                      </div>
                                    )}

                                    {/* Resources & Budget */}
                                    {item.resourcesRequired && (
                                      <div className="text-[11px] text-amber-300">
                                        <strong>Budget / Resources: </strong> {item.resourcesRequired}
                                      </div>
                                    )}

                                    {/* Reviewer Comments if any */}
                                    {item.reviewerComments && (
                                      <div className="text-[11px] text-emerald-300 mt-1 italic">
                                        <strong>Reviewer Note: </strong> {item.reviewerComments}
                                      </div>
                                    )}
                                  </div>

                                  {/* Management Decision Controls for this item */}
                                  <div className="flex sm:flex-col items-center gap-1.5 shrink-0">
                                    <button
                                      onClick={() => handleQuickApproveItem(item)}
                                      className="px-3 py-1 rounded bg-[#22C55E]/20 hover:bg-[#22C55E]/30 text-[#4ADE80] border border-[#22C55E]/40 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                      title="Approve for official meeting agenda"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      <span>Approve</span>
                                    </button>

                                    <button
                                      onClick={() => handleQuickRequestChanges(item)}
                                      className="px-3 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                      title="Request changes from Department Head"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                      <span>Request Changes</span>
                                    </button>

                                    <button
                                      onClick={() => handleQuickDeferItem(item)}
                                      className="px-3 py-1 rounded bg-orange-500/15 hover:bg-orange-500/25 text-orange-300 border border-orange-500/30 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                      title="Defer to subsequent meeting without losing history"
                                    >
                                      <span>Defer</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* VIEW 2: CONSOLIDATED OFFICIAL AGENDA */}
      {activeTab === 'consolidated_agenda' && (
        <div className="bg-[#1B1B25] border border-[#30303D] rounded-xl p-6 shadow-xl space-y-6 print:bg-white print:text-black">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-[#30303D] gap-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#22C55E] tracking-wider">
                Official Consolidated Meeting Agenda
              </span>
              <h2 className="text-xl font-bold text-[#F5F5F7] print:text-black">
                {selectedMeeting?.title}
              </h2>
              <div className="text-xs text-[#A1A1B5] print:text-gray-700 mt-1 flex gap-4">
                <span>Date: <strong>{selectedMeeting?.meetingDate}</strong></span>
                <span>Time: <strong>{selectedMeeting?.startTime} - {selectedMeeting?.endTime}</strong></span>
                <span>Venue: <strong>{selectedMeeting?.venue}</strong></span>
              </div>
            </div>

            <div className="flex items-center gap-2 print:hidden">
              <button
                onClick={handlePrintAgenda}
                className="px-4 py-2 rounded-lg bg-[#22C55E] text-gray-950 font-semibold text-xs flex items-center gap-2 hover:opacity-95 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Official Agenda (PDF)</span>
              </button>
            </div>
          </div>

          {/* Agenda Notice */}
          <div className="p-3.5 rounded-lg bg-[#242432] border border-[#30303D] text-xs text-[#A1A1B5] leading-relaxed print:hidden">
            <strong>Traceability Guaranteed:</strong> Each consolidated agenda item retains its source department, original author, proposed solution, and requested management decision. Approved topics are ordered by executive priority and assigned sequence numbers.
          </div>

          {/* Official Items Table */}
          <div className="space-y-4">
            {consolidatedAgenda.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#A1A1B5] bg-[#15151C] rounded-lg">
                No items currently marked as Approved for the official agenda. Review departmental topics and click "Approve" to merge them into this agenda.
              </div>
            ) : (
              consolidatedAgenda.map((item) => (
                <div
                  key={item.id}
                  className="p-5 rounded-xl bg-[#15151C] border border-[#30303D] space-y-3 print:bg-white print:border-gray-300 print:text-black"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-[#22C55E]/20 text-[#4ADE80] flex items-center justify-center font-mono font-bold text-sm shrink-0 print:bg-gray-200 print:text-black">
                        #{item.officialAgendaNumber}
                      </span>
                      <div>
                        <h3 className="text-sm font-bold text-[#F5F5F7] print:text-black">{item.topic}</h3>
                        <div className="text-[11px] text-[#A1A1B5] print:text-gray-600 mt-0.5 flex gap-3">
                          <span>Department: <strong className="text-[#22C55E] print:text-black">{item.departmentName}</strong></span>
                          <span>Submitter: <strong>{item.createdByName}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 print:hidden">
                      <StatusBadge status={item.priority} size="sm" />
                      <StatusBadge status={item.status} size="sm" />
                    </div>
                  </div>

                  <p className="text-xs text-[#A1A1B5] leading-relaxed print:text-gray-800">
                    {item.description}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-2 border-t border-[#30303D]/60 print:border-gray-200">
                    <div className="bg-[#1B1B25] p-2.5 rounded border border-[#30303D]/40 print:bg-gray-50 print:border-gray-200">
                      <strong className="text-[#8B5CF6] block mb-0.5 print:text-purple-700">Recommended Solution:</strong>
                      <span className="text-[#F5F5F7] print:text-black">{item.proposedSolution || 'As submitted'}</span>
                    </div>

                    <div className="bg-[#1B1B25] p-2.5 rounded border border-[#30303D]/40 print:bg-gray-50 print:border-gray-200">
                      <strong className="text-[#22C55E] block mb-0.5 print:text-emerald-700">Decision Required from Management:</strong>
                      <span className="text-[#F5F5F7] print:text-black">{item.decisionRequired || 'Committee deliberation'}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Item Review Dialog */}
      {reviewingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1B1B25] border border-[#30303D] rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#30303D] pb-3">
              <h3 className="text-sm font-bold text-[#F5F5F7]">Management Item Review</h3>
              <button onClick={() => setReviewingItem(null)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[#A1A1B5]">Topic:</span>
                <p className="font-bold text-[#F5F5F7] mt-0.5">{reviewingItem.topic}</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#F5F5F7] block mb-1">Committee Decision</label>
                <select
                  value={itemDecision}
                  onChange={(e) => setItemDecision(e.target.value as ProposedItemStatus)}
                  className="w-full bg-[#15151C] border border-[#30303D] rounded-lg p-2 text-xs text-[#F5F5F7]"
                >
                  <option value="Approved">Approve for Official Agenda</option>
                  <option value="Changes Requested">Request Changes from Department Head</option>
                  <option value="Deferred to a Future Meeting">Defer to Future Meeting</option>
                  <option value="Rejected">Reject (Preserve in History)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#F5F5F7] block mb-1">Agenda Sequence Order</label>
                <input
                  type="number"
                  min={1}
                  value={itemAgendaOrder}
                  onChange={(e) => setItemAgendaOrder(parseInt(e.target.value) || 1)}
                  className="w-full bg-[#15151C] border border-[#30303D] rounded-lg p-2 text-xs text-[#F5F5F7]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#F5F5F7] block mb-1">Reviewer Feedback / Revision Instructions</label>
                <textarea
                  rows={3}
                  value={itemComments}
                  onChange={(e) => setItemComments(e.target.value)}
                  placeholder="Notes for department head or committee record..."
                  className="w-full bg-[#15151C] border border-[#30303D] rounded-lg p-2 text-xs text-[#F5F5F7]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#30303D]">
              <button
                onClick={() => setReviewingItem(null)}
                className="px-3 py-1.5 rounded-lg bg-[#242432] text-xs text-[#A1A1B5]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveItemReview}
                className="px-4 py-1.5 rounded-lg bg-[#22C55E] text-gray-950 font-semibold text-xs"
              >
                Save Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Department Review Dialog */}
      {reviewingDeptSub && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1B1B25] border border-[#30303D] rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#30303D] pb-3">
              <h3 className="text-sm font-bold text-[#F5F5F7]">
                Review Department: {reviewingDeptSub.departmentName}
              </h3>
              <button onClick={() => setReviewingDeptSub(null)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-xs font-semibold text-[#F5F5F7] block mb-1">Overall Department Status</label>
                <select
                  value={deptDecision}
                  onChange={(e) => setDeptDecision(e.target.value as SubmissionStatus)}
                  className="w-full bg-[#15151C] border border-[#30303D] rounded-lg p-2 text-xs text-[#F5F5F7]"
                >
                  <option value="Approved">Approved (All items accepted)</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Changes Requested">Changes Requested (Reopens workspace for Dept Head)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#F5F5F7] block mb-1">Reviewer Comments</label>
                <textarea
                  rows={3}
                  value={deptComments}
                  onChange={(e) => setDeptComments(e.target.value)}
                  placeholder="Instructions sent to department head..."
                  className="w-full bg-[#15151C] border border-[#30303D] rounded-lg p-2 text-xs text-[#F5F5F7]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#30303D]">
              <button
                onClick={() => setReviewingDeptSub(null)}
                className="px-3 py-1.5 rounded-lg bg-[#242432] text-xs text-[#A1A1B5]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDeptReview}
                className="px-4 py-1.5 rounded-lg bg-[#8B5CF6] text-white font-semibold text-xs"
              >
                Update Department Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
