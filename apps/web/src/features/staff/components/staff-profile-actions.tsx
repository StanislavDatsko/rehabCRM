'use client';

import { ASSIGNABLE_STAFF_ROLES, type StaffResponse } from '@repo/contracts';
import { Button } from '@repo/ui/button';
import { useActionState } from 'react';
import {
  changeStaffRoleAction,
  disableStaffAction,
  enableStaffAction,
  resendStaffSetupAction,
  revokeStaffSessionsAction,
  updateStaffAction,
  type StaffActionState,
} from '../actions/staff-actions';
import { staffRoleLabel } from '../labels';

const initial: StaffActionState = { error: null, success: null };

function Feedback({ state }: { state: StaffActionState }) {
  if (!state.error && !state.success) return null;
  return (
    <p
      role={state.error ? 'alert' : 'status'}
      className={`rounded-md border p-3 text-sm ${state.error ? 'border-danger/30 bg-danger/5 text-danger' : 'border-success/30 bg-success/5 text-text-primary'}`}
    >
      {state.error ?? state.success}
    </p>
  );
}

function IdentityFields({ staff }: { staff: StaffResponse }) {
  return (
    <>
      <input type="hidden" name="staffId" value={staff.id} />
      <input type="hidden" name="version" value={staff.version} />
    </>
  );
}

export function StaffProfileActions({ staff }: { staff: StaffResponse }) {
  const [profileState, profileAction, profilePending] = useActionState(updateStaffAction, initial);
  const [roleState, roleAction, rolePending] = useActionState(changeStaffRoleAction, initial);
  const lifecycleAction = staff.status === 'ACTIVE' ? disableStaffAction : enableStaffAction;
  const [lifecycleState, lifecycleFormAction, lifecyclePending] = useActionState(
    lifecycleAction,
    initial,
  );
  const [sessionState, sessionAction, sessionPending] = useActionState(
    revokeStaffSessionsAction,
    initial,
  );
  const [setupState, setupAction, setupPending] = useActionState(resendStaffSetupAction, initial);

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <form
        action={profileAction}
        className="space-y-4 rounded-md border border-border bg-surface p-5"
      >
        <IdentityFields staff={staff} />
        <h2 className="font-serif text-lg">Профіль</h2>
        <Feedback state={profileState} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="firstName" label="Ім’я" defaultValue={staff.firstName} required />
          <Field id="lastName" label="Прізвище" defaultValue={staff.lastName} required />
          <div className="sm:col-span-2">
            <Field
              id="professionalTitle"
              label="Професійна посада"
              defaultValue={staff.professionalTitle ?? ''}
            />
          </div>
        </div>
        <p className="text-xs text-text-secondary">
          Email керується системою ідентифікації та не редагується тут.
        </p>
        <Button type="submit" disabled={profilePending}>
          Зберегти профіль
        </Button>
      </form>

      <div className="space-y-6">
        <form
          action={roleAction}
          className="space-y-3 rounded-md border border-border bg-surface p-5"
        >
          <IdentityFields staff={staff} />
          <h2 className="font-serif text-lg">Роль і клінічний профіль</h2>
          <Feedback state={roleState} />
          <label htmlFor="staff-role" className="block text-xs font-medium text-text-secondary">
            Роль
          </label>
          <select
            id="staff-role"
            name="role"
            defaultValue={staff.role}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            {ASSIGNABLE_STAFF_ROLES.map((role) => (
              <option key={role} value={role}>
                {staffRoleLabel(role)}
              </option>
            ))}
          </select>
          <Button type="submit" disabled={rolePending}>
            Змінити роль
          </Button>
        </form>

        <section className="space-y-4 rounded-md border border-border bg-surface p-5">
          <h2 className="font-serif text-lg">Доступ і сеанси</h2>
          {staff.identitySyncPending ? (
            <p
              role="alert"
              className="rounded-md border border-warning/30 bg-warning/5 p-3 text-sm"
            >
              Зміна збережена локально, але синхронізація з системою ідентифікації потребує
              повторної перевірки.
            </p>
          ) : null}
          <Feedback state={lifecycleState} />
          <Feedback state={sessionState} />
          <Feedback state={setupState} />
          <div className="flex flex-wrap gap-3">
            <form action={lifecycleFormAction}>
              <IdentityFields staff={staff} />
              <Button type="submit" variant="secondary" disabled={lifecyclePending}>
                {staff.status === 'ACTIVE' ? 'Вимкнути доступ' : 'Увімкнути доступ'}
              </Button>
            </form>
            <form action={sessionAction}>
              <input type="hidden" name="staffId" value={staff.id} />
              <Button type="submit" variant="secondary" disabled={sessionPending}>
                Завершити всі сеанси
              </Button>
            </form>
            <form action={setupAction}>
              <input type="hidden" name="staffId" value={staff.id} />
              <Button type="submit" variant="secondary" disabled={setupPending}>
                Повторити налаштування
              </Button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  defaultValue,
  required,
}: {
  id: string;
  label: string;
  defaultValue: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-text-secondary">
        {label}
      </label>
      <input
        id={id}
        name={id}
        defaultValue={defaultValue}
        required={required}
        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
    </div>
  );
}
