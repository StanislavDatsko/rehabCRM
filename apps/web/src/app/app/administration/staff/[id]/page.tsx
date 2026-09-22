import type { CurrentUserResponse } from '@repo/contracts';
import { getStaff, getStaffHistory } from '../../../../../features/staff/api/staff-api';
import { StaffProfileActions } from '../../../../../features/staff/components/staff-profile-actions';
import { staffErrorMessage, staffRoleLabel } from '../../../../../features/staff/labels';
import { canReadStaff, canUpdateStaff, canChangeStaffRole, canDisableStaff, canEnableStaff, canRevokeStaffSessions } from '../../../../../features/staff/permissions';
import { ServerApiError, serverApiFetch } from '../../../../../lib/api/server-api-client';
import { PageHeader, StatusPill } from '@repo/ui/workspace';

export const dynamic = 'force-dynamic';

export default async function StaffProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const me = await serverApiFetch<CurrentUserResponse>('/api/v1/me');
  if (!canReadStaff(me))
    return <p role="alert">У вас немає доступу до адміністрування персоналу.</p>;
  const { id } = await params;
  try {
    const [staff, history] = await Promise.all([getStaff(id), getStaffHistory(id)]);
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Команда · Профіль" title={staff.displayName} description={`${staff.email} · ${staffRoleLabel(staff.role)}`} actions={<a href="/app/administration/staff" className="rc-btn rc-btn-secondary">← До списку</a>} metadata={<StatusPill tone={staff.status === 'ACTIVE' ? 'success' : 'neutral'}>{staff.status === 'ACTIVE' ? 'Активний' : 'Вимкнений'}</StatusPill>} />
        <dl className="ui-filter-bar grid gap-4 p-5 sm:grid-cols-4">
          <Info label="Статус" value={staff.status === 'ACTIVE' ? 'Активний' : 'Вимкнений'} />
          <Info
            label="Налаштування"
            value={
              staff.setupStatus === 'ACTIVE'
                ? 'Завершено'
                : staff.setupStatus === 'PENDING_SETUP'
                  ? 'Очікується'
                  : 'Помилка надсилання'
            }
          />
          <Info
            label="Останній вхід"
            value={
              staff.lastLoginAt
                ? new Intl.DateTimeFormat('uk-UA', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }).format(new Date(staff.lastLoginAt))
                : 'Ще не входив'
            }
          />
          <Info
            label="Створено"
            value={new Intl.DateTimeFormat('uk-UA', { dateStyle: 'medium' }).format(
              new Date(staff.createdAt),
            )}
          />
        </dl>
        <StaffProfileActions staff={staff} capabilities={{ canUpdate: canUpdateStaff(me), canChangeRole: canChangeStaffRole(me), canDisable: canDisableStaff(me), canEnable: canEnableStaff(me), canRevokeSessions: canRevokeStaffSessions(me), canResendSetup: canUpdateStaff(me) }} />
        <section className="ui-filter-bar">
          <h2 className="font-sans text-lg">Історія доступу</h2>
          {history.length === 0 ? (
            <p className="mt-3 text-sm text-text-secondary">Подій ще немає.</p>
          ) : (
            <ol className="mt-4 space-y-3">
              {history.map((event) => (
                <li key={event.id} className="border-l-2 border-border pl-3 text-sm">
                  <p className="font-medium">{historyLabel(event.action)}</p>
                  <p className="text-xs text-text-secondary">
                    {new Intl.DateTimeFormat('uk-UA', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(event.occurredAt))}{' '}
                    · {event.actor.displayName}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    );
  } catch (error) {
    return (
      <div className="space-y-4">
        <h1 className="font-sans text-3xl">Профіль працівника</h1>
        <p role="alert" className="text-danger">
          {staffErrorMessage(error instanceof ServerApiError ? error.body?.code : undefined)}
        </p>
      </div>
    );
  }
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-text-secondary">{label}</dt>
      <dd className="mt-1 text-sm font-medium">{value}</dd>
    </div>
  );
}
function historyLabel(action: string) {
  return (
    (
      {
        STAFF_CREATED: 'Обліковий запис створено',
        STAFF_PROFILE_UPDATED: 'Профіль оновлено',
        STAFF_ROLE_CHANGED: 'Роль змінено',
        STAFF_DISABLED: 'Доступ вимкнено',
        STAFF_ENABLED: 'Доступ увімкнено',
        STAFF_SESSIONS_REVOKED: 'Сеанси завершено',
        STAFF_SETUP_ACTIONS_RESENT: 'Налаштування надіслано повторно',
      } as Record<string, string>
    )[action] ?? action
  );
}
