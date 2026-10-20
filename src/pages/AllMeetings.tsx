import React, { useState } from 'react';
import { Meeting, Department } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Search,
  Filter,
  ArrowRight,
  Plus,
  Printer,
  FileSpreadsheet
} from 'lucide-react';

interface AllMeetingsProps {
  meetings: Meeting[];
  departments: Department[];
  onSelectMeeting: (id: string) => void;
  onCreateMeeting: () => void;
}

export const AllMeetings: React.FC<AllMeetingsProps> = ({
  meetings,
  departments,
  onSelectMeeting,
  onCreateMeeting
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [lifecycleFilter, setLifecycleFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');

  const filteredMeetings = meetings.filter((m) => {
    if (lifecycleFilter !== 'all' && m.lifecycleStatus !== lifecycleFilter) return false;
    if (deptFilter !== 'all' && !m.participatingDepartmentIds.includes(deptFilter)) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchTitle = m.title.toLowerCase().includes(q);
      const matchVenue = m.venue.toLowerCase().includes(q);
      const matchChair = m.chairperson.toLowerCase().includes(q);
      const matchDate = m.meetingDate.includes(q);
      return matchTitle || matchVenue || matchChair || matchDate;
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="bg-[#1B1B25] border border-[#30303D] rounded-xl p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold text-[#A1A1B5] tracking-wider">
            ABSS Official Corporate Records
          </span>
          <h1 className="text-xl font-bold text-[#F5F5F7] mt-0.5">
            All Company Meeting Minutes
          </h1>
          <p className="text-xs text-[#A1A1B5] mt-1">
            Access past approved minutes, upcoming scheduled meetings, and departmental agendas.
          </p>
        </div>

        <button
          onClick={onCreateMeeting}
          className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-[#22C55E] to-[#10B981] text-gray-950 font-semibold text-xs flex items-center gap-2 hover:opacity-95 shadow-lg shadow-emerald-950/40 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Meeting</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#1B1B25] border border-[#30303D] rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-[#A1A1B5] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by title, date, chairperson..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#15151C] border border-[#30303D] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#F5F5F7]"
            />
          </div>

          <select
            value={lifecycleFilter}
            onChange={(e) => setLifecycleFilter(e.target.value)}
            className="bg-[#15151C] border border-[#30303D] rounded-lg px-3 py-1.5 text-xs text-[#F5F5F7]"
          >
            <option value="all">All Lifecycles</option>
            <option value="Completed">Completed & Approved</option>
            <option value="Upcoming">Upcoming / In Preparation</option>
            <option value="Draft">Draft</option>
          </select>

          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="bg-[#15151C] border border-[#30303D] rounded-lg px-3 py-1.5 text-xs text-[#F5F5F7]"
          >
            <option value="all">All Participating Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs text-[#A1A1B5]">
          Showing <strong>{filteredMeetings.length}</strong> of {meetings.length} meetings
        </span>
      </div>

      {/* Meetings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredMeetings.map((meeting) => (
          <div
            key={meeting.id}
            onClick={() => onSelectMeeting(meeting.id)}
            className="bg-[#1B1B25] border border-[#30303D] hover:border-[#8B5CF6]/50 rounded-xl p-5 space-y-4 cursor-pointer transition-all hover:shadow-xl group"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-xs font-mono font-semibold text-[#8B5CF6] block mb-1">
                  {meeting.meetingDate}
                </span>
                <h3 className="text-sm font-bold text-[#F5F5F7] group-hover:text-[#C4B5FD] transition-colors">
                  {meeting.title}
                </h3>
              </div>
              <StatusBadge status={meeting.lifecycleStatus} size="sm" />
            </div>

            <p className="text-xs text-[#A1A1B5] line-clamp-2">
              {meeting.objectives || meeting.generalNotes}
            </p>

            <div className="pt-3 border-t border-[#30303D]/60 grid grid-cols-2 gap-2 text-xs text-[#A1A1B5]">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#22C55E]" />
                <span className="truncate">Chair: {meeting.chairperson}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#8B5CF6]" />
                <span className="truncate">{meeting.venue}</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-2">
              <span className="text-[11px] text-gray-400">
                {meeting.participatingDepartmentIds.length} Participating Departments
              </span>
              <span className="text-xs font-medium text-[#22C55E] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                <span>View Official Minutes</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
