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
      <div>
        <h1 className="font-serif text-3xl">Новий працівник</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Створення облікового запису через систему ідентифікації центру
        </p>
      </div>
      <StaffForm />
    </div>
  );
}
