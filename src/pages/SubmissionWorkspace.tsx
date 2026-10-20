import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Department,
  Meeting,
  ActionItem,
  MeetingSubmission,
  ProposedAgendaItem,
  FollowUpUpdate,
  ActionStatus,
  PriorityLevel,
  SubmissionStatus
} from '../types';
import { StatusBadge } from '../components/StatusBadge';
import {
  Save,
  Send,
  Plus,
  Trash2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  History,
  Lock,
  Unlock,
  Building,
  Info,
  CheckSquare,
  FileCheck,
  ChevronDown,
  ChevronUp,
  FileText
} from 'lucide-react';
import {
  saveOrUpdateSubmission,
  saveFollowUpUpdate,
  saveProposedItem,
  deleteProposedItem,
  getFollowUpHistoryForAction
} from '../services/db';

interface SubmissionWorkspaceProps {
  departments: Department[];
  meetings: Meeting[];
  actionItems: ActionItem[];
  submissions: MeetingSubmission[];
  proposedItems: ProposedAgendaItem[];
  followUps: FollowUpUpdate[];
  onRefreshData: () => Promise<void>;
  onNavigateToDashboard: () => void;
}

export const SubmissionWorkspace: React.FC<SubmissionWorkspaceProps> = ({
  departments,
  meetings,
  actionItems,
  submissions,
  proposedItems,
  followUps,
  onRefreshData,
  onNavigateToDashboard
}) => {
  const { currentUser, isAuthorizedForDepartment, isManagementOrAdmin } = useAuth();

  // Upcoming Meetings list (ordered by date)
  const upcomingMeetings = meetings.filter(m => m.lifecycleStatus === 'Upcoming' || m.lifecycleStatus === 'Draft');
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>(upcomingMeetings[0]?.id || meetings[0]?.id);

  // Department selector: Department Heads can only edit their authorized departments; Admins can select any
  const availableDepts = isManagementOrAdmin
    ? departments
    : departments.filter(d => currentUser.departmentIds.includes(d.id));

  const [selectedDeptId, setSelectedDeptId] = useState<string>(
    currentUser.departmentIds[0] || availableDepts[0]?.id || 'dept-hr'
  );

  useEffect(() => {
    if (currentUser.departmentIds && currentUser.departmentIds[0]) {
      setSelectedDeptId(currentUser.departmentIds[0]);
    }
  }, [currentUser]);

  const selectedMeeting = meetings.find(m => m.id === selectedMeetingId);
  const selectedDept = departments.find(d => d.id === selectedDeptId);

  // Automatically find latest approved meeting for Section A
  const previousApprovedMeeting = meetings.find(
    m => m.lifecycleStatus === 'Completed' && new Date(m.meetingDate) < new Date(selectedMeeting?.meetingDate || '2099-01-01')
  );

  // Submission record for this meeting & department
  const currentSubmission = submissions.find(
    s => s.meetingId === selectedMeetingId && s.departmentId === selectedDeptId
  );
  const currentStatus: SubmissionStatus = currentSubmission?.status || 'Draft';

  // Lock logic: Once submitted, locked unless Changes Requested or user is Admin/Management
  const isLocked = (currentStatus === 'Submitted' || currentStatus === 'Under Review' || currentStatus === 'Approved') && !isManagementOrAdmin;

  // Previous action items for this department
  const previousActions = actionItems.filter(
    a => a.departmentId === selectedDeptId && a.originalMeetingId === previousApprovedMeeting?.id
  );

  // Section A: Follow-up state per action item
  const [followUpForms, setFollowUpForms] = useState<Record<string, Partial<FollowUpUpdate>>>({});
  // Section B: Proposed agenda items state
  const [newTopics, setNewTopics] = useState<Array<Partial<ProposedAgendaItem>>>([]);

  // Selected action to view historical audit updates modal
  const [historyModalAction, setHistoryModalAction] = useState<ActionItem | null>(null);
  const [historyRecords, setHistoryRecords] = useState<FollowUpUpdate[]>([]);

  // Final submission confirmation modal
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const [confirmedAccuracy, setConfirmedAccuracy] = useState<boolean>(false);

  // Notification / Saving feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Initialize or load data when meeting or department changes
  useEffect(() => {
    // 1. Populate Section A follow-ups from saved followUps
    const initialFollowUps: Record<string, Partial<FollowUpUpdate>> = {};
    for (const action of previousActions) {
      const existing = followUps.find(
        f => f.actionItemId === action.id && f.upcomingMeetingId === selectedMeetingId
      );
      if (existing) {
        initialFollowUps[action.id] = { ...existing };
      } else {
        initialFollowUps[action.id] = {
          actionItemId: action.id,
          originalMeetingId: previousApprovedMeeting?.id || action.originalMeetingId,
          originalMeetingDate: action.originalMeetingDate,
          upcomingMeetingId: selectedMeetingId,
          departmentId: selectedDeptId,
          topic: action.topic,
          previousDecision: action.description,
          previousResponsiblePerson: action.responsiblePerson,
          previousDueDate: action.dueDate,
          progressUpdate: action.progressNotes || '',
          status: action.status,
          delayReason: action.delayReason || '',
          revisedDueDate: action.revisedDueDate || action.dueDate,
          managementSupportRequired: '',
          additionalComments: ''
        };
      }
    }
    setFollowUpForms(initialFollowUps);

    // 2. Populate Section B proposed items from saved proposedItems
    const existingProps = proposedItems.filter(
      p => p.meetingId === selectedMeetingId && p.departmentId === selectedDeptId
    );
    if (existingProps.length > 0) {
      setNewTopics(existingProps.map(p => ({ ...p })));
    } else {
      // Provide one empty proposed topic to start
      setNewTopics([
        {
          id: `prop-draft-${Date.now()}`,
          meetingId: selectedMeetingId,
          departmentId: selectedDeptId,
          departmentName: selectedDept?.name || '',
          topic: '',
          description: '',
          reason: '',
          currentSituation: '',
          businessImpact: '',
          proposedSolution: '',
          decisionRequired: '',
          resourcesRequired: '',
          relatedDepartments: '',
          priority: 'Medium',
          status: 'Draft'
        }
      ]);
    }
  }, [selectedMeetingId, selectedDeptId, actionItems, followUps, proposedItems]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Section A form handlers
  const handleFollowUpChange = (actionId: string, field: keyof FollowUpUpdate, value: any) => {
    setFollowUpForms(prev => ({
      ...prev,
      [actionId]: {
        ...prev[actionId],
        [field]: value
      }
    }));
  };

  // Section B form handlers
  const handleTopicChange = (index: number, field: keyof ProposedAgendaItem, value: any) => {
    setNewTopics(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleAddTopic = () => {
    setNewTopics(prev => [
      ...prev,
      {
        id: `prop-draft-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        meetingId: selectedMeetingId,
        departmentId: selectedDeptId,
        departmentName: selectedDept?.name || '',
        topic: '',
        description: '',
        reason: '',
        currentSituation: '',
        businessImpact: '',
        proposedSolution: '',
        decisionRequired: '',
        resourcesRequired: '',
        relatedDepartments: '',
        priority: 'Medium',
        status: 'Draft'
      }
    ]);
  };

  const handleRemoveTopic = (index: number) => {
    const itemToRemove = newTopics[index];
    if (itemToRemove.id && !itemToRemove.id.startsWith('prop-draft-')) {
      deleteProposedItem(itemToRemove.id);
    }
    setNewTopics(prev => prev.filter((_, i) => i !== index));
  };

  // Save as Draft
  const handleSaveDraft = async () => {
    try {
      // 1. Save or update meetingSubmission with status = Draft (or preserve existing if Under Review)
      const submission = await saveOrUpdateSubmission({
        id: currentSubmission?.id,
        meetingId: selectedMeetingId,
        departmentId: selectedDeptId,
        departmentName: selectedDept?.name || '',
        submittedBy: currentUser.uid,
        submittedByName: currentUser.displayName,
        status: currentStatus === 'Changes Requested' ? 'Draft' : (currentStatus || 'Draft'),
        submissionDeadline: selectedMeeting?.submissionDeadline
      });

      // 2. Save Section A follow-ups
      for (const [actionId, fup] of Object.entries(followUpForms)) {
        if (fup.progressUpdate || fup.status) {
          await saveFollowUpUpdate({
            submissionId: submission.id,
            originalMeetingId: previousApprovedMeeting?.id || 'meet-prev',
            originalMeetingDate: fup.originalMeetingDate || previousApprovedMeeting?.meetingDate,
            upcomingMeetingId: selectedMeetingId,
            actionItemId: actionId,
            departmentId: selectedDeptId,
            submittedBy: currentUser.uid,
            submittedByName: currentUser.displayName,
            topic: fup.topic || '',
            previousDecision: fup.previousDecision || '',
            previousResponsiblePerson: fup.previousResponsiblePerson || '',
            previousDueDate: fup.previousDueDate || '',
            progressUpdate: fup.progressUpdate || 'In progress',
            status: (fup.status as ActionStatus) || 'In Progress',
            delayReason: fup.delayReason,
            revisedDueDate: fup.revisedDueDate,
            managementSupportRequired: fup.managementSupportRequired,
            additionalComments: fup.additionalComments
          });
        }
      }

      // 3. Save Section B new topics
      for (const topic of newTopics) {
        if (topic.topic && topic.topic.trim()) {
          await saveProposedItem({
            id: topic.id?.startsWith('prop-draft-') ? undefined : topic.id,
            submissionId: submission.id,
            meetingId: selectedMeetingId,
            departmentId: selectedDeptId,
            departmentName: selectedDept?.name || '',
            topic: topic.topic.trim(),
            description: topic.description || '',
            reason: topic.reason || '',
            currentSituation: topic.currentSituation || '',
            businessImpact: topic.businessImpact || '',
            proposedSolution: topic.proposedSolution || '',
            decisionRequired: topic.decisionRequired || '',
            resourcesRequired: topic.resourcesRequired || '',
            relatedDepartments: topic.relatedDepartments || '',
            priority: (topic.priority as PriorityLevel) || 'Medium',
            status: 'Draft',
            createdBy: currentUser.uid,
            createdByName: currentUser.displayName
          });
        }
      }

      await onRefreshData();
      showToast('Draft submission saved successfully. You can return and continue editing at any time.');
    } catch (err) {
      console.error(err);
      showToast('Failed to save draft. Please check inputs.');
    }
  };

  // Submit to Management
  const handleFinalSubmit = async () => {
    try {
      // 1. Save or update meetingSubmission with status = 'Submitted'
      const submission = await saveOrUpdateSubmission({
        id: currentSubmission?.id,
        meetingId: selectedMeetingId,
        departmentId: selectedDeptId,
        departmentName: selectedDept?.name || '',
        submittedBy: currentUser.uid,
        submittedByName: currentUser.displayName,
        status: 'Submitted',
        submittedAt: new Date().toISOString(),
        submissionDeadline: selectedMeeting?.submissionDeadline
      });

      // 2. Save all follow-ups
      for (const [actionId, fup] of Object.entries(followUpForms)) {
        await saveFollowUpUpdate({
          submissionId: submission.id,
          originalMeetingId: previousApprovedMeeting?.id || 'meet-prev',
          originalMeetingDate: fup.originalMeetingDate || previousApprovedMeeting?.meetingDate,
          upcomingMeetingId: selectedMeetingId,
          actionItemId: actionId,
          departmentId: selectedDeptId,
          submittedBy: currentUser.uid,
          submittedByName: currentUser.displayName,
          topic: fup.topic || '',
          previousDecision: fup.previousDecision || '',
          previousResponsiblePerson: fup.previousResponsiblePerson || '',
          previousDueDate: fup.previousDueDate || '',
          progressUpdate: fup.progressUpdate || 'Reviewed & updated',
          status: (fup.status as ActionStatus) || 'In Progress',
          delayReason: fup.delayReason,
          revisedDueDate: fup.revisedDueDate,
          managementSupportRequired: fup.managementSupportRequired,
          additionalComments: fup.additionalComments
        });
      }

      // 3. Save all proposed topics
      for (const topic of newTopics) {
        if (topic.topic && topic.topic.trim()) {
          await saveProposedItem({
            id: topic.id?.startsWith('prop-draft-') ? undefined : topic.id,
            submissionId: submission.id,
            meetingId: selectedMeetingId,
            departmentId: selectedDeptId,
            departmentName: selectedDept?.name || '',
            topic: topic.topic.trim(),
            description: topic.description || '',
            reason: topic.reason || '',
            currentSituation: topic.currentSituation || '',
            businessImpact: topic.businessImpact || '',
            proposedSolution: topic.proposedSolution || '',
            decisionRequired: topic.decisionRequired || '',
            resourcesRequired: topic.resourcesRequired || '',
            relatedDepartments: topic.relatedDepartments || '',
            priority: (topic.priority as PriorityLevel) || 'Medium',
            status: 'Submitted',
            createdBy: currentUser.uid,
            createdByName: currentUser.displayName
          });
        }
      }

      setShowSummaryModal(false);
      await onRefreshData();
      showToast(`Meeting preparation for ${selectedDept?.name} submitted to Management successfully!`);
    } catch (err) {
      console.error(err);
      showToast('Error during submission.');
    }
  };

  // Open History modal
  const openActionHistory = async (action: ActionItem) => {
    setHistoryModalAction(action);
    const history = await getFollowUpHistoryForAction(action.id);
    setHistoryRecords(history);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#22C55E] text-gray-950 font-semibold px-4 py-3 rounded-lg shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-gray-950" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Selector & Controls */}
      <div className="bg-[#1B1B25] border border-[#30303D] rounded-xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase font-bold text-[#A1A1B5] tracking-wider">
                Departmental Meeting Preparation Workflow
              </span>
              <span className="text-xs text-gray-500">•</span>
              <span className="text-xs text-[#8B5CF6] font-mono">Sections A, B & C</span>
            </div>
            <h1 className="text-xl font-bold text-[#F5F5F7] flex items-center gap-3">
              Minutes Submission & Upcoming Meeting Agenda
              <StatusBadge status={currentStatus} size="lg" />
            </h1>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleSaveDraft}
              disabled={isLocked}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                isLocked
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  : 'bg-[#242432] hover:bg-[#30303D] text-[#C4B5FD] border border-[#8B5CF6]/30 cursor-pointer'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Draft</span>
            </button>

            <button
              onClick={() => {
                setConfirmedAccuracy(false);
                setShowSummaryModal(true);
              }}
              disabled={isLocked}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-lg transition-all ${
                isLocked
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#22C55E] to-[#10B981] text-gray-950 hover:opacity-95 shadow-emerald-950/40 cursor-pointer'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Review & Submit to Management</span>
            </button>
          </div>
        </div>

        {/* Meeting & Department Selectors */}
        <div className="mt-5 pt-4 border-t border-[#30303D] grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Target Meeting */}
          <div>
            <label className="text-[11px] uppercase font-bold text-[#A1A1B5] block mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#8B5CF6]" />
              Target Upcoming Meeting
            </label>
            <select
              value={selectedMeetingId}
              onChange={(e) => setSelectedMeetingId(e.target.value)}
              className="w-full bg-[#15151C] border border-[#30303D] rounded-lg px-3 py-2 text-xs text-[#F5F5F7] focus:outline-none focus:border-[#8B5CF6]"
            >
              {meetings.length === 0 ? (
                <option value="">No meetings scheduled yet</option>
              ) : (
                meetings.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.meetingDate} — {m.title} ({m.lifecycleStatus})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Department Selection */}
          <div>
            <label className="text-[11px] uppercase font-bold text-[#A1A1B5] block mb-1.5 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-[#22C55E]" />
              Submitting Department
            </label>
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="w-full bg-[#15151C] border border-[#30303D] rounded-lg px-3 py-2 text-xs text-[#F5F5F7] focus:outline-none focus:border-[#22C55E]"
            >
              {availableDepts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          {/* Previous Meeting Loaded */}
          <div>
            <label className="text-[11px] uppercase font-bold text-[#A1A1B5] block mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Section A Baseline (Previous Approved Meeting)
            </label>
            <div className="bg-[#15151C] border border-[#30303D] rounded-lg px-3 py-2 text-xs text-[#A1A1B5] flex items-center justify-between">
              <span className="font-semibold text-[#F5F5F7]">
                {previousApprovedMeeting?.meetingDate || 'No previous meetings on record'}
              </span>
              <span className="text-[10px] text-emerald-400 uppercase font-mono">
                {previousApprovedMeeting ? 'Approved Baseline' : 'Initial Cycle'}
              </span>
            </div>
          </div>
        </div>

        {/* Lock Warning if Submitted */}
        {isLocked && (
          <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-xs text-blue-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-400 shrink-0" />
              <span>
                <strong>Submission Locked:</strong> This departmental submission has been submitted to Management and is currently <strong>{currentStatus}</strong>. Ordinary editing is locked to preserve official submission integrity.
              </span>
            </div>
            {isManagementOrAdmin && (
              <span className="text-[10px] uppercase bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/40">
                Admin Edit Override
              </span>
            )}
          </div>
        )}

        {/* Changes Requested Warning */}
        {currentStatus === 'Changes Requested' && (
          <div className="mt-4 p-3 bg-amber-500/15 border border-amber-500/40 rounded-lg text-xs text-amber-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-amber-300">Management Requested Changes:</div>
              <p className="mt-0.5 text-[#F5F5F7] leading-relaxed">
                {currentSubmission?.reviewerComments || 'Please revise the proposed agenda items and provide the requested budget specifics before re-submitting.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION A — PREVIOUS MEETING — DEPARTMENTAL FOLLOW-UP */}
      {/* ========================================================================= */}
      <section className="bg-[#1B1B25] border border-[#30303D] rounded-xl overflow-hidden shadow-xl">
        <div className="bg-gradient-to-r from-[#242432] via-[#1B1B25] to-[#242432] p-5 border-b border-[#30303D] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6]" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#F5F5F7]">
                SECTION A: PREVIOUS MEETING — DEPARTMENTAL FOLLOW-UP
              </h2>
            </div>
            <p className="text-xs text-[#A1A1B5] mt-1">
              Progress updates on action points assigned during the previous approved meeting ({previousApprovedMeeting?.meetingDate}).
              Original minutes remain immutable; updates are saved as separate date-stamped records.
            </p>
          </div>
          <span className="text-xs text-[#C4B5FD] font-semibold bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 px-3 py-1 rounded-full shrink-0">
            {previousActions.length} Actions Assigned
          </span>
        </div>

        <div className="p-6 space-y-6">
          {previousActions.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#A1A1B5] bg-[#15151C] rounded-lg border border-[#30303D]">
              No outstanding action items recorded for {selectedDept?.name} in the previous meeting ({previousApprovedMeeting?.meetingDate}).
            </div>
          ) : (
            previousActions.map((action, idx) => {
              const form = followUpForms[action.id] || {};
              const isPastDue = new Date(action.dueDate) < new Date() && form.status !== 'Completed';

              return (
                <div
                  key={action.id}
                  className="bg-[#15151C] border border-[#30303D] rounded-xl p-5 space-y-4 hover:border-[#8B5CF6]/40 transition-colors"
                >
                  {/* Top Bar of Item */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#30303D]/70">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded bg-[#8B5CF6]/20 text-[#C4B5FD] flex items-center justify-center text-xs font-mono font-bold">
                        A{idx + 1}
                      </span>
                      <h3 className="text-sm font-bold text-[#F5F5F7]">{action.topic}</h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openActionHistory(action)}
                        className="text-[11px] text-[#A78BFA] hover:text-white bg-[#242432] px-2.5 py-1 rounded border border-[#30303D] flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="View history of all previous updates across meetings"
                      >
                        <History className="w-3.5 h-3.5" />
                        <span>View Update History</span>
                      </button>
                      <StatusBadge status={form.status || action.status} size="sm" />
                    </div>
                  </div>

                  {/* Original Approved Minutes (Read-Only) */}
                  <div className="bg-[#1B1B25] p-3.5 rounded-lg border border-[#30303D]/60 text-xs grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="md:col-span-2">
                      <span className="text-[10px] uppercase font-bold text-[#A1A1B5] block mb-0.5">
                        Original Agreed Action / Commitment:
                      </span>
                      <p className="text-[#F5F5F7] leading-relaxed font-normal">{action.description}</p>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#A1A1B5] block mb-0.5">
                        Responsible Person:
                      </span>
                      <p className="text-[#F5F5F7] font-medium">{action.responsiblePerson}</p>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#A1A1B5] block mb-0.5">
                        Original Due Date:
                      </span>
                      <p className={`font-mono ${isPastDue ? 'text-red-400 font-semibold' : 'text-[#F5F5F7]'}`}>
                        {action.dueDate} {isPastDue && '(Overdue)'}
                      </p>
                    </div>
                  </div>

                  {/* Department Head Follow-Up Entry Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                    {/* Progress Update */}
                    <div className="md:col-span-2">
                      <label className="text-[11px] font-semibold text-[#F5F5F7] block mb-1">
                        Current Progress Update <span className="text-[#22C55E]">*</span>
                      </label>
                      <textarea
                        rows={3}
                        disabled={isLocked}
                        value={form.progressUpdate || ''}
                        onChange={(e) => handleFollowUpChange(action.id, 'progressUpdate', e.target.value)}
                        placeholder="Detail specific milestones achieved, field tests, deliveries, or current status since last meeting..."
                        className="w-full bg-[#1B1B25] border border-[#30303D] rounded-lg p-2.5 text-xs text-[#F5F5F7] placeholder-[#A1A1B5] focus:outline-none focus:border-[#8B5CF6] disabled:opacity-60"
                      />
                    </div>

                    {/* Status & Revised Date */}
                    <div className="space-y-3">
                      <div>
                        <label className="text-[11px] font-semibold text-[#F5F5F7] block mb-1">
                          Current Action Status <span className="text-[#22C55E]">*</span>
                        </label>
                        <select
                          disabled={isLocked}
                          value={form.status || action.status}
                          onChange={(e) => handleFollowUpChange(action.id, 'status', e.target.value)}
                          className="w-full bg-[#1B1B25] border border-[#30303D] rounded-lg px-3 py-2 text-xs text-[#F5F5F7] focus:outline-none focus:border-[#8B5CF6] disabled:opacity-60"
                        >
                          <option value="Not Started">Not Started</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Pending External Party">Pending External Party</option>
                          <option value="On Hold">On Hold</option>
                          <option value="Completed">Completed</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-[#F5F5F7] block mb-1">
                          Revised Expected Completion Date
                        </label>
                        <input
                          type="date"
                          disabled={isLocked}
                          value={form.revisedDueDate || ''}
                          onChange={(e) => handleFollowUpChange(action.id, 'revisedDueDate', e.target.value)}
                          className="w-full bg-[#1B1B25] border border-[#30303D] rounded-lg px-3 py-1.5 text-xs text-[#F5F5F7] focus:outline-none focus:border-[#8B5CF6] disabled:opacity-60 font-mono"
                        />
                      </div>
                    </div>

                    {/* Reason for Delay */}
                    <div>
                      <label className="text-[11px] font-semibold text-[#F5F5F7] block mb-1">
                        Reason for Delay (If applicable)
                      </label>
                      <input
                        type="text"
                        disabled={isLocked}
                        value={form.delayReason || ''}
                        onChange={(e) => handleFollowUpChange(action.id, 'delayReason', e.target.value)}
                        placeholder="e.g. Customs port clearance delay, supplier lead-time..."
                        className="w-full bg-[#1B1B25] border border-[#30303D] rounded-lg px-3 py-1.5 text-xs text-[#F5F5F7] placeholder-[#A1A1B5] focus:outline-none focus:border-[#8B5CF6] disabled:opacity-60"
                      />
                    </div>

                    {/* Management Support Required */}
                    <div>
                      <label className="text-[11px] font-semibold text-[#F5F5F7] block mb-1">
                        Support or Decision Required from Management
                      </label>
                      <input
                        type="text"
                        disabled={isLocked}
                        value={form.managementSupportRequired || ''}
                        onChange={(e) => handleFollowUpChange(action.id, 'managementSupportRequired', e.target.value)}
                        placeholder="e.g. Sign-off on emergency budget variance, cross-dept escort..."
                        className="w-full bg-[#1B1B25] border border-[#30303D] rounded-lg px-3 py-1.5 text-xs text-[#F5F5F7] placeholder-[#A1A1B5] focus:outline-none focus:border-[#8B5CF6] disabled:opacity-60"
                      />
                    </div>

                    {/* Additional Comments */}
                    <div>
                      <label className="text-[11px] font-semibold text-[#F5F5F7] block mb-1">
                        Additional Comments
                      </label>
                      <input
                        type="text"
                        disabled={isLocked}
                        value={form.additionalComments || ''}
                        onChange={(e) => handleFollowUpChange(action.id, 'additionalComments', e.target.value)}
                        placeholder="Any relevant observations or risk warnings..."
                        className="w-full bg-[#1B1B25] border border-[#30303D] rounded-lg px-3 py-1.5 text-xs text-[#F5F5F7] placeholder-[#A1A1B5] focus:outline-none focus:border-[#8B5CF6] disabled:opacity-60"
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION B — NEW MATTERS TO BE DISCUSSED AT THE UPCOMING MEETING */}
      {/* ========================================================================= */}
      <section className="bg-[#1B1B25] border border-[#30303D] rounded-xl overflow-hidden shadow-xl">
        <div className="bg-gradient-to-r from-[#242432] via-[#1B1B25] to-[#242432] p-5 border-b border-[#30303D] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E]" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#F5F5F7]">
                SECTION B: NEW MATTERS TO BE DISCUSSED AT THE UPCOMING MEETING
              </h2>
            </div>
            <p className="text-xs text-[#A1A1B5] mt-1">
              Submit new topics, operational challenges, capex requests, and key decisions required from Executive Management.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddTopic}
            disabled={isLocked}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all ${
              isLocked
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                : 'bg-[#22C55E]/20 text-[#4ADE80] border border-[#22C55E]/40 hover:bg-[#22C55E]/30 cursor-pointer'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Another Agenda Item</span>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {newTopics.map((topic, index) => (
            <div
              key={topic.id || index}
              className="bg-[#15151C] border border-[#30303D] rounded-xl p-5 space-y-4 relative group"
            >
              {/* Card Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#30303D]/70">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-[#22C55E]/20 text-[#4ADE80] flex items-center justify-center text-xs font-mono font-bold">
                    B{index + 1}
                  </span>
                  <span className="text-xs font-bold text-[#F5F5F7]">Proposed Agenda Item #{index + 1}</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-[#A1A1B5]">Priority:</span>
                    <select
                      disabled={isLocked}
                      value={topic.priority || 'Medium'}
                      onChange={(e) => handleTopicChange(index, 'priority', e.target.value)}
                      className="bg-[#1B1B25] border border-[#30303D] rounded px-2 py-1 text-xs text-[#F5F5F7] focus:outline-none focus:border-[#22C55E]"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>

                  {newTopics.length > 1 && !isLocked && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTopic(index)}
                      className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                      title="Remove agenda item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Topic / Subject */}
                <div className="md:col-span-2">
                  <label className="text-[11px] font-semibold text-[#F5F5F7] block mb-1">
                    Topic / Subject <span className="text-[#22C55E]">*</span>
                  </label>
                  <input
                    type="text"
                    disabled={isLocked}
                    value={topic.topic || ''}
                    onChange={(e) => handleTopicChange(index, 'topic', e.target.value)}
                    placeholder="Clear, concise agenda topic title (e.g. Caterpillar 988K Wheel Loader Capex Authorization)..."
                    className="w-full bg-[#1B1B25] border border-[#30303D] rounded-lg px-3 py-2 text-xs text-[#F5F5F7] placeholder-[#A1A1B5] focus:outline-none focus:border-[#22C55E] disabled:opacity-60"
                  />
                </div>

                {/* Detailed Explanation */}
                <div>
                  <label className="text-[11px] font-semibold text-[#F5F5F7] block mb-1">
                    Detailed Explanation of the Matter <span className="text-[#22C55E]">*</span>
                  </label>
                  <textarea
                    rows={3}
                    disabled={isLocked}
                    value={topic.description || ''}
                    onChange={(e) => handleTopicChange(index, 'description', e.target.value)}
                    placeholder="Provide full background context and specifics..."
                    className="w-full bg-[#1B1B25] border border-[#30303D] rounded-lg p-2.5 text-xs text-[#F5F5F7] placeholder-[#A1A1B5] focus:outline-none focus:border-[#22C55E] disabled:opacity-60"
                  />
                </div>

                {/* Reason for Bringing to Meeting */}
                <div>
                  <label className="text-[11px] font-semibold text-[#F5F5F7] block mb-1">
                    Reason for Bringing it to the Meeting <span className="text-[#22C55E]">*</span>
                  </label>
                  <textarea
                    rows={3}
                    disabled={isLocked}
                    value={topic.reason || ''}
                    onChange={(e) => handleTopicChange(index, 'reason', e.target.value)}
                    placeholder="Why this matter requires management committee time and collective decision..."
                    className="w-full bg-[#1B1B25] border border-[#30303D] rounded-lg p-2.5 text-xs text-[#F5F5F7] placeholder-[#A1A1B5] focus:outline-none focus:border-[#22C55E] disabled:opacity-60"
                  />
                </div>

                {/* Current Situation / Problem */}
                <div>
                  <label className="text-[11px] font-semibold text-[#F5F5F7] block mb-1">
                    Current Situation or Problem
                  </label>
                  <textarea
                    rows={2}
                    disabled={isLocked}
                    value={topic.currentSituation || ''}
                    onChange={(e) => handleTopicChange(index, 'currentSituation', e.target.value)}
                    placeholder="Current operational bottleneck, failure rates, or contractual risk..."
                    className="w-full bg-[#1B1B25] border border-[#30303D] rounded-lg p-2.5 text-xs text-[#F5F5F7] placeholder-[#A1A1B5] focus:outline-none focus:border-[#22C55E] disabled:opacity-60"
                  />
                </div>

                {/* Business Impact or Urgency */}
                <div>
                  <label className="text-[11px] font-semibold text-[#F5F5F7] block mb-1">
                    Business Impact or Urgency
                  </label>
                  <textarea
                    rows={2}
                    disabled={isLocked}
                    value={topic.businessImpact || ''}
                    onChange={(e) => handleTopicChange(index, 'businessImpact', e.target.value)}
                    placeholder="Production output loss, financial cost, legal exposure, or delivery deadline..."
                    className="w-full bg-[#1B1B25] border border-[#30303D] rounded-lg p-2.5 text-xs text-[#F5F5F7] placeholder-[#A1A1B5] focus:outline-none focus:border-[#22C55E] disabled:opacity-60"
                  />
                </div>

                {/* Proposed Solution or Recommendation */}
                <div>
                  <label className="text-[11px] font-semibold text-[#F5F5F7] block mb-1">
                    Proposed Solution or Recommendation <span className="text-[#22C55E]">*</span>
                  </label>
                  <textarea
                    rows={2}
                    disabled={isLocked}
                    value={topic.proposedSolution || ''}
                    onChange={(e) => handleTopicChange(index, 'proposedSolution', e.target.value)}
                    placeholder="What specific course of action does your department recommend?"
                    className="w-full bg-[#1B1B25] border border-[#30303D] rounded-lg p-2.5 text-xs text-[#F5F5F7] placeholder-[#A1A1B5] focus:outline-none focus:border-[#22C55E] disabled:opacity-60"
                  />
                </div>

                {/* Decision Required from Management */}
                <div>
                  <label className="text-[11px] font-semibold text-[#F5F5F7] block mb-1">
                    Decision Required from Management <span className="text-[#8B5CF6]">*</span>
                  </label>
                  <textarea
                    rows={2}
                    disabled={isLocked}
                    value={topic.decisionRequired || ''}
                    onChange={(e) => handleTopicChange(index, 'decisionRequired', e.target.value)}
                    placeholder="Explicit management resolution needed (e.g. Sanction budget of AED 24,500/month)..."
                    className="w-full bg-[#1B1B25] border border-[#8B5CF6]/50 rounded-lg p-2.5 text-xs text-[#F5F5F7] placeholder-[#A1A1B5] focus:outline-none focus:border-[#8B5CF6] disabled:opacity-60"
                  />
                </div>

                {/* Resources, Budget or Support Required */}
                <div>
                  <label className="text-[11px] font-semibold text-[#F5F5F7] block mb-1">
                    Resources, Budget, or Support Required
                  </label>
                  <input
                    type="text"
                    disabled={isLocked}
                    value={topic.resourcesRequired || ''}
                    onChange={(e) => handleTopicChange(index, 'resourcesRequired', e.target.value)}
                    placeholder="e.g. Budget estimate, crane rental, IT telemetry integration..."
                    className="w-full bg-[#1B1B25] border border-[#30303D] rounded-lg px-3 py-1.5 text-xs text-[#F5F5F7] placeholder-[#A1A1B5] focus:outline-none focus:border-[#22C55E] disabled:opacity-60"
                  />
                </div>

                {/* Related Departments */}
                <div>
                  <label className="text-[11px] font-semibold text-[#F5F5F7] block mb-1">
                    Related Department(s)
                  </label>
                  <input
                    type="text"
                    disabled={isLocked}
                    value={topic.relatedDepartments || ''}
                    onChange={(e) => handleTopicChange(index, 'relatedDepartments', e.target.value)}
                    placeholder="e.g. Operations, Finance, Logistics..."
                    className="w-full bg-[#1B1B25] border border-[#30303D] rounded-lg px-3 py-1.5 text-xs text-[#F5F5F7] placeholder-[#A1A1B5] focus:outline-none focus:border-[#22C55E] disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Footer Meta */}
              <div className="pt-3 border-t border-[#30303D]/50 flex items-center justify-between text-[11px] text-[#A1A1B5]">
                <span>Submitted by: <strong>{currentUser.displayName}</strong></span>
                <span>Target Meeting: <strong>{selectedMeeting?.meetingDate}</strong></span>
              </div>
            </div>
          ))}

          {/* Add Another Topic Button */}
          {!isLocked && (
            <button
              type="button"
              onClick={handleAddTopic}
              className="w-full py-3 border border-dashed border-[#30303D] hover:border-[#22C55E]/60 rounded-xl text-xs font-semibold text-[#A1A1B5] hover:text-[#22C55E] flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Another Agenda Item for {selectedDept?.name}</span>
            </button>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION C — SUMMARY & SUBMISSION CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1B1B25] border border-[#30303D] rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-[#30303D] flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#22C55E] tracking-wider">
                  Section C: Final Review & Submission
                </span>
                <h3 className="text-lg font-bold text-[#F5F5F7] mt-0.5">
                  Confirm Department Submission for {selectedDept?.name}
                </h3>
              </div>
              <button
                onClick={() => setShowSummaryModal(false)}
                className="text-gray-400 hover:text-white text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              {/* Submission Target Info */}
              <div className="bg-[#242432] p-4 rounded-xl border border-[#30303D] grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <span className="text-[10px] text-[#A1A1B5] block">Department:</span>
                  <span className="font-bold text-[#F5F5F7]">{selectedDept?.name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#A1A1B5] block">Upcoming Meeting:</span>
                  <span className="font-bold text-[#F5F5F7]">{selectedMeeting?.meetingDate}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#A1A1B5] block">Section A Follow-ups:</span>
                  <span className="font-bold text-[#8B5CF6]">{Object.keys(followUpForms).length} Items</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#A1A1B5] block">Section B New Topics:</span>
                  <span className="font-bold text-[#22C55E]">{newTopics.filter(t => t.topic?.trim()).length} Topics</span>
                </div>
              </div>

              {/* Section A Summary */}
              <div>
                <h4 className="text-xs font-bold uppercase text-[#8B5CF6] mb-2 flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5" />
                  Section A: Previous Action Item Updates
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {previousActions.map(action => {
                    const fup = followUpForms[action.id] || {};
                    return (
                      <div key={action.id} className="p-2.5 bg-[#15151C] rounded border border-[#30303D]">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-[#F5F5F7]">{action.topic}</span>
                          <StatusBadge status={fup.status || action.status} size="sm" />
                        </div>
                        <p className="text-[11px] text-[#A1A1B5] mt-1">{fup.progressUpdate || 'No update written'}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section B Summary */}
              <div>
                <h4 className="text-xs font-bold uppercase text-[#22C55E] mb-2 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  Section B: Proposed Agenda Topics
                </h4>
                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                  {newTopics.filter(t => t.topic?.trim()).map((topic, i) => (
                    <div key={i} className="p-2.5 bg-[#15151C] rounded border border-[#30303D]">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-[#F5F5F7]">#{i+1}: {topic.topic}</span>
                        <StatusBadge status={topic.priority || 'Medium'} size="sm" />
                      </div>
                      <p className="text-[11px] text-[#A1A1B5] mt-1">{topic.description}</p>
                      {topic.decisionRequired && (
                        <div className="text-[10px] text-purple-300 mt-1 font-medium">
                          Decision: {topic.decisionRequired}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Confirmation Checkbox */}
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3">
                <input
                  type="checkbox"
                  id="confirm-submit"
                  checked={confirmedAccuracy}
                  onChange={(e) => setConfirmedAccuracy(e.target.checked)}
                  className="mt-0.5 accent-[#22C55E] w-4 h-4 rounded cursor-pointer"
                />
                <label htmlFor="confirm-submit" className="text-xs text-amber-200 cursor-pointer">
                  I confirm that all previous meeting follow-ups and new discussion proposals have been reviewed for departmental accuracy.
                  Once submitted, ordinary editing will be locked until Management completes the review.
                </label>
              </div>
            </div>

            <div className="p-5 border-t border-[#30303D] bg-[#15151C] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowSummaryModal(false)}
                className="px-4 py-2 rounded-lg bg-[#242432] text-xs text-[#A1A1B5] hover:text-white"
              >
                Back to Editing
              </button>

              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={!confirmedAccuracy}
                className={`px-5 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                  confirmedAccuracy
                    ? 'bg-gradient-to-r from-[#22C55E] to-[#10B981] text-gray-950 shadow-lg cursor-pointer'
                    : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                }`}
              >
                <FileCheck className="w-4 h-4" />
                <span>Confirm Official Submission to Management</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Audit Modal for Action Item */}
      {historyModalAction && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1B1B25] border border-[#30303D] rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-[#30303D] flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#8B5CF6] tracking-wider">
                  Action Item Audit Trail
                </span>
                <h3 className="text-sm font-bold text-[#F5F5F7] mt-0.5">{historyModalAction.topic}</h3>
              </div>
              <button
                onClick={() => setHistoryModalAction(null)}
                className="text-gray-400 hover:text-white text-base font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="p-3 bg-[#15151C] rounded-lg border border-[#30303D]">
                <span className="text-[10px] uppercase text-[#A1A1B5] block mb-1">Original Action:</span>
                <p className="text-[#F5F5F7]">{historyModalAction.description}</p>
                <div className="flex gap-4 text-[11px] text-gray-400 mt-2">
                  <span>Assigned: {historyModalAction.assignedDate}</span>
                  <span>Due: {historyModalAction.dueDate}</span>
                  <span>Owner: {historyModalAction.responsiblePerson}</span>
                </div>
              </div>

              <h4 className="text-xs font-bold uppercase text-[#A1A1B5] tracking-wider mt-2">
                Date-stamped Follow-up History Across Meetings:
              </h4>

              {historyRecords.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#A1A1B5] bg-[#15151C] rounded-lg">
                  No previous follow-up records logged yet.
                </div>
              ) : (
                historyRecords.map((rec) => (
                  <div key={rec.id} className="p-3.5 bg-[#242432]/60 rounded-lg border border-[#30303D] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#F5F5F7]">{rec.submittedByName}</span>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={rec.status} size="sm" />
                        <span className="text-[10px] text-gray-400 font-mono">
                          {new Date(rec.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-[#A1A1B5] leading-relaxed">{rec.progressUpdate}</p>
                    {rec.delayReason && (
                      <div className="text-[11px] text-amber-300">
                        <strong>Delay Reason:</strong> {rec.delayReason}
                      </div>
                    )}
                    {rec.managementSupportRequired && (
                      <div className="text-[11px] text-[#C4B5FD]">
                        <strong>Support Needed:</strong> {rec.managementSupportRequired}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-[#30303D] bg-[#15151C] text-right">
              <button
                type="button"
                onClick={() => setHistoryModalAction(null)}
                className="px-4 py-1.5 rounded-lg bg-[#242432] text-xs text-[#F5F5F7] hover:bg-[#30303D]"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
