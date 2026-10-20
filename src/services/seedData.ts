import { Department, Meeting, ActionItem, MeetingSubmission, ProposedAgendaItem, FollowUpUpdate, User } from '../types';

export const INITIAL_DEPARTMENTS: Department[] = [
  {
    id: 'dept-hr',
    name: 'Human Resources',
    code: 'HR',
    headUserId: '',
    headName: 'Unassigned',
    description: 'Human capital, workforce safety, recruitment, and payroll administration.',
    active: true
  },
  {
    id: 'dept-fin',
    name: 'Finance & Accounts',
    code: 'FIN',
    headUserId: '',
    headName: 'Unassigned',
    description: 'Financial reporting, vendor payments, cash flow, and cost accounting.',
    active: true
  },
  {
    id: 'dept-visa',
    name: 'Visa & Government Relations',
    code: 'VISA',
    headUserId: '',
    headName: 'Unassigned',
    description: 'Work permits, residency visas, labor quotas, and regulatory compliance.',
    active: true
  },
  {
    id: 'dept-it',
    name: 'Information Technology',
    code: 'IT',
    headUserId: '',
    headName: 'Unassigned',
    description: 'ERP systems, telemetry, site connectivity, security, and hardware infrastructure.',
    active: true
  },
  {
    id: 'dept-ops',
    name: 'Operations & Logistics',
    code: 'OPS',
    headUserId: '',
    headName: 'Unassigned',
    description: 'Quarry extraction, sand washing operations, barge transport, and fleet dispatch.',
    active: true
  },
  {
    id: 'dept-maint',
    name: 'Plant & Heavy Maintenance',
    code: 'MAINT',
    headUserId: '',
    headName: 'Unassigned',
    description: 'Mechanical processing plants, crushers, screening units, and heavy earthmoving gear.',
    active: true
  },
  {
    id: 'dept-bd',
    name: 'Business Development',
    code: 'BD',
    headUserId: '',
    headName: 'Unassigned',
    description: 'Bulk sand supply agreements, export contracts, and commercial client relations.',
    active: true
  }
];

// Exactly ONE admin account as requested
export const INITIAL_USERS: User[] = [
  {
    uid: 'user-admin',
    displayName: 'Engr. Ahmed Al-Saeed',
    email: 'admin@abstarsands.com',
    role: 'admin',
    departmentIds: ['dept-hr', 'dept-fin', 'dept-visa', 'dept-it', 'dept-ops', 'dept-maint', 'dept-bd'],
    departmentName: 'Executive Management',
    designation: 'Managing Director & System Administrator',
    active: true,
    createdAt: new Date().toISOString()
  }
];

// No pre-made meetings
export const INITIAL_MEETINGS: Meeting[] = [];

// No pre-made action items
export const INITIAL_ACTIONS: ActionItem[] = [];

// No pre-made submissions
export const INITIAL_SUBMISSIONS: MeetingSubmission[] = [];

// No pre-made proposed items
export const INITIAL_PROPOSED_ITEMS: ProposedAgendaItem[] = [];

// No pre-made follow-ups
export const INITIAL_FOLLOW_UPS: FollowUpUpdate[] = [];

// No pre-made notifications
export const INITIAL_NOTIFICATIONS: any[] = [];
