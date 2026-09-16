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

export function StaffShell({ user, children }: { user: CurrentUserResponse; children: ReactNode }) {
  const visibleNav = staffNav.filter((item) => canSeeNavItem(user, item));

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="flex w-72 flex-col border-r border-border bg-surface">
        <div className="border-b border-border px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="rc-gradient-brand flex h-10 w-10 items-center justify-center rounded-xl text-lg font-bold text-white shadow-brand">
              R
            </div>
            <div>
              <p className="font-serif text-xl text-text-primary">{t('productName')}</p>
              <p className="mt-0.5 text-xs text-text-secondary">{user.organization.name}</p>
            </div>
          </div>
        </div>
        <nav aria-label={t('mainNav')} className="flex-1 px-3 py-4">
          <ul className="space-y-1">
            {visibleNav.map((item) => (
              <li key={item.id}>
                <a
                  href={item.href}
                  aria-disabled={!item.enabled}
                  className={`block rounded-lg px-3 py-2.5 text-sm font-medium ${
                    item.enabled
                      ? 'text-text-primary hover:bg-surface-muted hover:text-info'
                      : 'cursor-not-allowed text-text-secondary'
                  }`}
                >
                  {t(item.labelKey)}
                  {!item.enabled ? <span className="ml-2 text-xs">({t('comingSoon')})</span> : null}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t border-border px-4 py-4">
          <div className="flex items-center gap-3">
            <div
              aria-hidden="true"
              className="rc-gradient-brand flex h-10 w-10 items-center justify-center rounded-xl text-xs font-semibold text-white"
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
        <header className="flex items-center justify-between border-b border-border bg-surface/90 px-8 py-5 backdrop-blur">
          <div>
            <p className="rc-kicker">Clinical workspace</p>
            <p className="mt-1 text-sm text-text-secondary">{user.organization.name}</p>
          </div>
          <div
            role="status"
            className="h-2 w-2 rounded-full bg-brand-lime shadow-[0_0_0_4px_rgb(154_205_50_/_0.15)]"
            aria-label="Online"
          />
        </header>
        <main id="main" className="px-6 py-8 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
