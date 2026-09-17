import type { StaffRole } from './permissions';

export const ASSIGNABLE_STAFF_ROLES = [
  'ORGANIZATION_ADMIN',
  'REHABILITATION_SPECIALIST',
] as const;

export const STAFF_SETUP_STATUSES = ['PENDING_SETUP', 'ACTIVE', 'SETUP_ACTION_FAILED'] as const;

export type AssignableStaffRole = (typeof ASSIGNABLE_STAFF_ROLES)[number];
export type StaffSetupStatus = (typeof STAFF_SETUP_STATUSES)[number];
export type StaffMembershipStatus = 'ACTIVE' | 'DISABLED';

export type StaffResponse = {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  role: StaffRole;
  status: StaffMembershipStatus;
  setupStatus: StaffSetupStatus;
  identitySyncPending: boolean;
  professionalTitle: string | null;
  lastLoginAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type StaffListResponse = {
  items: StaffResponse[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type StaffHistoryAction =
  | 'STAFF_CREATED'
  | 'STAFF_PROFILE_UPDATED'
  | 'STAFF_ROLE_CHANGED'
  | 'STAFF_DISABLED'
  | 'STAFF_ENABLED'
  | 'STAFF_SESSIONS_REVOKED'
  | 'STAFF_SETUP_ACTIONS_RESENT';

export type StaffHistoryItem = {
  id: string;
  action: StaffHistoryAction;
  occurredAt: string;
  actor: { id: string; displayName: string };
  changedFields: string[];
  roleChange?: { from: StaffRole; to: StaffRole };
  statusChange?: { from: StaffMembershipStatus; to: StaffMembershipStatus };
};
