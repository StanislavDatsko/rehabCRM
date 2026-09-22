import type { CurrentUserResponse } from '@repo/contracts';
import { StaffForm } from '../../../../../features/staff/components/staff-form';
import { canCreateStaff } from '../../../../../features/staff/permissions';
import { serverApiFetch } from '../../../../../lib/api/server-api-client';
import { PageHeader } from '@repo/ui/workspace';

export const dynamic = 'force-dynamic';

export default async function NewStaffPage() {
  const me = await serverApiFetch<CurrentUserResponse>('/api/v1/me');
  if (!canCreateStaff(me)) return <p role="alert">У вас немає доступу до створення працівників.</p>;
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Onboarding · RehabMIS" title="Запросити працівника" description="Створіть захищене email-запрошення. Обліковий запис і доступ з’являться після прийняття запрошення." />
      <StaffForm />
    </div>
  );
}
