import React from 'react';
import { SubmissionStatus, ActionStatus, PriorityLevel, MeetingLifecycle } from '../types';

export const StatusBadge: React.FC<{
  status: SubmissionStatus | ActionStatus | PriorityLevel | MeetingLifecycle | 'Not Started';
  size?: 'sm' | 'md' | 'lg';
}> = ({ status, size = 'md' }) => {
  let colorStyles = 'bg-gray-800 text-gray-300 border-gray-700';

  // Submission Statuses
  if (status === 'Draft') {
    colorStyles = 'bg-[#242432] text-[#A1A1B5] border-[#30303D]';
  } else if (status === 'Submitted') {
    colorStyles = 'bg-blue-500/10 text-blue-400 border-blue-500/30';
  } else if (status === 'Under Review') {
    colorStyles = 'bg-[#8B5CF6]/15 text-[#C4B5FD] border-[#8B5CF6]/40';
  } else if (status === 'Changes Requested') {
    colorStyles = 'bg-amber-500/15 text-amber-300 border-amber-500/40';
  } else if (status === 'Approved' || status === 'Included in Meeting Agenda') {
    colorStyles = 'bg-[#22C55E]/15 text-[#4ADE80] border-[#22C55E]/40';
  } else if (status === 'Discussed' || status === 'Completed') {
    colorStyles = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
  } else if (status === 'Deferred to a Future Meeting' || status === 'On Hold') {
    colorStyles = 'bg-orange-500/15 text-orange-400 border-orange-500/30';
  } else if (status === 'Not Started') {
    colorStyles = 'bg-gray-800/60 text-gray-400 border-gray-700/50';
  } else if (status === 'In Progress') {
    colorStyles = 'bg-purple-500/15 text-purple-300 border-purple-500/30';
  } else if (status === 'Pending External Party') {
    colorStyles = 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30';
  } else if (status === 'Cancelled' || status === 'Rejected') {
    colorStyles = 'bg-red-500/15 text-red-400 border-red-500/30';
  } else if (status === 'Critical') {
    colorStyles = 'bg-red-500/20 text-red-300 border-red-500/50 font-semibold';
  } else if (status === 'High') {
    colorStyles = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
  } else if (status === 'Medium') {
    colorStyles = 'bg-blue-500/15 text-blue-300 border-blue-500/30';
  } else if (status === 'Low') {
    colorStyles = 'bg-slate-500/15 text-slate-300 border-slate-500/30';
  } else if (status === 'Upcoming') {
    colorStyles = 'bg-[#8B5CF6]/20 text-[#A78BFA] border-[#8B5CF6]/40';
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5'
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${sizeClasses} ${colorStyles}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {status}
    </span>
  );
};
