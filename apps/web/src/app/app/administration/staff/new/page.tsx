import type { CurrentUserResponse } from '@repo/contracts';
import { StaffForm } from '../../../../../features/staff/components/staff-form';
import { canCreateStaff } from '../../../../../features/staff/permissions';
import { serverApiFetch } from '../../../../../lib/api/server-api-client';

export const dynamic = 'force-dynamic';

export default async function NewStaffPage() {
  const me = await serverApiFetch<CurrentUserResponse>('/api/v1/me');
  if (!canCreateStaff(me)) return <p role="alert">У вас немає доступу до створення працівників.</p>;
  return (
    <div className="space-y-6">
      <div className="rc-atmosphere rounded-3xl p-6 text-white shadow-brand">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-brand-lime">Onboarding · RehabMIS</p>
        <h1 className="mt-2 font-serif text-3xl">Запросити працівника</h1>
        <p className="mt-2 max-w-xl text-sm text-white/75">
          Створіть захищене email-запрошення. Обліковий запис і доступ з’являться після прийняття запрошення.
        </p>
      </div>
      <StaffForm />
    </div>
  );
}
