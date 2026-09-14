import type { ReactNode } from 'react';
import { Button } from '@repo/ui/button';
import type { CurrentUserResponse } from '@repo/contracts';
import { t } from '../../i18n/messages';
import { logoutStaff } from '../auth/actions';
import { canSeeNavItem, initials, staffNav } from './navigation';

function roleLabel(role: CurrentUserResponse['role']): string {
  switch (role) {
    case 'RECEPTIONIST':
      return t('roleReceptionist');
    case 'REHABILITATION_SPECIALIST':
      return t('roleSpecialist');
    case 'ORGANIZATION_ADMIN':
      return t('roleOrgAdmin');
    case 'SYSTEM_ADMIN':
      return t('roleSystemAdmin');
    default:
      return role;
  }
}

export function StaffShell({
  user,
  children,
}: {
  user: CurrentUserResponse;
  children: ReactNode;
}) {
  const visibleNav = staffNav.filter((item) => canSeeNavItem(user, item));

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 flex-col border-r border-border bg-surface">
        <div className="border-b border-border px-5 py-5">
          <p className="font-serif text-xl text-text-primary">{t('productName')}</p>
          <p className="mt-1 text-xs text-text-secondary">{user.organization.name}</p>
        </div>
        <nav aria-label={t('mainNav')} className="flex-1 px-3 py-4">
          <ul className="space-y-1">
            {visibleNav.map((item) => (
              <li key={item.id}>
                <a
                  href={item.href}
                  aria-disabled={!item.enabled}
                  className={`block rounded-md px-3 py-2 text-sm ${
                    item.enabled
                      ? 'text-text-primary hover:bg-surface-muted'
                      : 'cursor-not-allowed text-text-secondary'
                  }`}
                >
                  {t(item.labelKey)}
                  {!item.enabled ? (
                    <span className="ml-2 text-xs">({t('comingSoon')})</span>
                  ) : null}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t border-border px-4 py-4">
          <div className="flex items-center gap-3">
            <div
              aria-hidden="true"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-muted text-xs font-semibold text-text-primary"
            >
              {initials(user.displayName)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-text-primary">{user.displayName}</p>
              <p className="truncate text-xs text-text-secondary">{roleLabel(user.role)}</p>
            </div>
          </div>
          <form action={logoutStaff} className="mt-4">
            <Button type="submit" variant="secondary">
              {t('logout')}
            </Button>
          </form>
        </div>
      </aside>
      <div className="flex-1 bg-background">
        <header className="border-b border-border bg-surface px-8 py-4">
          <p className="text-sm text-text-secondary">{user.organization.name}</p>
        </header>
        <main id="main" className="px-8 py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
