import { PERMISSIONS, hasPermission, type CurrentUserResponse } from '@repo/contracts';
import { t } from '../../i18n/messages';
import { serverApiFetch } from '../../lib/api/server-api-client';

export const dynamic = 'force-dynamic';

export default async function AppHomePage() {
  const me = await serverApiFetch<CurrentUserResponse>('/api/v1/me');

  const actions = [
    hasPermission(me.permissions, PERMISSIONS.PATIENT_READ_ADMIN) ? ['/app/patients', 'Відкрити пацієнтів', 'Перегляд карт і клінічної історії'] : null,
    hasPermission(me.permissions, PERMISSIONS.APPOINTMENT_READ) ? ['/app/calendar', 'Переглянути календар', 'Заплановані зустрічі команди'] : null,
    hasPermission(me.permissions, PERMISSIONS.ANATOMY_READ) ? ['/app/anatomy', 'Відкрити 3D анатомію', 'Дослідження Human Atlas'] : null,
    hasPermission(me.permissions, PERMISSIONS.STAFF_READ) ? ['/app/administration/staff', 'Керувати персоналом', 'Ролі, доступ і запрошення'] : null,
  ].filter((value): value is [string, string, string] => Boolean(value));
  return <div className="space-y-8">
    <section className="rc-atmosphere overflow-hidden rounded-3xl p-8 text-white shadow-brand lg:p-10"><p className="text-xs font-bold uppercase tracking-[.16em] text-brand-lime">RehabMIS · {me.organization.name}</p><h1 className="mt-3 font-serif text-4xl">Керуйте реабілітацією як єдиним процесом.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-white/75">Вітаємо, {me.displayName}. Ваш робочий простір готовий до наступного клінічного кроку.</p></section>
    <dl className="grid gap-4 sm:grid-cols-3"><div className="rc-card p-5"><dt className="rc-kicker">{t('labelOrganization')}</dt><dd className="mt-2 text-lg font-semibold text-text-primary">{me.organization.name}</dd></div><div className="rc-card p-5"><dt className="rc-kicker">{t('labelStaff')}</dt><dd className="mt-2 text-lg font-semibold text-text-primary">{me.displayName}</dd></div><div className="rc-card p-5"><dt className="rc-kicker">{t('labelRole')}</dt><dd className="mt-2 text-lg font-semibold text-info">{me.role}</dd></div></dl>
    <section><div className="mb-4"><p className="rc-kicker">Швидкий доступ</p><h2 className="mt-1 font-serif text-2xl">Продовжити роботу</h2></div><div className="grid gap-4 md:grid-cols-2">{actions.map(([href, title, description]) => <a key={href} href={href} className="rc-card group p-5 hover:-translate-y-1"><p className="font-semibold text-text-primary group-hover:text-info">{title} →</p><p className="mt-2 text-sm text-text-secondary">{description}</p></a>)}</div></section>
  </div>;
}
