import { Avatar, PageHeader, StatusPill } from '@repo/ui/workspace';
import type { CurrentUserResponse, StaffRole } from '@repo/contracts';
import { listStaff, listStaffInvitations } from '../../../../features/staff/api/staff-api';
import { staffErrorMessage, staffRoleLabel } from '../../../../features/staff/labels';
import { canCreateStaff, canReadStaff } from '../../../../features/staff/permissions';
import { ServerApiError, serverApiFetch } from '../../../../lib/api/server-api-client';

export const dynamic = 'force-dynamic';

const roles: StaffRole[] = ['ORGANIZATION_ADMIN', 'REHABILITATION_SPECIALIST'];

function invitationStatus(status: string) {
  const labels: Record<string, string> = { PENDING: 'Очікує прийняття', ACCEPTED: 'Прийнято', EXPIRED: 'Прострочене', DELIVERY_FAILED: 'Не доставлено', REVOKED: 'Відкликане' };
  return labels[status] ?? status;
}

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
  const createdNotice = one('created') === '1' ? (one('delivery') === 'failed' ? 'Працівника створено, але email-запрошення не доставлено. Перевірте налаштування пошти.' : 'Запрошення працівнику створено та надіслано.') : null;
  try {
    const [list, invitations] = await Promise.all([listStaff({
      page,
      pageSize: 25,
      search: one('search') || undefined,
      role,
      status,
    }), listStaffInvitations()]);
    return (
      <div className="space-y-6">
        {createdNotice ? <p role="status" className="ui-inline-notice ui-inline-notice-success">{createdNotice}</p> : null}
        <PageHeader eyebrow="Організація" title="Команда" description="Співробітники, ролі та доступ до вашої практики." metadata={<span className="ui-count">{list.total}</span>} actions={canCreateStaff(me) ? <a href="/app/administration/staff/new" className="rc-btn rc-btn-primary">+ Запросити працівника</a> : null} />
        <form className="ui-filter-bar grid gap-3 md:grid-cols-4">
          <label className="text-xs text-text-secondary">
            Пошук
            <input
              name="search"
              defaultValue={one('search')}
              placeholder="Ім’я або email"
              className="field mt-1 w-full"
            />
          </label>
          <label className="text-xs text-text-secondary">
            Роль
            <select
              name="role"
              defaultValue={role ?? ''}
              className="field mt-1 w-full"
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
              className="field mt-1 w-full"
            >
              <option value="">Усі</option>
              <option value="ACTIVE">Активний</option>
              <option value="DISABLED">Вимкнений</option>
            </select>
          </label>
          <div className="flex items-end">
            <button type="submit" className="rc-btn rc-btn-secondary w-full md:w-auto">
              Застосувати
            </button>
          </div>
        </form>
        {list.items.length === 0 ? (
          <p className="ui-filter-bar text-sm text-text-secondary">
            Працівників не знайдено.
          </p>
        ) : (
          <div className="ui-table-container">
            <table className="ui-data-table min-w-full text-left text-sm">
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
                  <tr key={staff.id} className="border-b border-border last:border-0 hover:bg-surface-muted/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3"><Avatar name={staff.displayName} /><div><a
                        href={`/app/administration/staff/${staff.id}`}
                        className="font-medium text-info underline"
                      >
                        {staff.displayName}
                      </a>
                      <div className="text-xs text-text-secondary">{staff.email}</div></div></div>
                    </td>
                    <td className="px-4 py-3">{staffRoleLabel(staff.role)}</td>
                    <td className="px-4 py-3">
                      <StatusPill tone={staff.status === 'ACTIVE' ? 'success' : 'neutral'}>{staff.status === 'ACTIVE' ? 'Активний' : 'Вимкнений'}</StatusPill>
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
        {invitations.length > 0 ? <section className="ui-filter-bar"><div className="flex items-baseline justify-between"><div><p className="rc-kicker">Onboarding</p><h2 className="mt-1 text-lg font-semibold tracking-tight">Запрошення</h2></div><span className="ui-count">{invitations.length}</span></div><div className="mt-4 grid gap-3 md:grid-cols-2">{invitations.map((invitation) => <div key={invitation.id} className="border-b border-border p-4 last:border-b-0"><div className="flex items-start justify-between gap-3"><div><p className="font-medium text-text-primary">{invitation.firstName} {invitation.lastName}</p><p className="text-sm text-text-secondary">{invitation.email}</p></div><StatusPill tone={invitation.status === 'ACCEPTED' ? 'success' : invitation.status === 'DELIVERY_FAILED' ? 'danger' : invitation.status === 'PENDING' ? 'warning' : 'neutral'}>{invitationStatus(invitation.status)}</StatusPill></div><p className="mt-3 text-xs text-text-secondary">Дійсне до {new Intl.DateTimeFormat('uk-UA', { dateStyle: 'medium' }).format(new Date(invitation.expiresAt))}</p></div>)}</div></section> : null}
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
        <h1 className="font-sans text-3xl">Персонал</h1>
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
      <h1 className="font-sans text-3xl">Персонал</h1>
      <p role="alert" className="rounded-md border border-danger/30 bg-danger/5 p-4 text-danger">
        У вас немає доступу до адміністрування персоналу.
      </p>
    </div>
  );
}
