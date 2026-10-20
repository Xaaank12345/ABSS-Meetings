import React, { useState } from 'react';
import { ActionItem, Department, Meeting, ActionStatus, PriorityLevel } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  Edit,
  ExternalLink,
  ChevronRight,
  RotateCcw
} from 'lucide-react';
import { updateActionItem } from '../services/db';

interface ActionTrackerProps {
  actionItems: ActionItem[];
  departments: Department[];
  meetings: Meeting[];
  onRefreshData: () => Promise<void>;
  onSelectMeeting: (meetingId: string) => void;
}

export const ActionTracker: React.FC<ActionTrackerProps> = ({
  actionItems,
  departments,
  meetings,
  onRefreshData,
  onSelectMeeting
}) => {
  const { currentUser } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPriority, setSelectedPriorityFilter] = useState('all');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [completedOnly, setCompletedOnly] = useState(false);

  // Edit Action Modal state
  const [editingAction, setEditingAction] = useState<ActionItem | null>(null);
  const [newStatus, setNewStatus] = useState<ActionStatus>('In Progress');
  const [newDueDate, setNewDueDate] = useState<string>('');
  const [progressNotes, setProgressNotes] = useState<string>('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const today = new Date().toISOString().split('T')[0];

  const filteredActions = actionItems.filter((action) => {
    const isCompleted = action.status === 'Completed';
    const isOverdue = !isCompleted && action.status !== 'Cancelled' && action.dueDate < today;

    if (overdueOnly && !isOverdue) return false;
    if (completedOnly && !isCompleted) return false;
    if (selectedDept !== 'all' && action.departmentId !== selectedDept) return false;
    if (selectedStatus !== 'all' && action.status !== selectedStatus) return false;
    if (selectedPriority !== 'all' && action.priority !== selectedPriority) return false;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchTopic = action.topic.toLowerCase().includes(q);
      const matchDesc = action.description.toLowerCase().includes(q);
      const matchOwner = action.responsiblePerson.toLowerCase().includes(q);
      const matchDept = action.departmentName.toLowerCase().includes(q);
      return matchTopic || matchDesc || matchOwner || matchDept;
    }
    return true;
  });

  const handleOpenEdit = (action: ActionItem) => {
    setEditingAction(action);
    setNewStatus(action.status);
    setNewDueDate(action.revisedDueDate || action.dueDate);
    setProgressNotes(action.progressNotes || '');
  };

  const handleSaveActionUpdate = async () => {
    if (!editingAction) return;
    try {
      await updateActionItem(
        editingAction.id,
        {
          status: newStatus,
          revisedDueDate: newDueDate !== editingAction.dueDate ? newDueDate : undefined,
          progressNotes
        },
        currentUser.uid,
        currentUser.displayName,
        `Status updated to ${newStatus}`
      );
      setEditingAction(null);
      await onRefreshData();
      showToast('Action item updated with audit trail entry.');
    } catch (e) {
      console.error(e);
      showToast('Error updating action item.');
    }
  };

  const totalOverdue = actionItems.filter(
    a => a.status !== 'Completed' && a.status !== 'Cancelled' && a.dueDate < today
  ).length;

  return (
    <div className="space-y-6 pb-20">
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#22C55E] text-gray-950 font-semibold px-4 py-3 rounded-lg shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-[#1B1B25] border border-[#30303D] rounded-xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold text-[#A1A1B5] tracking-wider">
            ABSS Corporate Accountability
          </span>
          <h1 className="text-xl font-bold text-[#F5F5F7] mt-0.5">
            Centralized Action Tracker
          </h1>
          <p className="text-xs text-[#A1A1B5] mt-1">
            Track commitments across all company meetings with historical audit trail and deadline enforcement.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {totalOverdue > 0 && (
            <div className="flex items-center gap-2 bg-red-500/15 border border-red-500/40 px-3 py-1.5 rounded-lg text-xs text-red-300">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span><strong>{totalOverdue}</strong> Overdue Action Items</span>
            </div>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[#1B1B25] border border-[#30303D] rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-[#A1A1B5] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search actions, topics, owners..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#15151C] border border-[#30303D] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#F5F5F7]"
            />
          </div>

          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-[#15151C] border border-[#30303D] rounded-lg px-3 py-1.5 text-xs text-[#F5F5F7]"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-[#15151C] border border-[#30303D] rounded-lg px-3 py-1.5 text-xs text-[#F5F5F7]"
          >
            <option value="all">All Statuses</option>
            <option value="Not Started">Not Started</option>
            <option value="In Progress">In Progress</option>
            <option value="Pending External Party">Pending External Party</option>
            <option value="On Hold">On Hold</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriorityFilter(e.target.value)}
            className="bg-[#15151C] border border-[#30303D] rounded-lg px-3 py-1.5 text-xs text-[#F5F5F7]"
          >
            <option value="all">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <button
            onClick={() => setOverdueOnly(!overdueOnly)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
              overdueOnly
                ? 'bg-red-500/20 border-red-500/50 text-red-300'
                : 'bg-[#15151C] border-[#30303D] text-[#A1A1B5] hover:text-white'
            }`}
          >
            Overdue Only
          </button>

          <button
            onClick={() => setCompletedOnly(!completedOnly)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
              completedOnly
                ? 'bg-[#22C55E]/20 border-[#22C55E]/50 text-[#4ADE80]'
                : 'bg-[#15151C] border-[#30303D] text-[#A1A1B5] hover:text-white'
            }`}
          >
            Completed Only
          </button>
        </div>

        <span className="text-xs text-[#A1A1B5]">
          Showing <strong>{filteredActions.length}</strong> of {actionItems.length} actions
        </span>
      </div>

      {/* Action Table */}
      <div className="bg-[#1B1B25] border border-[#30303D] rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#242432] border-b border-[#30303D] text-[11px] uppercase font-bold text-[#A1A1B5]">
                <th className="py-3 px-4">Action ID & Topic</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Action Commitment</th>
                <th className="py-3 px-4">Responsible Person</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30303D]/60">
              {filteredActions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#A1A1B5]">
                    No action items match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredActions.map((action) => {
                  const isCompleted = action.status === 'Completed';
                  const isOverdue = !isCompleted && action.status !== 'Cancelled' && action.dueDate < today;

                  return (
                    <tr
                      key={action.id}
                      className="hover:bg-[#15151C] transition-colors group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#F5F5F7] group-hover:text-[#C4B5FD] transition-colors">
                          {action.topic}
                        </div>
                        <span className="text-[10px] text-gray-500 font-mono">
                          {action.id} • Assigned {action.assignedDate}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-[#22C55E]">
                        {action.departmentName}
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="text-xs text-[#A1A1B5] line-clamp-2">
                          {action.description}
                        </p>
                        {action.progressNotes && (
                          <span className="text-[11px] text-emerald-400 block mt-0.5 line-clamp-1 italic">
                            Latest: {action.progressNotes}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-medium text-[#F5F5F7]">
                        {action.responsiblePerson}
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        <span className={isOverdue ? 'text-red-400 font-bold flex items-center gap-1' : 'text-[#F5F5F7]'}>
                          {action.revisedDueDate || action.dueDate}
                          {isOverdue && <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <StatusBadge status={action.priority} size="sm" />
                      </td>

                      <td className="py-3.5 px-4">
                        <StatusBadge status={action.status} size="sm" />
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(action)}
                            className="p-1.5 rounded-lg bg-[#242432] hover:bg-[#30303D] text-[#C4B5FD] transition-colors cursor-pointer"
                            title="Update Status & Progress Notes"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onSelectMeeting(action.originalMeetingId)}
                            className="p-1.5 rounded-lg bg-[#242432] hover:bg-[#30303D] text-[#22C55E] transition-colors cursor-pointer"
                            title="View Original Meeting Minutes"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Update Modal */}
      {editingAction && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1B1B25] border border-[#30303D] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#30303D] pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#22C55E]">Action Progress Update</span>
                <h3 className="text-sm font-bold text-[#F5F5F7] mt-0.5">{editingAction.topic}</h3>
              </div>
              <button onClick={() => setEditingAction(null)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#15151C] rounded border border-[#30303D] text-gray-300">
                {editingAction.description}
              </div>

              <div>
                <label className="text-xs font-semibold text-[#F5F5F7] block mb-1">Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as ActionStatus)}
                  className="w-full bg-[#15151C] border border-[#30303D] rounded-lg p-2 text-xs text-[#F5F5F7]"
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
                <label className="text-xs font-semibold text-[#F5F5F7] block mb-1">Due Date / Revised Due Date</label>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full bg-[#15151C] border border-[#30303D] rounded-lg p-2 text-xs text-[#F5F5F7] font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#F5F5F7] block mb-1">Progress Notes / Field Update</label>
                <textarea
                  rows={3}
                  value={progressNotes}
                  onChange={(e) => setProgressNotes(e.target.value)}
                  placeholder="Describe recent milestones, delivery dates, or reasons for delay..."
                  className="w-full bg-[#15151C] border border-[#30303D] rounded-lg p-2 text-xs text-[#F5F5F7]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#30303D]">
              <button
                onClick={() => setEditingAction(null)}
                className="px-3 py-1.5 rounded-lg bg-[#242432] text-xs text-[#A1A1B5]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveActionUpdate}
                className="px-4 py-1.5 rounded-lg bg-[#22C55E] text-gray-950 font-bold text-xs"
              >
                Save Action Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
