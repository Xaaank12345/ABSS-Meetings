import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from './firebase';
import {
  Meeting,
  Department,
  MeetingSubmission,
  ProposedAgendaItem,
  FollowUpUpdate,
  ActionItem,
  ActionHistory,
  AppNotification,
  AuditLog,
  User
} from '../types';
import {
  INITIAL_DEPARTMENTS,
  INITIAL_USERS,
  INITIAL_MEETINGS,
  INITIAL_ACTIONS,
  INITIAL_SUBMISSIONS,
  INITIAL_PROPOSED_ITEMS,
  INITIAL_FOLLOW_UPS,
  INITIAL_NOTIFICATIONS
} from './seedData';

// Known legacy/pre-made IDs to purge from Firestore if previously synced
const PREMADE_MEETING_IDS = [
  'meet-2026-07-28',
  'meet-2026-08-06',
  'meet-2026-10-16',
  'meet-2026-10-28'
];

const PREMADE_USER_IDS = [
  'user-fatima-hr',
  'user-shiraz-fin',
  'user-tariq-visa',
  'user-bilal-it',
  'user-rashid-ops',
  'user-reviewer-mgmt'
];

const PREMADE_ACTION_IDS = [
  'act-hr-01',
  'act-fin-01',
  'act-visa-01',
  'act-it-01',
  'act-ops-01',
  'act-maint-01',
  'act-bd-01'
];

const PREMADE_SUBMISSION_IDS = [
  'sub-2026-10-28-hr',
  'sub-2026-10-28-fin',
  'sub-2026-10-28-it'
];

const PREMADE_PROP_IDS = [
  'prop-hr-01',
  'prop-fin-01',
  'prop-it-01'
];

const PREMADE_FUP_IDS = [
  'fup-hr-01',
  'fup-fin-01'
];

// Local cache for immediate high-speed reactive UI, backed by Firestore persistence
let localDepartments: Department[] = [...INITIAL_DEPARTMENTS];
let localUsers: User[] = [...INITIAL_USERS];
let localMeetings: Meeting[] = [...INITIAL_MEETINGS];
let localSubmissions: MeetingSubmission[] = [...INITIAL_SUBMISSIONS];
let localProposedItems: ProposedAgendaItem[] = [...INITIAL_PROPOSED_ITEMS];
let localFollowUps: FollowUpUpdate[] = [...INITIAL_FOLLOW_UPS];
let localActions: ActionItem[] = [...INITIAL_ACTIONS];
let localNotifications: AppNotification[] = [...INITIAL_NOTIFICATIONS];
let localAuditLogs: AuditLog[] = [
  {
    id: 'log-init',
    userId: 'user-admin',
    userName: 'Engr. Ahmed Al-Saeed',
    operation: 'SYSTEM_INITIALIZATION',
    entityType: 'System',
    entityId: 'admin-mode',
    details: 'System initialized in Single Admin mode for AB STAR SANDS (PVT) LTD.',
    timestamp: new Date().toISOString()
  }
];

let isInitialized = false;

/**
 * Purges any leftover pre-made items from Firestore to guarantee clean database state
 */
async function purgePremadeFirestoreRecords(): Promise<void> {
  try {
    for (const mId of PREMADE_MEETING_IDS) {
      await deleteDoc(doc(db, 'meetings', mId)).catch(() => {});
    }
    for (const uId of PREMADE_USER_IDS) {
      await deleteDoc(doc(db, 'users', uId)).catch(() => {});
    }
    for (const aId of PREMADE_ACTION_IDS) {
      await deleteDoc(doc(db, 'actionItems', aId)).catch(() => {});
    }
    for (const sId of PREMADE_SUBMISSION_IDS) {
      await deleteDoc(doc(db, 'meetingSubmissions', sId)).catch(() => {});
    }
    for (const pId of PREMADE_PROP_IDS) {
      await deleteDoc(doc(db, 'proposedAgendaItems', pId)).catch(() => {});
    }
    for (const fId of PREMADE_FUP_IDS) {
      await deleteDoc(doc(db, 'followUpUpdates', fId)).catch(() => {});
    }
    await deleteDoc(doc(db, 'notifications', 'notif-01')).catch(() => {});
    await deleteDoc(doc(db, 'notifications', 'notif-02')).catch(() => {});
    await deleteDoc(doc(db, 'notifications', 'notif-03')).catch(() => {});
  } catch (err) {
    console.warn('Silent purge of pre-made items:', err);
  }
}

