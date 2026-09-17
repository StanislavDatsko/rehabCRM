import 'server-only';

import type {
  AssignableStaffRole,
  StaffHistoryItem,
  StaffListResponse,
  StaffResponse,
  StaffRole,
} from '@repo/contracts';
import { serverApiFetch } from '../../../lib/api/server-api-client';

export type StaffListQuery = {
  page: number;
  pageSize: number;
  search?: string;
  role?: StaffRole;
  status?: 'ACTIVE' | 'DISABLED';
};

export type CreateStaffInput = {
  email: string;
  firstName: string;
  lastName: string;
  role: AssignableStaffRole;
  professionalTitle?: string | null;
};
export type StaffInvitationListItem = { id: string; email: string; firstName: string; lastName: string; role: StaffRole; status: string; expiresAt: string; createdAt: string };

function jsonInit(method: string, body?: unknown): RequestInit {
  return {
    method,
    ...(body === undefined
      ? {}
      : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
  };
}

export async function listStaff(query: StaffListQuery): Promise<StaffListResponse> {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  });
  if (query.search) params.set('search', query.search);
  if (query.role) params.set('role', query.role);
  if (query.status) params.set('status', query.status);
  return serverApiFetch<StaffListResponse>(`/api/v1/staff?${params.toString()}`);
}
export const listStaffInvitations = () => serverApiFetch<StaffInvitationListItem[]>('/api/v1/staff/invitations');

export const getStaff = (id: string) => serverApiFetch<StaffResponse>(`/api/v1/staff/${id}`);
export const getStaffHistory = (id: string) =>
  serverApiFetch<StaffHistoryItem[]>(`/api/v1/staff/${id}/history`);
export const createStaff = (body: CreateStaffInput) =>
  serverApiFetch<StaffResponse>('/api/v1/staff', jsonInit('POST', body));
export const updateStaff = (
  id: string,
  body: { firstName: string; lastName: string; professionalTitle: string | null; version: number },
) => serverApiFetch<StaffResponse>(`/api/v1/staff/${id}`, jsonInit('PATCH', body));
export const changeStaffRole = (id: string, role: AssignableStaffRole, version: number) =>
  serverApiFetch<StaffResponse>(
    `/api/v1/staff/${id}/change-role`,
    jsonInit('POST', { role, version }),
  );
export const disableStaff = (id: string, version: number) =>
  serverApiFetch<StaffResponse>(`/api/v1/staff/${id}/disable`, jsonInit('POST', { version }));
export const enableStaff = (id: string, version: number) =>
  serverApiFetch<StaffResponse>(`/api/v1/staff/${id}/enable`, jsonInit('POST', { version }));
export const revokeStaffSessions = (id: string) =>
  serverApiFetch<void>(`/api/v1/staff/${id}/sessions/revoke`, jsonInit('POST'));
export const resendStaffSetup = (id: string) =>
  serverApiFetch<{ id: string; status: string }>(`/api/v1/staff/${id}/invitation/resend`, jsonInit('POST'));
