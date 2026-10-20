import React, { useState } from 'react';
import { Meeting, Department, ActionItem, ProposedAgendaItem } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import {
  Calendar,
  Clock,
  MapPin,
  Printer,
  ArrowLeft,
  Users,
  CheckCircle2,
  FileCheck,
  FileSpreadsheet
} from 'lucide-react';

interface MeetingDetailsProps {
  meeting: Meeting;
  departments: Department[];
  actionItems: ActionItem[];
  proposedItems: ProposedAgendaItem[];
  onBack: () => void;
  onNavigateToPreparation?: () => void;
}

export const MeetingDetails: React.FC<MeetingDetailsProps> = ({
  meeting,
  departments,
  actionItems,
  proposedItems,
  onBack,
  onNavigateToPreparation
}) => {
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');

  // Filter actions and discussions
  const meetingActions = actionItems.filter(
    (a) => a.originalMeetingId === meeting.id || a.followUpMeetingIds?.includes(meeting.id)
  );

  const meetingTopics = proposedItems.filter((p) => p.meetingId === meeting.id);

  const filteredTopics = meetingTopics.filter((t) => {
    if (selectedDeptFilter !== 'all' && t.departmentId !== selectedDeptFilter) return false;
    return true;
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header Actions (Hidden in Print) */}
      <div className="bg-[#1B1B25] border border-[#30303D] rounded-xl p-4 flex items-center justify-between print:hidden">
        <button
          onClick={onBack}
          className="text-xs text-[#A1A1B5] hover:text-[#F5F5F7] flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[#242432] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Meetings</span>
        </button>

        <div className="flex items-center gap-3">
          {meeting.lifecycleStatus === 'Upcoming' && onNavigateToPreparation && (
            <button
              onClick={onNavigateToPreparation}
              className="px-3.5 py-1.5 rounded-lg bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 text-[#C4B5FD] text-xs font-semibold hover:bg-[#8B5CF6]/30 transition-colors cursor-pointer"
            >
              Open Department Submission Workspace
            </button>
          )}

          <button
            onClick={handlePrint}
            className="px-4 py-1.5 rounded-lg bg-[#22C55E] text-gray-950 font-semibold text-xs flex items-center gap-1.5 hover:opacity-95 shadow cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Official Minutes</span>
          </button>
        </div>
      </div>

      {/* Department Filter (Interactive in App, Hidden in Print) */}
      <div className="bg-[#1B1B25] border border-[#30303D] rounded-xl p-4 flex items-center justify-between text-xs print:hidden">
        <span className="font-semibold text-[#A1A1B5]">Filter Department Discussions:</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedDeptFilter('all')}
            className={`px-3 py-1 rounded-md text-xs font-medium ${
              selectedDeptFilter === 'all'
                ? 'bg-[#8B5CF6] text-white'
                : 'bg-[#15151C] text-[#A1A1B5] hover:text-white'
            }`}
          >
            All Departments
          </button>
          {departments
            .filter((d) => meeting.participatingDepartmentIds.includes(d.id))
            .map((d) => (
              <button
                key={d.id}
                onClick={() => setSelectedDeptFilter(d.id)}
                className={`px-3 py-1 rounded-md text-xs font-medium ${
                  selectedDeptFilter === d.id
                    ? 'bg-[#22C55E] text-gray-950 font-semibold'
                    : 'bg-[#15151C] text-[#A1A1B5] hover:text-white'
                }`}
              >
                {d.name}
              </button>
            ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* OFFICIAL MINUTES DOCUMENT (Styled for high-end web & printable A4 paper) */}
      {/* ========================================================================= */}
      <article className="bg-[#1B1B25] border border-[#30303D] rounded-2xl p-8 md:p-12 shadow-2xl print:bg-white print:text-black print:border-none print:shadow-none print:p-0 space-y-8">
        {/* Document Header */}
        <header className="border-b-2 border-[#8B5CF6] pb-6 text-center space-y-2 print:border-black">
          <div className="text-sm uppercase tracking-widest font-mono font-bold text-[#22C55E] print:text-gray-700">
            Official Management Record
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-[#F5F5F7] tracking-tight uppercase font-mono print:text-black">
            AB STAR SANDS (PVT) LTD
          </h1>
          <h2 className="text-base md:text-lg font-bold text-[#C4B5FD] tracking-wide print:text-black">
            MEETING MINUTES & RESOLUTIONS
          </h2>
        </header>

        {/* Meeting Metadata Matrix */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-[#15151C] p-5 rounded-xl border border-[#30303D] text-xs print:bg-gray-100 print:text-black print:border-gray-300">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#A1A1B5] print:text-gray-600 block">
              Meeting Date:
            </span>
            <span className="font-bold text-[#F5F5F7] print:text-black font-mono text-sm">
              {meeting.meetingDate}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-[#A1A1B5] print:text-gray-600 block">
              Time & Venue:
            </span>
            <span className="font-semibold text-[#F5F5F7] print:text-black">
              {meeting.startTime} - {meeting.endTime} • {meeting.venue}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-[#A1A1B5] print:text-gray-600 block">
              Meeting Chairperson:
            </span>
            <span className="font-semibold text-[#22C55E] print:text-black">
              {meeting.chairperson}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-[#A1A1B5] print:text-gray-600 block">
              Minute-Taker:
            </span>
            <span className="font-semibold text-[#C4B5FD] print:text-black">
              {meeting.organizerName}
            </span>
          </div>
        </div>

        {/* Present Attendees */}
        <section className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#8B5CF6] border-b border-[#30303D] pb-1 print:border-gray-300 print:text-black">
            1. PRESENT & ATTENDANCE
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
            {meeting.attendees?.map((att, i) => (
              <div
                key={i}
                className="p-2.5 rounded bg-[#15151C] border border-[#30303D]/60 flex items-center justify-between print:bg-gray-50 print:border-gray-200"
              >
                <div>
                  <div className="font-bold text-[#F5F5F7] print:text-black">{att.name}</div>
                  <div className="text-[11px] text-[#A1A1B5] print:text-gray-600">{att.designation}</div>
                </div>
                <span className="text-[10px] font-semibold text-emerald-400 print:text-emerald-700">
                  Present
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Objectives */}
        {meeting.objectives && (
          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#8B5CF6] border-b border-[#30303D] pb-1 print:border-gray-300 print:text-black">
              2. MEETING OBJECTIVES
            </h3>
            <p className="text-xs text-[#F5F5F7] leading-relaxed bg-[#15151C] p-4 rounded-xl border border-[#30303D]/60 print:bg-transparent print:border-none print:p-0 print:text-black">
              {meeting.objectives}
            </p>
          </section>
        )}

        {/* Agenda Items & Discussions (Grouped by Department) */}
        <section className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#22C55E] border-b border-[#30303D] pb-1 print:border-gray-300 print:text-black">
            3. AGENDA ITEMS, DISCUSSIONS & DECISIONS
          </h3>

          {filteredTopics.length === 0 ? (
            <div className="p-4 text-center text-xs text-[#A1A1B5] bg-[#15151C] rounded border border-[#30303D]">
              No individual topic items recorded for this filter.
            </div>
          ) : (
            filteredTopics.map((topic, i) => (
              <div
                key={topic.id}
                className="p-5 rounded-xl bg-[#15151C] border border-[#30303D] space-y-3 print:bg-white print:border-gray-300 print:text-black"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-[#22C55E]/20 text-[#4ADE80] flex items-center justify-center font-bold text-xs font-mono print:bg-gray-200 print:text-black">
                      3.{i + 1}
                    </span>
                    <h4 className="text-sm font-bold text-[#F5F5F7] print:text-black">{topic.topic}</h4>
                  </div>
                  <div className="flex items-center gap-2 print:hidden">
                    <span className="text-xs text-[#22C55E] font-medium">{topic.departmentName}</span>
                    <StatusBadge status={topic.status} size="sm" />
                  </div>
                </div>

                <div className="text-xs space-y-2 text-[#F5F5F7] print:text-black">
                  <div>
                    <strong className="text-[#A1A1B5] print:text-gray-600 block text-[11px] uppercase">
                      Deliberations & Details:
                    </strong>
                    <p className="mt-0.5 leading-relaxed">{topic.discussionMinutes || topic.description}</p>
                  </div>

                  {(topic.agreedDecision || topic.decisionRequired) && (
                    <div className="bg-[#1B1B25] p-3 rounded border border-emerald-500/30 print:bg-gray-50 print:border-gray-200">
                      <strong className="text-emerald-400 print:text-emerald-800 block text-[11px] uppercase">
                        Management Decision / Resolution:
                      </strong>
                      <p className="mt-0.5 font-medium">{topic.agreedDecision || topic.decisionRequired}</p>
                    </div>
                  )}

                  {topic.agreedAction && (
                    <div className="flex justify-between items-center text-[11px] text-purple-300 bg-[#8B5CF6]/10 p-2.5 rounded print:text-black print:bg-gray-50">
                      <span><strong>Agreed Action:</strong> {topic.agreedAction}</span>
                      <span>Assignee: <strong>{topic.actionAssignee || topic.createdByName}</strong> • Due: <strong>{topic.actionDueDate || 'Follow-up'}</strong></span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </section>

        {/* Action Items Summary Table */}
        <section className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#8B5CF6] border-b border-[#30303D] pb-1 print:border-gray-300 print:text-black">
            4. ACTION ITEMS SUMMARY
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#30303D] text-[11px] uppercase font-bold text-[#A1A1B5] print:border-gray-400 print:text-black">
                  <th className="py-2.5 px-3">Dept</th>
                  <th className="py-2.5 px-3">Topic / Action Description</th>
                  <th className="py-2.5 px-3">Responsible Person</th>
                  <th className="py-2.5 px-3">Due Date</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30303D]/60 print:divide-gray-200">
                {meetingActions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-[#A1A1B5]">
                      No actions recorded for this meeting.
                    </td>
                  </tr>
                ) : (
                  meetingActions.map((act) => (
                    <tr key={act.id} className="hover:bg-[#15151C] print:hover:bg-transparent">
                      <td className="py-2.5 px-3 font-semibold text-[#22C55E] print:text-black">
                        {act.departmentName}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-[#F5F5F7] print:text-black">{act.topic}</div>
                        <div className="text-[11px] text-[#A1A1B5] print:text-gray-600 line-clamp-1">
                          {act.description}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-[#F5F5F7] print:text-black">
                        {act.responsiblePerson}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[#F5F5F7] print:text-black">
                        {act.dueDate}
                      </td>
                      <td className="py-2.5 px-3">
                        <StatusBadge status={act.status} size="sm" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Key Decisions Summary */}
        {meeting.keyDecisionsSummary && (
          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#22C55E] border-b border-[#30303D] pb-1 print:border-gray-300 print:text-black">
              5. KEY DECISIONS RATIFIED
            </h3>
            <p className="text-xs text-[#F5F5F7] leading-relaxed bg-[#15151C] p-4 rounded-xl border border-emerald-500/30 print:bg-transparent print:border-none print:p-0 print:text-black">
              {meeting.keyDecisionsSummary}
            </p>
          </section>
        )}

        {/* Signatures & Approvals */}
        <footer className="pt-8 border-t-2 border-[#30303D] grid grid-cols-2 gap-8 text-xs print:border-black print:text-black">
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold text-[#A1A1B5] print:text-gray-600 block">
              PREPARED BY:
            </span>
            <div className="font-bold text-[#F5F5F7] print:text-black">{meeting.organizerName}</div>
            <div className="text-[11px] text-[#A1A1B5] print:text-gray-600">Executive Secretariat</div>
            <div className="h-10 border-b border-dashed border-[#30303D] print:border-gray-400 mt-2" />
            <span className="text-[10px] text-gray-500">Date: {meeting.meetingDate}</span>
          </div>

          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold text-[#A1A1B5] print:text-gray-600 block">
              APPROVED & RATIFIED BY:
            </span>
            <div className="font-bold text-[#22C55E] print:text-black">
              {meeting.approvedBy || meeting.chairperson}
            </div>
            <div className="text-[11px] text-[#A1A1B5] print:text-gray-600">Managing Director & Chairperson</div>
            <div className="h-10 border-b border-dashed border-[#30303D] print:border-gray-400 mt-2" />
            <span className="text-[10px] text-gray-500">
              Signature of Chairman • AB STAR SANDS (PVT) LTD
            </span>
          </div>
        </footer>
      </article>
    </div>
  );
};