export async function initializeDatabase(): Promise<void> {
  if (isInitialized) return;
  try {
    // 1. Purge legacy pre-made items
    await purgePremadeFirestoreRecords();

    // 2. Sync departments
    const deptSnap = await getDocs(collection(db, 'departments'));
    if (deptSnap.empty) {
      for (const d of INITIAL_DEPARTMENTS) {
        await setDoc(doc(db, 'departments', d.id), d).catch(() => {});
      }
    } else {
      localDepartments = deptSnap.docs.map(d => d.data() as Department);
    }

    // 3. Sync admin user
    const userSnap = await getDocs(collection(db, 'users'));
    if (userSnap.empty) {
      for (const u of INITIAL_USERS) {
        await setDoc(doc(db, 'users', u.uid), u).catch(() => {});
      }
      localUsers = [...INITIAL_USERS];
    } else {
      const fetchedUsers = userSnap.docs
        .map(d => d.data() as User)
        .filter(u => !PREMADE_USER_IDS.includes(u.uid));
      
      // Ensure at least the main admin exists
      if (!fetchedUsers.some(u => u.role === 'admin')) {
        fetchedUsers.push(INITIAL_USERS[0]);
        await setDoc(doc(db, 'users', INITIAL_USERS[0].uid), INITIAL_USERS[0]).catch(() => {});
      }
      localUsers = fetchedUsers;
    }

    // 4. Sync meetings (filter out any pre-made meeting IDs)
    const meetingsSnap = await getDocs(collection(db, 'meetings'));
    if (!meetingsSnap.empty) {
      localMeetings = meetingsSnap.docs
        .map(d => d.data() as Meeting)
        .filter(m => !PREMADE_MEETING_IDS.includes(m.id));
    } else {
      localMeetings = [];
    }

    // 5. Sync action items (filter out pre-made action IDs)
    const actSnap = await getDocs(collection(db, 'actionItems'));
    if (!actSnap.empty) {
      localActions = actSnap.docs
        .map(d => d.data() as ActionItem)
        .filter(a => !PREMADE_ACTION_IDS.includes(a.id));
    } else {
      localActions = [];
    }

    // 6. Sync submissions
    const subSnap = await getDocs(collection(db, 'meetingSubmissions'));
    if (!subSnap.empty) {
      localSubmissions = subSnap.docs
        .map(d => d.data() as MeetingSubmission)
        .filter(s => !PREMADE_SUBMISSION_IDS.includes(s.id));
    } else {
      localSubmissions = [];
    }

    // 7. Sync proposed agenda items
    const propSnap = await getDocs(collection(db, 'proposedAgendaItems'));
    if (!propSnap.empty) {
      localProposedItems = propSnap.docs
        .map(d => d.data() as ProposedAgendaItem)
        .filter(p => !PREMADE_PROP_IDS.includes(p.id));
    } else {
      localProposedItems = [];
    }

    // 8. Sync follow ups
    const folSnap = await getDocs(collection(db, 'followUpUpdates'));
    if (!folSnap.empty) {
      localFollowUps = folSnap.docs
        .map(d => d.data() as FollowUpUpdate)
        .filter(f => !PREMADE_FUP_IDS.includes(f.id));
    } else {
      localFollowUps = [];
    }

    isInitialized = true;
  } catch (error) {
    console.warn('Firestore initial sync operated with local clean state:', error);
    isInitialized = true;
  }
}

/**
 * Resets all meetings and accounts back to single admin
 */
