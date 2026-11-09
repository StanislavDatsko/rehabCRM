import type { CurrentUserResponse } from '@repo/contracts';
import { PageHeader } from '@repo/ui/workspace';
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
import { canChangePatientStatus, canUpdatePatient } from '../../../../../features/patients/permissions';
import { t } from '../../../../../i18n/messages';
import { ServerApiError, serverApiFetch } from '../../../../../lib/api/server-api-client';

export const dynamic = 'force-dynamic';

export default async function EditPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await serverApiFetch<CurrentUserResponse>('/api/v1/me');
  if (!canUpdatePatient(me)) {
    return (
      <>
        <h1 className="font-sans text-3xl text-text-primary">{t('patientEditTitle')}</h1>
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
        <h1 className="font-sans text-3xl text-text-primary">{t('patientEditTitle')}</h1>
        <PatientsErrorState message={message} />
        <a href="/app/patients" className="text-sm text-info underline">
          {t('patientBackToList')}
        </a>
      </div>
    );
  }

  const practitioners = await listResponsiblePractitioners().catch(() => []);
  // Drafts are completed here; saving moves them into the main list.
  const activate = patient.status === 'DRAFT' && canChangePatientStatus(me);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Картка пацієнта" title={t('patientEditTitle')} description={patient.fullName} actions={<a className="rc-btn rc-btn-secondary" href={`/app/patients/${patient.id}`}>{t('patientBackToProfile')}</a>} />
      {activate ? (
        <p className="rounded-md border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
          Це чернетка з календаря. Дозаповніть дані пацієнта й натисніть «Додати до списку пацієнтів»: після цього картка з’явиться у загальному списку.
        </p>
      ) : null}
      <PatientForm
        mode="edit"
        patient={patient}
        practitioners={practitioners}
        cancelHref={`/app/patients/${patient.id}`}
        activate={activate}
      />
    </div>
  );
}
