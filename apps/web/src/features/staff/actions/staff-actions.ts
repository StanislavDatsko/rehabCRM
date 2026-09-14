'use server';

import { ASSIGNABLE_STAFF_ROLES, type AssignableStaffRole } from '@repo/contracts';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ServerApiError } from '../../../lib/api/server-api-client';
import { loadCurrentUser } from '../../../lib/app/load-current-user';
import {
  changeStaffRole,
  createStaff,
  disableStaff,
  enableStaff,
  resendStaffSetup,
  revokeStaffSessions,
  updateStaff,
} from '../api/staff-api';
import { staffErrorMessage } from '../labels';
import {
  canChangeStaffRole,
  canCreateStaff,
  canDisableStaff,
  canEnableStaff,
  canRevokeStaffSessions,
  canUpdateStaff,
} from '../permissions';

export type StaffActionState = { error: string | null; success: string | null };

const value = (formData: FormData, key: string) => {
  const raw = formData.get(key);
  return typeof raw === 'string' ? raw.trim() : '';
};

function role(value: string): AssignableStaffRole | null {
  return (ASSIGNABLE_STAFF_ROLES as readonly string[]).includes(value)
    ? (value as AssignableStaffRole)
    : null;
}

function apiError(error: unknown): StaffActionState {
  return {
    error: staffErrorMessage(error instanceof ServerApiError ? error.body?.code : undefined),
    success: null,
  };
}

async function current() {
  const me = await loadCurrentUser();
  if (me === 'unauthenticated') redirect('/login?reason=expired');
  if (me === 'denied') redirect('/login?reason=denied');
  return me;
}

export async function createStaffAction(
  _state: StaffActionState,
  formData: FormData,
): Promise<StaffActionState> {
  const me = await current();
  if (!canCreateStaff(me)) return apiError(new ServerApiError(403, null));
  const selectedRole = role(value(formData, 'role'));
  const body = {
    email: value(formData, 'email'),
    firstName: value(formData, 'firstName'),
    lastName: value(formData, 'lastName'),
    role: selectedRole,
    professionalTitle: value(formData, 'professionalTitle') || null,
  };
  if (!body.email || !body.firstName || !body.lastName || !body.role) {
    return { error: staffErrorMessage('VALIDATION_FAILED'), success: null };
  }
  let createdId: string;
  try {
    createdId = (await createStaff({ ...body, role: body.role })).id;
  } catch (error) {
    return apiError(error);
  }
  revalidatePath('/app/administration/staff');
  redirect(`/app/administration/staff/${createdId}?created=1`);
}

export async function updateStaffAction(
  _state: StaffActionState,
  formData: FormData,
): Promise<StaffActionState> {
  const me = await current();
  if (!canUpdateStaff(me)) return apiError(new ServerApiError(403, null));
  const id = value(formData, 'staffId');
  const version = Number(value(formData, 'version'));
  if (!id || !Number.isInteger(version)) return apiError(new Error());
  try {
    await updateStaff(id, {
      firstName: value(formData, 'firstName'),
      lastName: value(formData, 'lastName'),
      professionalTitle: value(formData, 'professionalTitle') || null,
      version,
    });
  } catch (error) {
    return apiError(error);
  }
  revalidatePath(`/app/administration/staff/${id}`);
  revalidatePath('/app/administration/staff');
  return { error: null, success: 'Профіль оновлено.' };
}

export async function changeStaffRoleAction(
  _state: StaffActionState,
  formData: FormData,
): Promise<StaffActionState> {
  const me = await current();
  if (!canChangeStaffRole(me)) return apiError(new ServerApiError(403, null));
  const id = value(formData, 'staffId');
  const version = Number(value(formData, 'version'));
  const selectedRole = role(value(formData, 'role'));
  if (!id || !selectedRole || !Number.isInteger(version)) return apiError(new Error());
  try {
    await changeStaffRole(id, selectedRole, version);
  } catch (error) {
    return apiError(error);
  }
  revalidatePath(`/app/administration/staff/${id}`);
  revalidatePath('/app/administration/staff');
  return { error: null, success: 'Роль оновлено.' };
}

async function lifecycle(
  formData: FormData,
  operation: typeof disableStaff,
  allowed: boolean,
  success: string,
): Promise<StaffActionState> {
  if (!allowed) return apiError(new ServerApiError(403, null));
  const id = value(formData, 'staffId');
  const version = Number(value(formData, 'version'));
  if (!id || !Number.isInteger(version)) return apiError(new Error());
  try {
    await operation(id, version);
  } catch (error) {
    return apiError(error);
  }
  revalidatePath(`/app/administration/staff/${id}`);
  revalidatePath('/app/administration/staff');
  return { error: null, success };
}

export async function disableStaffAction(_state: StaffActionState, formData: FormData) {
  const me = await current();
  return lifecycle(formData, disableStaff, canDisableStaff(me), 'Доступ працівника вимкнено.');
}

export async function enableStaffAction(_state: StaffActionState, formData: FormData) {
  const me = await current();
  return lifecycle(formData, enableStaff, canEnableStaff(me), 'Доступ працівника ввімкнено.');
}

export async function revokeStaffSessionsAction(
  _state: StaffActionState,
  formData: FormData,
): Promise<StaffActionState> {
  const me = await current();
  if (!canRevokeStaffSessions(me)) return apiError(new ServerApiError(403, null));
  const id = value(formData, 'staffId');
  try {
    await revokeStaffSessions(id);
  } catch (error) {
    return apiError(error);
  }
  return { error: null, success: 'Усі активні сеанси завершено.' };
}

export async function resendStaffSetupAction(
  _state: StaffActionState,
  formData: FormData,
): Promise<StaffActionState> {
  const me = await current();
  if (!canUpdateStaff(me)) return apiError(new ServerApiError(403, null));
  const id = value(formData, 'staffId');
  try {
    await resendStaffSetup(id);
  } catch (error) {
    return apiError(error);
  }
  revalidatePath(`/app/administration/staff/${id}`);
  return { error: null, success: 'Інструкції з налаштування надіслано повторно.' };
}