export async function resetToSingleAdminState(): Promise<void> {
  localMeetings = [];
  localActions = [];
  localSubmissions = [];
  localProposedItems = [];
  localFollowUps = [];
  localNotifications = [];
  localUsers = [...INITIAL_USERS];
  localDepartments = [...INITIAL_DEPARTMENTS];

  await purgePremadeFirestoreRecords();

  // Clean Firestore collections
  try {
    const meetSnap = await getDocs(collection(db, 'meetings'));
    for (const d of meetSnap.docs) {
      await deleteDoc(d.ref).catch(() => {});
    }

    const subSnap = await getDocs(collection(db, 'meetingSubmissions'));
    for (const d of subSnap.docs) {
      await deleteDoc(d.ref).catch(() => {});
    }

    const propSnap = await getDocs(collection(db, 'proposedAgendaItems'));
    for (const d of propSnap.docs) {
      await deleteDoc(d.ref).catch(() => {});
    }

    const folSnap = await getDocs(collection(db, 'followUpUpdates'));
    for (const d of folSnap.docs) {
      await deleteDoc(d.ref).catch(() => {});
    }

    const actSnap = await getDocs(collection(db, 'actionItems'));
    for (const d of actSnap.docs) {
      await deleteDoc(d.ref).catch(() => {});
    }

    const userSnap = await getDocs(collection(db, 'users'));
    for (const d of userSnap.docs) {
      if (d.id !== 'user-admin') {
        await deleteDoc(d.ref).catch(() => {});
      }
    }

    await setDoc(doc(db, 'users', INITIAL_USERS[0].uid), INITIAL_USERS[0]);
  } catch (e) {
    console.warn('Error during reset:', e);
  }
}

// USERS
export async function getUsers(): Promise<User[]> {
  await initializeDatabase();
  return [...localUsers];
}

export async function addUser(user: User): Promise<User> {
  await initializeDatabase();
  const existing = localUsers.findIndex(u => u.uid === user.uid);
  if (existing !== -1) {
    localUsers[existing] = user;
  } else {
    localUsers.push(user);
  }
  try {
    await setDoc(doc(db, 'users', user.uid), user);
  } catch (err) {
    console.warn('Failed saving user to Firestore:', err);
  }
  return user;
}

// MEETINGS
export async function getMeetings(): Promise<Meeting[]> {
  await initializeDatabase();
  return [...localMeetings].sort((a, b) => new Date(b.meetingDate).getTime() - new Date(a.meetingDate).getTime());
}

export async function getMeetingById(id: string): Promise<Meeting | undefined> {
  await initializeDatabase();
  return localMeetings.find(m => m.id === id);
}

