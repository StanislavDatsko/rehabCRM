import type { CurrentUserResponse } from '@repo/contracts';
import { Button } from '@repo/ui/button';
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
        <h1 className="font-serif text-3xl text-text-primary">{t('patientNewTitle')}</h1>
        <div className="mt-6">
          <PatientsForbiddenState />
        </div>
      </>
    );
  }

  const practitioners = await listResponsiblePractitioners().catch(() => []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-serif text-3xl text-text-primary">{t('patientNewTitle')}</h1>
        <a href="/app/patients">
          <Button type="button" variant="secondary">
            {t('patientBackToList')}
          </Button>
        </a>
      </div>
      <PatientForm mode="create" practitioners={practitioners} cancelHref="/app/patients" />
    </div>
  );
}
