import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
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
    id: 'log-01',
    userId: 'user-admin',
    userName: 'Engr. Ahmed Al-Saeed',
    operation: 'CREATE_MEETING',
    entityType: 'Meeting',
    entityId: 'meet-2026-10-28',
    details: 'Created Upcoming Management Meeting for 28th October 2026',
    timestamp: '2026-10-17T09:00:00Z'
  },
  {
    id: 'log-02',
    userId: 'user-fatima-hr',
    userName: 'Fatima Zahra',
    operation: 'SUBMIT_PREPARATION',
    entityType: 'MeetingSubmission',
    entityId: 'sub-2026-10-28-hr',
    details: 'Submitted HR agenda topics and action follow-ups for review',
    timestamp: '2026-10-19T14:20:00Z'
  }
];

let isInitialized = false;

export async function initializeDatabase(): Promise<void> {
  if (isInitialized) return;
  try {
    // Check if meetings exist in Firestore
    const meetingsSnap = await getDocs(collection(db, 'meetings'));
    if (meetingsSnap.empty) {
      console.log('Seeding initial ABSS database to Firestore...');
      // Batch seed
      for (const d of INITIAL_DEPARTMENTS) {
        await setDoc(doc(db, 'departments', d.id), d);
      }
      for (const u of INITIAL_USERS) {
        await setDoc(doc(db, 'users', u.uid), u);
      }
      for (const m of INITIAL_MEETINGS) {
        await setDoc(doc(db, 'meetings', m.id), m);
      }
      for (const a of INITIAL_ACTIONS) {
        await setDoc(doc(db, 'actionItems', a.id), a);
      }
      for (const s of INITIAL_SUBMISSIONS) {
        await setDoc(doc(db, 'meetingSubmissions', s.id), s);
      }
      for (const p of INITIAL_PROPOSED_ITEMS) {
        await setDoc(doc(db, 'proposedAgendaItems', p.id), p);
      }
      for (const f of INITIAL_FOLLOW_UPS) {
        await setDoc(doc(db, 'followUpUpdates', f.id), f);
      }
      for (const n of INITIAL_NOTIFICATIONS) {
        await setDoc(doc(db, 'notifications', n.id), n);
      }
    } else {
      // Load from Firestore into memory
      localMeetings = meetingsSnap.docs.map(d => d.data() as Meeting);
      
      const deptSnap = await getDocs(collection(db, 'departments'));
      if (!deptSnap.empty) localDepartments = deptSnap.docs.map(d => d.data() as Department);
      
      const subSnap = await getDocs(collection(db, 'meetingSubmissions'));
      if (!subSnap.empty) localSubmissions = subSnap.docs.map(d => d.data() as MeetingSubmission);

      const propSnap = await getDocs(collection(db, 'proposedAgendaItems'));
      if (!propSnap.empty) localProposedItems = propSnap.docs.map(d => d.data() as ProposedAgendaItem);

      const folSnap = await getDocs(collection(db, 'followUpUpdates'));
      if (!folSnap.empty) localFollowUps = folSnap.docs.map(d => d.data() as FollowUpUpdate);

      const actSnap = await getDocs(collection(db, 'actionItems'));
      if (!actSnap.empty) localActions = actSnap.docs.map(d => d.data() as ActionItem);
    }
    isInitialized = true;
  } catch (error) {
    console.warn('Firestore initial sync encountered an error, operating with local state cache:', error);
    isInitialized = true;
  }
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

  // Automatically create Notification for all participating department heads
  for (const deptId of newMeeting.participatingDepartmentIds) {
    const dept = localDepartments.find(d => d.id === deptId);
    if (dept) {
      const notif: AppNotification = {
        id: `notif-${Date.now()}-${deptId}`,
        targetDepartmentId: deptId,
        title: `Upcoming Meeting Submissions Open: ${newMeeting.title}`,
        message: `Please submit previous action follow-ups and new discussion topics before ${newMeeting.submissionDeadline || 'deadline'}.`,
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

// DEPARTMENTS
export async function getDepartments(): Promise<Department[]> {
  await initializeDatabase();
  return [...localDepartments];
}

// USERS
export async function getUsers(): Promise<User[]> {
  await initializeDatabase();
  return [...localUsers];
}

// SUBMISSIONS
export async function getMeetingSubmissions(meetingId: string): Promise<MeetingSubmission[]> {
  await initializeDatabase();
  return localSubmissions.filter(s => s.meetingId === meetingId);
}

export async function getDepartmentSubmission(meetingId: string, departmentId: string): Promise<MeetingSubmission | undefined> {
  await initializeDatabase();
  return localSubmissions.find(s => s.meetingId === meetingId && s.departmentId === departmentId);
}

export async function saveOrUpdateSubmission(
  submission: Omit<MeetingSubmission, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<MeetingSubmission> {
  await initializeDatabase();
  const existingIdx = localSubmissions.findIndex(
    s => s.id === submission.id || (s.meetingId === submission.meetingId && s.departmentId === submission.departmentId)
  );

  const now = new Date().toISOString();
  let saved: MeetingSubmission;

  if (existingIdx !== -1) {
    saved = {
      ...localSubmissions[existingIdx],
      ...submission,
      updatedAt: now
    };
    localSubmissions[existingIdx] = saved;
  } else {
    saved = {
      ...submission,
      id: submission.id || `sub-${submission.meetingId}-${submission.departmentId}`,
      createdAt: now,
      updatedAt: now
    };
    localSubmissions.push(saved);
  }

  try {
    await setDoc(doc(db, 'meetingSubmissions', saved.id), saved);
  } catch (err) {
    console.warn('Failed persisting submission:', err);
  }

  return saved;
}

// FOLLOW UP UPDATES (SECTION A)
export async function getFollowUpsForMeeting(upcomingMeetingId: string, departmentId?: string): Promise<FollowUpUpdate[]> {
  await initializeDatabase();
  return localFollowUps.filter(f => 
    f.upcomingMeetingId === upcomingMeetingId && (!departmentId || f.departmentId === departmentId)
  );
}

export async function getFollowUpHistoryForAction(actionItemId: string): Promise<FollowUpUpdate[]> {
  await initializeDatabase();
  return localFollowUps
    .filter(f => f.actionItemId === actionItemId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function saveFollowUpUpdate(followUp: Omit<FollowUpUpdate, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<FollowUpUpdate> {
  await initializeDatabase();
  const existingIdx = localFollowUps.findIndex(
    f => f.id === followUp.id || (f.actionItemId === followUp.actionItemId && f.upcomingMeetingId === followUp.upcomingMeetingId)
  );

  const now = new Date().toISOString();
  let saved: FollowUpUpdate;

  if (existingIdx !== -1) {
    saved = {
      ...localFollowUps[existingIdx],
      ...followUp,
      updatedAt: now
    };
    localFollowUps[existingIdx] = saved;
  } else {
    saved = {
      ...followUp,
      id: followUp.id || `fup-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
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