export async function createMeeting(meetingData: Omit<Meeting, 'id' | 'createdAt' | 'updatedAt'>): Promise<Meeting> {
  const newMeeting: Meeting = {
    ...meetingData,
    id: `meet-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  localMeetings.push(newMeeting);

  // Automatically create notification for participating departments
  for (const deptId of newMeeting.participatingDepartmentIds) {
    const dept = localDepartments.find(d => d.id === deptId);
    if (dept) {
      const notif: AppNotification = {
        id: `notif-${Date.now()}-${deptId}`,
        targetDepartmentId: deptId,
        title: `Upcoming Meeting Submissions Open: ${newMeeting.title}`,
        message: `Please submit previous action follow-ups and new discussion topics before ${newMeeting.submissionDeadline || 'the deadline'}.`,
        type: 'new_meeting',
        meetingId: newMeeting.id,
        read: false,
        createdAt: new Date().toISOString()
      };
      localNotifications.unshift(notif);
      try {
        await setDoc(doc(db, 'notifications', notif.id), notif);
      } catch (e) {
        console.warn('Could not save notification to Firestore:', e);
      }
    }
  }

  try {
    await setDoc(doc(db, 'meetings', newMeeting.id), newMeeting);
  } catch (err) {
    console.warn('Failed saving meeting to Firestore:', err);
  }

  return newMeeting;
}

export async function updateMeeting(id: string, updates: Partial<Meeting>): Promise<void> {
  const idx = localMeetings.findIndex(m => m.id === id);
  if (idx !== -1) {
    localMeetings[idx] = {
      ...localMeetings[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    try {
      await updateDoc(doc(db, 'meetings', id), {
        ...updates,
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Failed updating meeting in Firestore:', e);
    }
  }
}

export async function deleteMeeting(id: string): Promise<void> {
  localMeetings = localMeetings.filter(m => m.id !== id);
  try {
    await deleteDoc(doc(db, 'meetings', id));
  } catch (e) {
    console.warn('Failed deleting meeting from Firestore:', e);
  }
}

// DEPARTMENTS
export async function getDepartments(): Promise<Department[]> {
  await initializeDatabase();
  return [...localDepartments];
}

export async function updateDepartment(id: string, updates: Partial<Department>): Promise<void> {
  const idx = localDepartments.findIndex(d => d.id === id);
  if (idx !== -1) {
    localDepartments[idx] = { ...localDepartments[idx], ...updates };
    try {
      await updateDoc(doc(db, 'departments', id), updates);
    } catch (e) {
      console.warn('Failed updating department in Firestore:', e);
    }
  }
}

// SUBMISSIONS
export async function getMeetingSubmissions(meetingId: string): Promise<MeetingSubmission[]> {
  await initializeDatabase();
  return localSubmissions.filter(s => s.meetingId === meetingId);
}

export async function getSubmission(meetingId: string, departmentId: string): Promise<MeetingSubmission | undefined> {
  await initializeDatabase();
  return localSubmissions.find(s => s.meetingId === meetingId && s.departmentId === departmentId);
}

export async function saveOrUpdateSubmission(submission: Partial<MeetingSubmission> & { meetingId: string; departmentId: string }): Promise<MeetingSubmission> {
  await initializeDatabase();
  const existingIndex = localSubmissions.findIndex(
    s => s.meetingId === submission.meetingId && s.departmentId === submission.departmentId
  );

  const now = new Date().toISOString();
  let saved: MeetingSubmission;

  if (existingIndex !== -1) {
    saved = {
      ...localSubmissions[existingIndex],
      ...submission,
      updatedAt: now
    };
    localSubmissions[existingIndex] = saved;
  } else {
    saved = {
      id: submission.id || `sub-${submission.meetingId}-${submission.departmentId}`,
      meetingId: submission.meetingId,
      departmentId: submission.departmentId,
      departmentName: submission.departmentName || '',
      submittedBy: submission.submittedBy || 'user-admin',
      submittedByName: submission.submittedByName || 'Admin',
      status: submission.status || 'Draft',
      submittedAt: submission.status === 'Submitted' ? now : undefined,
      submissionDeadline: submission.submissionDeadline,
      reviewerComments: submission.reviewerComments,
      reviewedBy: submission.reviewedBy,
      reviewedByName: submission.reviewedByName,
      reviewedAt: submission.reviewedAt,
      createdAt: now,
      updatedAt: now
    };
    localSubmissions.push(saved);
  }

  try {
    await setDoc(doc(db, 'meetingSubmissions', saved.id), saved);
  } catch (e) {
    console.warn('Failed saving submission to Firestore:', e);
  }

  return saved;
}

// FOLLOW-UP UPDATES (SECTION A)
export async function getFollowUpsForMeeting(meetingId: string, departmentId?: string): Promise<FollowUpUpdate[]> {
  await initializeDatabase();
  return localFollowUps.filter(f =>
    f.upcomingMeetingId === meetingId && (!departmentId || f.departmentId === departmentId)
  );
}

export async function getFollowUpHistoryForAction(actionItemId: string): Promise<FollowUpUpdate[]> {
  await initializeDatabase();
  return localFollowUps
    .filter(f => f.actionItemId === actionItemId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function saveFollowUpUpdate(update: Omit<FollowUpUpdate, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<FollowUpUpdate> {
  await initializeDatabase();
  const existingIdx = localFollowUps.findIndex(f =>
    (update.id && f.id === update.id) ||
    (f.upcomingMeetingId === update.upcomingMeetingId && f.actionItemId === update.actionItemId)
  );

  const now = new Date().toISOString();
  let saved: FollowUpUpdate;

  if (existingIdx !== -1) {
    saved = {
      ...localFollowUps[existingIdx],
      ...update,
      updatedAt: now
    };
    localFollowUps[existingIdx] = saved;
  } else {
    saved = {
      ...update,
      id: update.id || `fup-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: now,
      updatedAt: now
    };
    localFollowUps.push(saved);
  }

  try {
    await setDoc(doc(db, 'followUpUpdates', saved.id), saved);
  } catch (e) {
    console.warn('Failed saving followUpUpdate to Firestore:', e);
  }

  return saved;
}

