import type { CurrentUserResponse } from '@repo/contracts';
import { Avatar } from '@repo/ui/workspace';
import { canReadClinicalReports, canReadClinicalTimeline, canReadProgress } from '../../progress/permissions';
import { canReadPlans } from '../permissions';

export type PatientRehabTab = 'plans' | 'progress' | 'reports';

/**
 * Compact header for the "rehabilitation view" of one patient: only plans, clinical
 * dynamics and reports, without the rest of the patient card.
 */
export function PatientRehabTabs({
  user,
  patientId,
  patientName,
  active,
}: {
  user: CurrentUserResponse;
  patientId: string;
  patientName: string;
  active: PatientRehabTab;
}) {
  const tabs: { id: PatientRehabTab; label: string; href: string; allowed: boolean }[] = [
    { id: 'plans', label: 'Плани', href: `/app/patients/${patientId}/rehabilitation`, allowed: canReadPlans(user) },
    {
      id: 'progress',
      label: 'Клінічна динаміка',
      href: `/app/patients/${patientId}/progress`,
      allowed: canReadProgress(user) && canReadClinicalTimeline(user),
    },
    { id: 'reports', label: 'Звіти', href: `/app/patients/${patientId}/reports`, allowed: canReadClinicalReports(user) },
  ];
  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={patientName} />
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-text-secondary">Реабілітація пацієнта</p>
            <p className="truncate text-lg font-semibold">{patientName}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <a className="text-info underline" href="/app/rehabilitation-plans">
            ← Інший пацієнт
          </a>
          <a className="text-info underline" href={`/app/patients/${patientId}`}>
            Уся картка пацієнта
          </a>
        </div>
      </div>
      <nav aria-label="Розділи реабілітації" className="flex flex-wrap gap-2 border-b border-border">
        {tabs
          .filter((tab) => tab.allowed)
          .map((tab) => (
            <a
              key={tab.id}
              href={tab.href}
              aria-current={tab.id === active ? 'page' : undefined}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                tab.id === active
                  ? 'border-accent text-text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab.label}
            </a>
          ))}
      </nav>
    </div>
  );
}
