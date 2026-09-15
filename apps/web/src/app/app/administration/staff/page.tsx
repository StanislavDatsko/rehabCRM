import type { CurrentUserResponse, StaffRole } from '@repo/contracts';
import { listStaff } from '../../../../features/staff/api/staff-api';
import { staffErrorMessage, staffRoleLabel } from '../../../../features/staff/labels';
import { canCreateStaff, canReadStaff } from '../../../../features/staff/permissions';
import { ServerApiError, serverApiFetch } from '../../../../lib/api/server-api-client';

export const dynamic = 'force-dynamic';

const roles: StaffRole[] = ['ORGANIZATION_ADMIN', 'RECEPTIONIST', 'REHABILITATION_SPECIALIST'];

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const me = await serverApiFetch<CurrentUserResponse>('/api/v1/me');
  if (!canReadStaff(me)) return <Forbidden />;
  const raw = await searchParams;
  const one = (key: string) => (typeof raw[key] === 'string' ? (raw[key] as string) : '');
  const page = Math.max(1, Number(one('page')) || 1);
  const role = roles.includes(one('role') as StaffRole) ? (one('role') as StaffRole) : undefined;
  const status = ['ACTIVE', 'DISABLED'].includes(one('status'))
    ? (one('status') as 'ACTIVE' | 'DISABLED')
    : undefined;
  try {
    const list = await listStaff({
      page,
      pageSize: 25,
      search: one('search') || undefined,
      role,
      status,
    });
    return (
      <div className="space-y-6">
        <div className="rc-gradient-brand flex flex-col gap-4 rounded-[1.25rem] p-6 text-white shadow-brand sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="rc-kicker text-white/75">Організація</p>
            <h1 className="mt-1 font-serif text-3xl">Персонал</h1>
            <p className="mt-1 text-sm text-white/80">
              Облікові записи, ролі й доступ працівників організації
            </p>
            <p className="mt-2 text-sm text-white/70">Усього: {list.total}</p>
          </div>
          {canCreateStaff(me) ? (
            <a href="/app/administration/staff/new" className="rc-btn rc-btn-primary">
              Додати працівника
            </a>
          ) : null}
        </div>
        <form className="rc-card grid gap-3 p-4 md:grid-cols-4">
          <label className="text-xs text-text-secondary">
            Пошук
            <input
              name="search"
              defaultValue={one('search')}
              placeholder="Ім’я або email"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs text-text-secondary">
            Роль
            <select
              name="role"
              defaultValue={role ?? ''}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">Усі ролі</option>
              {roles.map((item) => (
                <option key={item} value={item}>
                  {staffRoleLabel(item)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-text-secondary">
            Статус
            <select
              name="status"
              defaultValue={status ?? ''}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">Усі</option>
              <option value="ACTIVE">Активний</option>
              <option value="DISABLED">Вимкнений</option>
            </select>
          </label>
          <div className="flex items-end">
            <button type="submit" className="rc-btn rc-btn-primary">
              Застосувати
            </button>
          </div>
        </form>
        {list.items.length === 0 ? (
          <p className="rounded-md border border-border bg-surface p-6 text-sm text-text-secondary">
            Працівників не знайдено.
          </p>
        ) : (
          <div className="rc-card overflow-x-auto p-0">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border bg-surface-muted text-xs text-text-secondary">
                <tr>
                  <th className="px-4 py-3">Працівник</th>
                  <th className="px-4 py-3">Роль</th>
                  <th className="px-4 py-3">Доступ</th>
                  <th className="px-4 py-3">Налаштування</th>
                  <th className="px-4 py-3">Останній вхід</th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((staff) => (
                  <tr key={staff.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <a
                        href={`/app/administration/staff/${staff.id}`}
                        className="font-medium text-info underline"
                      >
                        {staff.displayName}
                      </a>
                      <div className="text-xs text-text-secondary">{staff.email}</div>
                    </td>
                    <td className="px-4 py-3">{staffRoleLabel(staff.role)}</td>
                    <td className="px-4 py-3">
                      {staff.status === 'ACTIVE' ? 'Активний' : 'Вимкнений'}
                    </td>
                    <td className="px-4 py-3">
                      {staff.setupStatus === 'ACTIVE'
                        ? 'Завершено'
                        : staff.setupStatus === 'PENDING_SETUP'
                          ? 'Очікується'
                          : 'Потрібне повторення'}
                    </td>
                    <td className="px-4 py-3">
                      {staff.lastLoginAt
                        ? new Intl.DateTimeFormat('uk-UA', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          }).format(new Date(staff.lastLoginAt))
                        : 'Ще не входив'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {list.totalPages > 1 ? (
          <nav aria-label="Сторінки персоналу" className="flex gap-3 text-sm">
            <a className="underline" href={`?page=${Math.max(1, page - 1)}`}>
              Попередня
            </a>
            <span>
              {page} / {list.totalPages}
            </span>
            <a className="underline" href={`?page=${Math.min(list.totalPages, page + 1)}`}>
              Наступна
            </a>
          </nav>
        ) : null}
      </div>
    );
  } catch (error) {
    return (
      <div className="space-y-4">
        <h1 className="font-serif text-3xl">Персонал</h1>
        <p role="alert" className="text-danger">
          {staffErrorMessage(error instanceof ServerApiError ? error.body?.code : undefined)}
        </p>
      </div>
    );
  }
}

function Forbidden() {
  return (
    <div className="space-y-4">
      <h1 className="font-serif text-3xl">Персонал</h1>
      <p role="alert" className="rounded-md border border-danger/30 bg-danger/5 p-4 text-danger">
        У вас немає доступу до адміністрування персоналу.
      </p>
    </div>
  );
}
