'use client';

import { ASSIGNABLE_STAFF_ROLES } from '@repo/contracts';
import { Button } from '@repo/ui/button';
import { useActionState } from 'react';
import { createStaffAction, type StaffActionState } from '../actions/staff-actions';
import { staffRoleLabel } from '../labels';

const initial: StaffActionState = { error: null, success: null };

export function StaffForm() {
  const [state, action, pending] = useActionState(createStaffAction, initial);
  return (
    <form action={action} className="space-y-6 rounded-md border border-border bg-surface p-6">
      {state.error ? (
        <p
          role="alert"
          className="rounded-md border border-danger/30 bg-danger/5 p-3 text-sm text-danger"
        >
          {state.error}
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Field id="firstName" label="Ім’я" autoComplete="given-name" required />
        <Field id="lastName" label="Прізвище" autoComplete="family-name" required />
        <Field id="email" label="Email" type="email" autoComplete="email" required />
        <Field id="professionalTitle" label="Професійна посада (для фахівця)" />
        <div className="md:col-span-2">
          <label htmlFor="role" className="block text-xs font-medium text-text-secondary">
            Роль
          </label>
          <select
            id="role"
            name="role"
            required
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            {ASSIGNABLE_STAFF_ROLES.map((role) => (
              <option key={role} value={role}>
                {staffRoleLabel(role)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="rounded-md border border-info/30 bg-info/5 p-4 text-sm text-text-secondary">
        Пароль не створюється й не зберігається в RehabCRM. Працівник отримає захищені інструкції
        від системи ідентифікації для підтвердження email і встановлення пароля.
      </div>
      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Створення…' : 'Створити працівника'}
        </Button>
        <a href="/app/administration/staff" className="rc-btn rc-btn-secondary">
          Скасувати
        </a>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  type = 'text',
  autoComplete,
  required,
}: {
  id: string;
  label: string;
  type?: string;
  autoComplete?: string;
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
        type={type}
        autoComplete={autoComplete}
        required={required}
        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
    </div>
  );
}
