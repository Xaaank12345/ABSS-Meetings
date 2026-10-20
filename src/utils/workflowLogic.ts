/**
 * Pure workflow and business logic for AB STAR SANDS Meeting Minutes & Submissions
 */

export type SubmissionStatus = 
  | 'Draft'
  | 'Submitted'
  | 'Under Review'
  | 'Changes Requested'
  | 'Approved'
  | 'Included in Meeting Agenda'
  | 'Discussed'
  | 'Deferred to a Future Meeting';

export type UserRole = 'admin' | 'management' | 'dept_head' | 'employee';

export interface DepartmentProgressSummary {
  departmentId: string;
  departmentName: string;
  status: SubmissionStatus | 'Not Started';
  submittedAt?: string;
  itemCount: number;
  followUpCount: number;
}

/**
 * Validates allowed submission lifecycle transitions based on user role
 */
export function canTransitionSubmission(
  currentStatus: SubmissionStatus | 'Not Started',
  targetStatus: SubmissionStatus,
  role: UserRole
): { allowed: boolean; reason?: string } {
  if (role === 'admin') {
    return { allowed: true };
  }

  if (role === 'dept_head') {
    if (currentStatus === 'Not Started' && (targetStatus === 'Draft' || targetStatus === 'Submitted')) {
      return { allowed: true };
    }
    if (currentStatus === 'Draft' && (targetStatus === 'Draft' || targetStatus === 'Submitted')) {
      return { allowed: true };
    }
    if (currentStatus === 'Changes Requested' && (targetStatus === 'Draft' || targetStatus === 'Submitted')) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: `Department heads cannot move submissions from '${currentStatus}' to '${targetStatus}'. Only Draft or Changes Requested submissions can be submitted.`
    };
  }

  if (role === 'management') {
    const managementAllowedFromSubmitted: SubmissionStatus[] = [
      'Under Review',
      'Changes Requested',
      'Approved',
      'Included in Meeting Agenda',
      'Deferred to a Future Meeting'
    ];
    if (currentStatus === 'Submitted' && managementAllowedFromSubmitted.includes(targetStatus)) {
      return { allowed: true };
    }
    if (currentStatus === 'Under Review' && ['Changes Requested', 'Approved', 'Deferred to a Future Meeting'].includes(targetStatus)) {
      return { allowed: true };
    }
    if (currentStatus === 'Approved' && ['Included in Meeting Agenda', 'Discussed', 'Deferred to a Future Meeting'].includes(targetStatus)) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: `Management transition from '${currentStatus}' to '${targetStatus}' is not permitted.`
    };
  }

  return { allowed: false, reason: 'Employees do not have submission editing permissions.' };
}

/**
 * Calculates departmental submission progress across all participating departments
 */
export function calculateDepartmentProgress(
  departments: Array<{ id: string; name: string }>,
  submissions: Array<{
    departmentId: string;
    status: SubmissionStatus;
    submittedAt?: string;
    itemCount?: number;
    followUpCount?: number;
  }>
): DepartmentProgressSummary[] {
  const submissionMap = new Map(submissions.map(s => [s.departmentId, s]));

  return departments.map(dept => {
    const sub = submissionMap.get(dept.id);
    if (!sub) {
      return {
        departmentId: dept.id,
        departmentName: dept.name,
        status: 'Not Started',
        itemCount: 0,
        followUpCount: 0
      };
    }
    return {
      departmentId: dept.id,
      departmentName: dept.name,
      status: sub.status,
      submittedAt: sub.submittedAt,
      itemCount: sub.itemCount || 0,
      followUpCount: sub.followUpCount || 0
    };
  });
}

/**
 * Consolidates approved agenda items into the official meeting agenda,
 * assigning sequential order numbers while preserving department traceability
 */
export function consolidateOfficialAgenda<T extends { id: string; departmentName: string; topic: string; priority: string; status: string; agendaOrder?: number }>(
  items: T[]
): (T & { officialAgendaNumber: number })[] {
  // Only include items that are Approved or Included in Meeting Agenda
  const approved = items.filter(
    item => item.status === 'Approved' || item.status === 'Included in Meeting Agenda'
  );

  // Sort by priority weight, then explicit agendaOrder if set
  const priorityWeight: Record<string, number> = {
    Critical: 1,
    High: 2,
    Medium: 3,
    Low: 4
  };

  const sorted = [...approved].sort((a, b) => {
    if (a.agendaOrder != null && b.agendaOrder != null) {
      return a.agendaOrder - b.agendaOrder;
    }
    if (a.agendaOrder != null) return -1;
    if (b.agendaOrder != null) return 1;

    const pA = priorityWeight[a.priority] || 99;
    const pB = priorityWeight[b.priority] || 99;
    if (pA !== pB) return pA - pB;

    return a.departmentName.localeCompare(b.departmentName);
  });

  return sorted.map((item, index) => ({
    ...item,
    officialAgendaNumber: index + 1
  }));
}

/**
 * Creates a carry-over payload for a deferred topic to a new meeting
 * preserving full historical context and submitter traceability
 */
export function carryOverDeferredTopic(
  item: {
    id: string;
    topic: string;
    description: string;
    businessImpact?: string;
    proposedSolution?: string;
    decisionRequired?: string;
    resourcesRequired?: string;
    departmentId: string;
    departmentName: string;
    priority: string;
    createdByName?: string;
  },
  newMeetingId: string,
  newSubmissionId: string,
  deferralReason?: string
) {
  return {
    originalItemId: item.id,
    meetingId: newMeetingId,
    submissionId: newSubmissionId,
    departmentId: item.departmentId,
    departmentName: item.departmentName,
    topic: `[Carried Forward] ${item.topic}`,
    description: item.description,
    businessImpact: item.businessImpact || '',
    proposedSolution: item.proposedSolution || '',
    decisionRequired: item.decisionRequired || '',
    resourcesRequired: item.resourcesRequired || '',
    priority: item.priority,
    status: 'Draft' as SubmissionStatus,
    reason: `Carried forward from previous meeting. ${deferralReason ? 'Reason: ' + deferralReason : ''}`,
    isCarriedForward: true,
    carriedForwardFromId: item.id
  };
}
