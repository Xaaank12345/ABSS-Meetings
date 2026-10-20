import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Department,
  Meeting,
  ProposedAgendaItem,
  ActionItem,
  PriorityLevel
} from '../types';
import { StatusBadge } from '../components/StatusBadge';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  PlusCircle,
  RotateCcw,
  Save,
  CheckSquare,
  Sparkles,
  Users
} from 'lucide-react';
import {
  saveProposedItem,
  createActionItem,
  updateMeeting
} from '../services/db';
import { carryOverDeferredTopic } from '../utils/workflowLogic';

interface MinutesRecorderProps {
  meetings: Meeting[];
  departments: Department[];
  proposedItems: ProposedAgendaItem[];
  actionItems: ActionItem[];
  onRefreshData: () => Promise<void>;
  onNavigateToActions: () => void;
}

export const MinutesRecorder: React.FC<MinutesRecorderProps> = ({
  meetings,
  departments,
  proposedItems,
  actionItems,
  onRefreshData,
  onNavigateToActions
}) => {
  const { currentUser, isManagementOrAdmin } = useAuth();

  const [selectedMeetingId, setSelectedMeetingId] = useState<string>(meetings[0]?.id || '');
  const selectedMeeting = meetings.find(m => m.id === selectedMeetingId);

  // Filter approved or discussed items for this meeting
  const agendaItems = proposedItems.filter(p => p.meetingId === selectedMeetingId);

  // Minutes recording form state
  const [editingItem, setEditingItem] = useState<ProposedAgendaItem | null>(null);
  const [discussionText, setDiscussionText] = useState<string>('');
  const [decisionText, setDecisionText] = useState<string>('');
  const [actionText, setActionText] = useState<string>('');
  const [assigneeName, setAssigneeName] = useState<string>('');
  const [dueDateStr, setDueDateStr] = useState<string>('');
  const [meetingStatus, setMeetingStatus] = useState<'Discussed' | 'Deferred to a Future Meeting' | 'Not Discussed'>('Discussed');

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const openRecorderModal = (item: ProposedAgendaItem) => {
    setEditingItem(item);
    setDiscussionText(item.discussionMinutes || '');
    setDecisionText(item.agreedDecision || '');
    setActionText(item.agreedAction || '');
    setAssigneeName(item.actionAssignee || item.createdByName);
    setDueDateStr(item.actionDueDate || '2026-11-15');
    setMeetingStatus(item.status === 'Discussed' ? 'Discussed' : (item.status === 'Deferred to a Future Meeting' ? 'Deferred to a Future Meeting' : 'Discussed'));
  };

  // Save Minutes & Optionally generate Action Item
  const handleSaveMinutes = async () => {
    if (!editingItem) return;
    try {
      const updatedItem: ProposedAgendaItem = {
        ...editingItem,
        status: meetingStatus,
        discussionMinutes: discussionText,
        agreedDecision: decisionText,
        agreedAction: actionText,
        actionAssignee: assigneeName,
        actionDueDate: dueDateStr,
        updatedAt: new Date().toISOString()
      };

      await saveProposedItem(updatedItem);

      // If an action was agreed, create record in Action Tracker
      if (actionText.trim() && meetingStatus === 'Discussed') {
        await createActionItem({
          originalMeetingId: selectedMeetingId,
          originalMeetingDate: selectedMeeting?.meetingDate || '2026-10-28',
          agendaItemId: editingItem.id,
          departmentId: editingItem.departmentId,
          departmentName: editingItem.departmentName,
          topic: editingItem.topic,
          description: actionText.trim(),
          responsiblePerson: assigneeName.trim() || editingItem.createdByName,
          assignedDate: selectedMeeting?.meetingDate || new Date().toISOString().split('T')[0],
          dueDate: dueDateStr || '2026-11-15',
          priority: editingItem.priority,
          status: 'In Progress',
          progressNotes: `Formulated in Management Meeting on ${selectedMeeting?.meetingDate}. Decision: ${decisionText}`,
          createdBy: currentUser.uid
        });
      }

      setEditingItem(null);
      await onRefreshData();
      showToast('Meeting minutes and agreed actions recorded successfully!');
    } catch (e) {
      console.error(e);
      showToast('Error recording minutes.');
    }
  };

  // One-click carry over deferred topic to next meeting
  const handleCarryOverToNextMeeting = async (item: ProposedAgendaItem) => {
    try {
      const nextMeeting = meetings.find(
        m => new Date(m.meetingDate) > new Date(selectedMeeting?.meetingDate || '')
      ) || { id: 'meet-2026-11-12', meetingDate: '2026-11-12' };

      const carryOverPayload = carryOverDeferredTopic(
        item,
        nextMeeting.id,
        `sub-${nextMeeting.id}-${item.departmentId}`,
        'Deferred in previous meeting due to agenda time limits'
      );

      await saveProposedItem({
        ...carryOverPayload,
        status: 'Draft',
        createdBy: currentUser.uid,
        createdByName: currentUser.displayName
      });

      await onRefreshData();
      showToast(`Topic carried over into upcoming meeting (${nextMeeting.meetingDate}) with full history!`);
    } catch (e) {
      console.error(e);
      showToast('Could not carry over topic.');
    }
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
                Section 7: Official Minute-Taking & Outcomes
              </span>
              <span className="text-xs text-gray-500">•</span>
              <span className="text-xs text-[#22C55E] font-mono">Action Tracker Generator</span>
            </div>
            <h1 className="text-xl font-bold text-[#F5F5F7] flex items-center gap-3">
              Post-Meeting Minutes & Action Assignment Recorder
            </h1>
            <p className="text-xs text-[#A1A1B5] mt-1">
              Record discussions, binding management decisions, and agreed action items. Automatically converts decisions into traceable action items.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateToActions}
              className="px-3.5 py-2 rounded-lg bg-[#242432] hover:bg-[#30303D] text-[#C4B5FD] border border-[#8B5CF6]/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Open Global Action Tracker</span>
            </button>
          </div>
        </div>

        {/* Meeting Picker */}
        <div className="mt-4 pt-4 border-t border-[#30303D] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-[#A1A1B5] uppercase">Active Meeting:</label>
            <select
              value={selectedMeetingId}
              onChange={(e) => setSelectedMeetingId(e.target.value)}
              className="bg-[#15151C] border border-[#30303D] rounded-lg px-3 py-1.5 text-xs text-[#F5F5F7] focus:outline-none focus:border-[#8B5CF6]"
            >
              {meetings.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.meetingDate} — {m.title} ({m.lifecycleStatus})
                </option>
              ))}
            </select>
          </div>

          <div className="text-xs text-[#A1A1B5]">
            Chairperson: <strong className="text-[#F5F5F7]">{selectedMeeting?.chairperson}</strong>
          </div>
        </div>
      </div>

      {/* Agenda Items List to Record Minutes */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#A1A1B5] flex items-center justify-between">
          <span>Agenda Items to Record ({agendaItems.length})</span>
          <span className="text-[11px] text-[#22C55E]">
            {agendaItems.filter(i => i.status === 'Discussed').length} Discussed • {agendaItems.filter(i => i.status === 'Deferred to a Future Meeting').length} Deferred
          </span>
        </h2>

        {agendaItems.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#A1A1B5] bg-[#1B1B25] rounded-xl border border-[#30303D]">
            No agenda items found for this meeting. Check Management Review to approve topics into this meeting.
          </div>
        ) : (
          agendaItems.map((item, index) => {
            const isDiscussed = item.status === 'Discussed';
            const isDeferred = item.status === 'Deferred to a Future Meeting';

            return (
              <div
                key={item.id}
                className={`p-5 rounded-xl border transition-all ${
                  isDiscussed
                    ? 'bg-[#1B1B25] border-emerald-500/40'
                    : isDeferred
                    ? 'bg-[#1B1B25] border-orange-500/30'
                    : 'bg-[#1B1B25] border-[#30303D]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded bg-[#242432] text-xs font-mono font-bold flex items-center justify-center text-[#F5F5F7]">
                        #{index + 1}
                      </span>
                      <h3 className="text-sm font-bold text-[#F5F5F7]">{item.topic}</h3>
                      <StatusBadge status={item.priority} size="sm" />
                      <StatusBadge status={item.status} size="sm" />
                    </div>

                    <div className="text-xs text-[#A1A1B5] flex gap-3">
                      <span>Department: <strong className="text-[#22C55E]">{item.departmentName}</strong></span>
                      <span>Proposed by: <strong>{item.createdByName}</strong></span>
                    </div>

                    <p className="text-xs text-[#A1A1B5] leading-relaxed pt-1">
                      <strong>Submission Brief: </strong> {item.description}
                    </p>

                    {/* Recorded Minutes Outcome if recorded */}
                    {(item.discussionMinutes || item.agreedDecision || item.agreedAction) && (
                      <div className="mt-3 p-3 rounded-lg bg-[#15151C] border border-[#30303D] space-y-2 text-xs">
                        {item.discussionMinutes && (
                          <div>
                            <span className="font-bold text-[#A1A1B5] block text-[10px] uppercase">Deliberation / Discussion:</span>
                            <p className="text-[#F5F5F7]">{item.discussionMinutes}</p>
                          </div>
                        )}
                        {item.agreedDecision && (
                          <div>
                            <span className="font-bold text-[#22C55E] block text-[10px] uppercase">Management Decision:</span>
                            <p className="text-emerald-300 font-medium">{item.agreedDecision}</p>
                          </div>
                        )}
                        {item.agreedAction && (
                          <div className="pt-2 border-t border-[#30303D]/60 flex justify-between items-center text-[11px]">
                            <div>
                              <strong className="text-[#C4B5FD]">Agreed Action: </strong>
                              <span className="text-[#F5F5F7]">{item.agreedAction}</span>
                            </div>
                            <span className="text-gray-400 font-mono">
                              Assignee: {item.actionAssignee} • Due: {item.actionDueDate}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex sm:flex-col items-center gap-2 shrink-0">
                    <button
                      onClick={() => openRecorderModal(item)}
                      className="px-3.5 py-1.5 rounded-lg bg-[#22C55E]/20 hover:bg-[#22C55E]/30 text-[#4ADE80] border border-[#22C55E]/40 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{isDiscussed ? 'Edit Minutes' : 'Record Discussion & Decision'}</span>
                    </button>

                    {isDeferred && (
                      <button
                        onClick={() => handleCarryOverToNextMeeting(item)}
                        className="px-3 py-1.5 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Propose for next upcoming meeting with full history intact"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Carry Over to Next Meeting</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Record Minutes Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1B1B25] border border-[#30303D] rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-[#30303D] flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#22C55E] tracking-wider">
                  Post-Meeting Recording
                </span>
                <h3 className="text-base font-bold text-[#F5F5F7] mt-0.5">{editingItem.topic}</h3>
                <span className="text-xs text-[#A1A1B5]">
                  Department: <strong>{editingItem.departmentName}</strong> • Submitter: <strong>{editingItem.createdByName}</strong>
                </span>
              </div>
              <button onClick={() => setEditingItem(null)} className="text-gray-400 hover:text-white font-bold p-1">
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Original Submitter Request (Preserved separately!) */}
              <div className="p-3 bg-[#15151C] rounded-lg border border-[#30303D]">
                <strong className="text-[#C4B5FD] text-[10px] uppercase block mb-1">Original Department Request:</strong>
                <p className="text-[#F5F5F7]">{editingItem.description}</p>
                {editingItem.decisionRequired && (
                  <div className="text-[11px] text-purple-300 mt-1">
                    <strong>Requested Decision:</strong> {editingItem.decisionRequired}
                  </div>
                )}
              </div>

              {/* Discussion Outcome Status */}
              <div>
                <label className="text-xs font-semibold text-[#F5F5F7] block mb-1">Topic Outcome Status</label>
                <select
                  value={meetingStatus}
                  onChange={(e) => setMeetingStatus(e.target.value as any)}
                  className="w-full bg-[#15151C] border border-[#30303D] rounded-lg p-2 text-xs text-[#F5F5F7]"
                >
                  <option value="Discussed">Discussed & Decision Taken</option>
                  <option value="Deferred to a Future Meeting">Deferred to Future Meeting</option>
                  <option value="Not Discussed">Not Discussed (Time Limit)</option>
                </select>
              </div>

              {/* Actual Discussion Minutes */}
              <div>
                <label className="text-xs font-semibold text-[#F5F5F7] block mb-1">
                  Actual Discussion / Minutes Details <span className="text-[#22C55E]">*</span>
                </label>
                <textarea
                  rows={3}
                  value={discussionText}
                  onChange={(e) => setDiscussionText(e.target.value)}
                  placeholder="Summarize key remarks made during the meeting by Chairperson and Department Heads..."
                  className="w-full bg-[#15151C] border border-[#30303D] rounded-lg p-2.5 text-xs text-[#F5F5F7]"
                />
              </div>

              {/* Management Decision */}
              <div>
                <label className="text-xs font-semibold text-[#F5F5F7] block mb-1">
                  Management Decision / Formal Resolution <span className="text-[#22C55E]">*</span>
                </label>
                <textarea
                  rows={2}
                  value={decisionText}
                  onChange={(e) => setDecisionText(e.target.value)}
                  placeholder="Exact decision ratified by Executive Management (e.g. Approved purchase order under CapEx Q4)..."
                  className="w-full bg-[#15151C] border border-emerald-500/50 rounded-lg p-2.5 text-xs text-[#F5F5F7]"
                />
              </div>

              {/* Assigned Action (Auto-Tracker Generation) */}
              <div className="p-4 bg-[#242432]/60 rounded-xl border border-[#30303D] space-y-3">
                <span className="text-[10px] uppercase font-bold text-[#8B5CF6] tracking-wider block">
                  Action Tracker Registration (Optional)
                </span>
                <div>
                  <label className="text-[11px] font-semibold text-[#F5F5F7] block mb-1">
                    Agreed Action Point
                  </label>
                  <input
                    type="text"
                    value={actionText}
                    onChange={(e) => setActionText(e.target.value)}
                    placeholder="Specific actionable task created (e.g. Issue purchase requisition to Al-Bahar Caterpillar)..."
                    className="w-full bg-[#15151C] border border-[#30303D] rounded-lg px-3 py-1.5 text-xs text-[#F5F5F7]"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[#F5F5F7] block mb-1">
                      Responsible Person
                    </label>
                    <input
                      type="text"
                      value={assigneeName}
                      onChange={(e) => setAssigneeName(e.target.value)}
                      placeholder="e.g. Shiraz Khan (CFO)"
                      className="w-full bg-[#15151C] border border-[#30303D] rounded-lg px-3 py-1.5 text-xs text-[#F5F5F7]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#F5F5F7] block mb-1">
                      Action Due Date
                    </label>
                    <input
                      type="date"
                      value={dueDateStr}
                      onChange={(e) => setDueDateStr(e.target.value)}
                      className="w-full bg-[#15151C] border border-[#30303D] rounded-lg px-3 py-1.5 text-xs text-[#F5F5F7] font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-[#30303D] bg-[#15151C] flex justify-between items-center">
              <button
                onClick={() => setEditingItem(null)}
                className="px-4 py-1.5 rounded-lg bg-[#242432] text-xs text-[#A1A1B5]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveMinutes}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-[#22C55E] to-[#10B981] text-gray-950 font-bold text-xs flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Save Official Minutes & Register Action</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
