import React, { useState } from 'react';
import { Department, Meeting } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  Building,
  PlusCircle,
  AlertCircle
} from 'lucide-react';
import { createMeeting } from '../services/db';

interface CreateMeetingProps {
  departments: Department[];
  onMeetingCreated: (meeting: Meeting) => void;
  onCancel: () => void;
}

export const CreateMeeting: React.FC<CreateMeetingProps> = ({
  departments,
  onMeetingCreated,
  onCancel
}) => {
  const { currentUser } = useAuth();

  const [title, setTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState('2026-11-12');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('13:00');
  const [venue, setVenue] = useState('Executive Boardroom & Virtual Video Link');
  const [chairperson, setChairperson] = useState('Engr. Ahmed Al-Saeed');
  const [meetingType, setMeetingType] = useState('Management');
  const [submissionDeadline, setSubmissionDeadline] = useState('2026-11-10 18:00');
  const [selectedDepts, setSelectedDepts] = useState<string[]>(departments.map((d) => d.id));
  const [objectives, setObjectives] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const toggleDept = (id: string) => {
    setSelectedDepts((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !meetingDate) {
      setErrorMsg('Please specify meeting title and meeting date.');
      return;
    }
    if (selectedDepts.length === 0) {
      setErrorMsg('Please select at least one participating department.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const created = await createMeeting({
        title: title.trim(),
        meetingDate,
        startTime,
        endTime,
        venue: venue.trim(),
        chairperson: chairperson.trim(),
        organizerId: currentUser.uid,
        organizerName: currentUser.displayName,
        meetingType,
        lifecycleStatus: 'Upcoming',
        submissionDeadline,
        participatingDepartmentIds: selectedDepts,
        attendees: [
          { name: chairperson.trim(), designation: 'Managing Director & Chair', present: true },
          { name: currentUser.displayName, designation: currentUser.designation || 'Organizer', present: true }
        ],
        objectives: objectives.trim(),
        generalNotes: generalNotes.trim(),
        createdBy: currentUser.uid
      });

      onMeetingCreated(created);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to create meeting.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="bg-[#1B1B25] border border-[#30303D] rounded-xl p-6 shadow-xl">
        <div className="border-b border-[#30303D] pb-4 mb-6">
          <span className="text-xs uppercase font-bold text-[#22C55E] tracking-wider">
            Management Organization
          </span>
          <h1 className="text-xl font-bold text-[#F5F5F7] mt-0.5">
            Schedule New Corporate Meeting
          </h1>
          <p className="text-xs text-[#A1A1B5] mt-1">
            Setting up an upcoming meeting automatically opens departmental submission workspaces (Section A & B) for participating department heads.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 mb-6 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-[#F5F5F7] block mb-1.5">
              Meeting Title <span className="text-[#22C55E]">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. ABSS Executive Management Review Meeting — November 2026"
              className="w-full bg-[#15151C] border border-[#30303D] rounded-lg px-3.5 py-2.5 text-xs text-[#F5F5F7] focus:outline-none focus:border-[#8B5CF6]"
            />
          </div>

          {/* Date & Time Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-[#F5F5F7] block mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#8B5CF6]" />
                Meeting Date <span className="text-[#22C55E]">*</span>
              </label>
              <input
                type="date"
                required
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="w-full bg-[#15151C] border border-[#30303D] rounded-lg px-3 py-2 text-xs text-[#F5F5F7] font-mono focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#F5F5F7] block mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#22C55E]" />
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-[#15151C] border border-[#30303D] rounded-lg px-3 py-2 text-xs text-[#F5F5F7] font-mono focus:outline-none focus:border-[#22C55E]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#F5F5F7] block mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#22C55E]" />
                End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-[#15151C] border border-[#30303D] rounded-lg px-3 py-2 text-xs text-[#F5F5F7] font-mono focus:outline-none focus:border-[#22C55E]"
              />
            </div>
          </div>

          {/* Submission Deadline & Meeting Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-[#F5F5F7] block mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Department Head Submission Deadline <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                required
                value={submissionDeadline}
                onChange={(e) => setSubmissionDeadline(e.target.value)}
                placeholder="YYYY-MM-DD HH:mm (e.g. 2026-11-10 18:00)"
                className="w-full bg-[#15151C] border border-amber-500/40 rounded-lg px-3.5 py-2 text-xs text-[#F5F5F7] font-mono focus:outline-none focus:border-amber-400"
              />
              <span className="text-[10px] text-[#A1A1B5] mt-1 block">
                Departments must submit Section A follow-ups and Section B topics prior to this cutoff.
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#F5F5F7] block mb-1.5">
                Meeting Classification
              </label>
              <select
                value={meetingType}
                onChange={(e) => setMeetingType(e.target.value)}
                className="w-full bg-[#15151C] border border-[#30303D] rounded-lg px-3 py-2 text-xs text-[#F5F5F7]"
              >
                <option value="Management">Management Committee Review</option>
                <option value="Operations">Operations & Field Sand Logistics</option>
                <option value="Finance">Finance & CapEx Review</option>
                <option value="Departmental">Departmental Sync</option>
              </select>
            </div>
          </div>

          {/* Chairperson & Venue */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-[#F5F5F7] block mb-1.5">
                Meeting Chairperson
              </label>
              <input
                type="text"
                value={chairperson}
                onChange={(e) => setChairperson(e.target.value)}
                className="w-full bg-[#15151C] border border-[#30303D] rounded-lg px-3.5 py-2 text-xs text-[#F5F5F7]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#F5F5F7] block mb-1.5">
                Meeting Venue / Microsoft Teams Link
              </label>
              <input
                type="text"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                className="w-full bg-[#15151C] border border-[#30303D] rounded-lg px-3.5 py-2 text-xs text-[#F5F5F7]"
              />
            </div>
          </div>

          {/* Participating Departments Multi-select */}
          <div>
            <label className="text-xs font-semibold text-[#F5F5F7] block mb-2 flex items-center justify-between">
              <span>Participating Departments (Submissions Required)</span>
              <span className="text-[11px] text-[#22C55E]">{selectedDepts.length} selected</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {departments.map((dept) => {
                const checked = selectedDepts.includes(dept.id);
                return (
                  <div
                    key={dept.id}
                    onClick={() => toggleDept(dept.id)}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all flex items-center justify-between ${
                      checked
                        ? 'bg-[#22C55E]/10 border-[#22C55E]/60 text-white'
                        : 'bg-[#15151C] border-[#30303D] text-[#A1A1B5] hover:border-[#8B5CF6]/50'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-xs">{dept.name}</div>
                      <div className="text-[10px] opacity-75">{dept.headName}</div>
                    </div>
                    {checked && <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Objectives */}
          <div>
            <label className="text-xs font-semibold text-[#F5F5F7] block mb-1.5">
              Meeting Objectives & Key Deliverables
            </label>
            <textarea
              rows={3}
              value={objectives}
              onChange={(e) => setObjectives(e.target.value)}
              placeholder="Outline the core goals of this meeting (e.g. Q4 Sand production ramp-up, heavy equipment capex sign-off)..."
              className="w-full bg-[#15151C] border border-[#30303D] rounded-lg p-3 text-xs text-[#F5F5F7] focus:outline-none focus:border-[#8B5CF6]"
            />
          </div>

          {/* Submit & Cancel */}
          <div className="pt-4 border-t border-[#30303D] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg bg-[#242432] text-xs text-[#A1A1B5] hover:text-white"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-[#22C55E] to-[#10B981] text-gray-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/40 hover:opacity-95 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isSubmitting ? 'Creating...' : 'Create Meeting & Open Submissions'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
