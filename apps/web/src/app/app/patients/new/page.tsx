import type { CurrentUserResponse } from '@repo/contracts';
import { PageHeader } from '@repo/ui/workspace';
import { listResponsiblePractitioners } from '../../../../features/patients/api/patients-api';
import { PatientForm } from '../../../../features/patients/components/patient-form';
import { PatientsForbiddenState } from '../../../../features/patients/components/patients-states';
import { canCreatePatient } from '../../../../features/patients/permissions';
import { t } from '../../../../i18n/messages';
import { serverApiFetch } from '../../../../lib/api/server-api-client';

export const dynamic = 'force-dynamic';

export default async function NewPatientPage() {
  const me = await serverApiFetch<CurrentUserResponse>('/api/v1/me');
  if (!canCreatePatient(me)) {
    return (
      <>
        <h1 className="font-sans text-3xl text-text-primary">{t('patientNewTitle')}</h1>
        <div className="mt-6">
          <PatientsForbiddenState />
        </div>
      </>
    );
  }

  const practitioners = await listResponsiblePractitioners().catch(() => []);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Клінічна практика" title={t('patientNewTitle')} description="Створіть картку пацієнта з ключовими адміністративними та care-командними даними." actions={<a className="rc-btn rc-btn-secondary" href="/app/patients">{t('patientBackToList')}</a>} />
      <PatientForm mode="create" practitioners={practitioners} cancelHref="/app/patients" />
    </div>
  );
}
