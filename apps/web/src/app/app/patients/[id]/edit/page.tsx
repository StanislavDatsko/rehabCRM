import type { CurrentUserResponse } from '@repo/contracts';
import { Button } from '@repo/ui/button';
import {
  getPatient,
  listResponsiblePractitioners,
} from '../../../../../features/patients/api/patients-api';
import { PatientForm } from '../../../../../features/patients/components/patient-form';
import {
  PatientsErrorState,
  PatientsForbiddenState,
} from '../../../../../features/patients/components/patients-states';
import { mapApiErrorToMessage } from '../../../../../features/patients/labels';
import { canUpdatePatient } from '../../../../../features/patients/permissions';
import { t } from '../../../../../i18n/messages';
import { ServerApiError, serverApiFetch } from '../../../../../lib/api/server-api-client';

export const dynamic = 'force-dynamic';

export default async function EditPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await serverApiFetch<CurrentUserResponse>('/api/v1/me');
  if (!canUpdatePatient(me)) {
    return (
      <>
        <h1 className="font-serif text-3xl text-text-primary">{t('patientEditTitle')}</h1>
        <div className="mt-6">
          <PatientsForbiddenState />
        </div>
      </>
    );
  }

  const { id } = await params;

  let patient: Awaited<ReturnType<typeof getPatient>>;
  try {
    patient = await getPatient(id);
  } catch (error) {
    const message =
      error instanceof ServerApiError
        ? mapApiErrorToMessage(error.body?.code)
        : mapApiErrorToMessage(undefined);
    return (
      <div className="space-y-4">
        <h1 className="font-serif text-3xl text-text-primary">{t('patientEditTitle')}</h1>
        <PatientsErrorState message={message} />
        <a href="/app/patients" className="text-sm text-info underline">
          {t('patientBackToList')}
        </a>
      </div>
    );
  }

  const practitioners = await listResponsiblePractitioners().catch(() => []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl text-text-primary">{t('patientEditTitle')}</h1>
          <p className="mt-1 text-sm text-text-secondary">{patient.fullName}</p>
        </div>
        <a href={`/app/patients/${patient.id}`}>
          <Button type="button" variant="secondary">
            {t('patientBackToProfile')}
          </Button>
        </a>
      </div>
      <PatientForm
        mode="edit"
        patient={patient}
        practitioners={practitioners}
        cancelHref={`/app/patients/${patient.id}`}
      />
    </div>
  );
}