// PROPOSED AGENDA ITEMS (SECTION B)
export async function getProposedItems(meetingId: string, departmentId?: string): Promise<ProposedAgendaItem[]> {
  await initializeDatabase();
  return localProposedItems.filter(p =>
    p.meetingId === meetingId && (!departmentId || p.departmentId === departmentId)
  );
}

export async function saveProposedItem(item: Omit<ProposedAgendaItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<ProposedAgendaItem> {
  await initializeDatabase();
  const existingIdx = localProposedItems.findIndex(p => p.id === item.id);
  const now = new Date().toISOString();
  let saved: ProposedAgendaItem;

  if (existingIdx !== -1) {
    saved = {
      ...localProposedItems[existingIdx],
      ...item,
      updatedAt: now
    };
    localProposedItems[existingIdx] = saved;
  } else {
    saved = {
      ...item,
      id: item.id || `prop-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: now,
      updatedAt: now
    };
    localProposedItems.push(saved);
  }

  try {
    await setDoc(doc(db, 'proposedAgendaItems', saved.id), saved);
  } catch (e) {
    console.warn('Failed saving proposed item to Firestore:', e);
  }

  return saved;
}

export async function deleteProposedItem(id: string): Promise<void> {
  localProposedItems = localProposedItems.filter(p => p.id !== id);
  try {
    await deleteDoc(doc(db, 'proposedAgendaItems', id));
  } catch (e) {
    console.warn('Failed deleting proposed item from Firestore:', e);
  }
}

// ACTION ITEMS & TRACKER
export async function getActionItems(): Promise<ActionItem[]> {
  await initializeDatabase();
  return [...localActions];
}

export async function updateActionItem(id: string, updates: Partial<ActionItem>, changedBy: string, changedByName: string, note?: string): Promise<void> {
  await initializeDatabase();
  const idx = localActions.findIndex(a => a.id === id);
  if (idx !== -1) {
    const old = localActions[idx];
    const updated = {
      ...old,
      ...updates,
      updatedAt: new Date().toISOString(),
      ...(updates.status === 'Completed' ? { completedAt: new Date().toISOString() } : {})
    };
    localActions[idx] = updated;

    // Log history
    const historyEntry: ActionHistory = {
      id: `acthist-${Date.now()}`,
      actionItemId: id,
      changedBy,
      changedByName,
      changeType: updates.status ? 'status_change' : 'progress_note',
      previousValue: old.status,
      newValue: updates.status || old.status,
      note: note || updates.progressNotes,
      timestamp: new Date().toISOString()
    };

    try {
      await updateDoc(doc(db, 'actionItems', id), updated);
      await setDoc(doc(db, 'actionHistory', historyEntry.id), historyEntry);
    } catch (e) {
      console.warn('Failed updating action item in Firestore:', e);
    }
  }
}

export async function createActionItem(item: Omit<ActionItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<ActionItem> {
  const newAction: ActionItem = {
    ...item,
    id: `act-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  localActions.push(newAction);
  try {
    await setDoc(doc(db, 'actionItems', newAction.id), newAction);
  } catch (e) {
    console.warn('Failed creating action item in Firestore:', e);
  }
  return newAction;
}

// NOTIFICATIONS
export async function getNotifications(departmentId?: string): Promise<AppNotification[]> {
  await initializeDatabase();
  if (!departmentId) return [...localNotifications];
  return localNotifications.filter(n => !n.targetDepartmentId || n.targetDepartmentId === departmentId);
}

export async function markNotificationAsRead(id: string): Promise<void> {
  const n = localNotifications.find(notif => notif.id === id);
  if (n) {
    n.read = true;
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (e) {
      // ignore
    }
  }
}

// AUDIT LOGS
export async function getAuditLogs(): Promise<AuditLog[]> {
  return [...localAuditLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function addAuditLog(entry: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
  const log: AuditLog = {
    ...entry,
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString()
  };
  localAuditLogs.unshift(log);
  try {
    await setDoc(doc(db, 'auditLogs', log.id), log);
  } catch (e) {
    console.warn('Failed adding audit log:', e);
  }
}
