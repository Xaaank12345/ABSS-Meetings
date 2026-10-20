/**
 * AB STAR SANDS (PVT) LTD - Meeting Minutes & Preparation System Data Types
 */

export type UserRole = 'admin' | 'management' | 'dept_head' | 'employee';

export interface User {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  departmentIds: string[];
  departmentName?: string;
  designation?: string;
  active: boolean;
  createdAt: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  headUserId: string;
  headName: string;
  description: string;
  active: boolean;
}

export type MeetingLifecycle = 'Draft' | 'Upcoming' | 'In Progress' | 'Completed' | 'Archived';

export interface Attendee {
  name: string;
  designation: string;
  department?: string;
  present: boolean;
}

export interface Meeting {
  id: string;
  title: string;
  meetingDate: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  venue: string;
  chairperson: string;
  organizerId: string;
  organizerName: string;
  meetingType: string;
  lifecycleStatus: MeetingLifecycle;
  submissionDeadline: string; // ISO or YYYY-MM-DD HH:mm
  participatingDepartmentIds: string[];
  attendees: Attendee[];
  objectives: string;
  generalNotes?: string;
  keyDecisionsSummary?: string;
  nextMeetingDate?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  approvedBy?: string;
  approvedAt?: string;
}

export type SubmissionStatus =
  | 'Draft'
  | 'Submitted'
  | 'Under Review'
  | 'Changes Requested'
  | 'Approved'
  | 'Included in Meeting Agenda'
  | 'Discussed'
  | 'Deferred to a Future Meeting';

export interface MeetingSubmission {
  id: string;
  meetingId: string;
  departmentId: string;
  departmentName: string;
  submittedBy: string;
  submittedByName: string;
  status: SubmissionStatus;
  submissionDeadline?: string;
  submittedAt?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  reviewerComments?: string;
  createdAt: string;
  updatedAt: string;
}

export type ActionStatus =
  | 'Not Started'
  | 'In Progress'
  | 'Pending External Party'
  | 'On Hold'
  | 'Completed'
  | 'Cancelled';

export interface FollowUpUpdate {
  id: string;
  submissionId: string;
  originalMeetingId: string;
  originalMeetingDate?: string;
  upcomingMeetingId: string;
  actionItemId: string;
  departmentId: string;
  submittedBy: string;
  submittedByName: string;
  topic: string;
  previousDecision: string;
  previousResponsiblePerson: string;
  previousDueDate: string;
  progressUpdate: string;
  status: ActionStatus;
  delayReason?: string;
  revisedDueDate?: string;
  managementSupportRequired?: string;
  additionalComments?: string;
  createdAt: string;
  updatedAt: string;
}

export type PriorityLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export type ProposedItemStatus =
  | 'Draft'
  | 'Submitted'
  | 'Approved'
  | 'Changes Requested'
  | 'Rejected'
  | 'Deferred to a Future Meeting'
  | 'Discussed'
  | 'Included in Meeting Agenda';

export interface ProposedAgendaItem {
  id: string;
  submissionId: string;
  meetingId: string;
  departmentId: string;
  departmentName: string;
  topic: string;
  description: string;
  reason: string;
  currentSituation: string;
  businessImpact: string;
  proposedSolution: string;
  decisionRequired: string;
  resourcesRequired?: string;
  relatedDepartments?: string;
  priority: PriorityLevel;
  status: ProposedItemStatus;
  reviewerComments?: string;
  agendaOrder?: number;
  discussionMinutes?: string;
  agreedDecision?: string;
  agreedAction?: string;
  actionAssignee?: string;
  actionDueDate?: string;
  attachments?: string[];
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  isCarriedForward?: boolean;
  carriedForwardFromId?: string;
}

export interface ActionItem {
  id: string;
  originalMeetingId: string;
  originalMeetingDate: string;
  agendaItemId?: string;
  departmentId: string;
  departmentName: string;
  topic: string;
  description: string;
  responsiblePerson: string;
  assigneeIds?: string[];
  assignedDate: string;
  dueDate: string;
  revisedDueDate?: string;
  priority: PriorityLevel;
  status: ActionStatus;
  progressNotes?: string;
  delayReason?: string;
  managementSupportRequired?: string;
  followUpMeetingIds?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface ActionHistory {
  id: string;
  actionItemId: string;
  changedBy: string;
  changedByName: string;
  changeType: 'status_change' | 'due_date_change' | 'progress_note' | 'reassigned' | 'created';
  previousValue?: string;
  newValue?: string;
  note?: string;
  timestamp: string;
}

export interface AppNotification {
  id: string;
  userId?: string;
  targetDepartmentId?: string;
  title: string;
  message: string;
  type: 'new_meeting' | 'deadline_approaching' | 'changes_requested' | 'submission_approved' | 'action_assigned';
  meetingId?: string;
  read: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  operation: string;
  entityType: string;
  entityId: string;
  details: string;
  timestamp: string;
}
