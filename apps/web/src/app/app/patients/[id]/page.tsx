import type { CurrentUserResponse } from '@repo/contracts';
import { getPatient, getPatientHistory } from '../../../../features/patients/api/patients-api';
import { PatientHistoryList } from '../../../../features/patients/components/patient-history-list';
import {
  PatientProfileDetails,
  PatientProfileHeader,
} from '../../../../features/patients/components/patient-profile';
import { PatientStatusForm } from '../../../../features/patients/components/patient-status-form';
import {
  PatientsErrorState,
  PatientsForbiddenState,
} from '../../../../features/patients/components/patients-states';
import { mapApiErrorToMessage } from '../../../../features/patients/labels';
import {
  canChangePatientStatus,
  canReadPatients,
  canUpdatePatient,
} from '../../../../features/patients/permissions';
import { PatientAppointmentsSection } from '../../../../features/scheduling/components/patient-appointments-section';
import {
  getPatientAppointments,
  getSchedulingCatalog,
} from '../../../../features/scheduling/api/scheduling-api';
import {
  canCreateAppointment,
  canReadAppointments,
} from '../../../../features/scheduling/permissions';
import { DEFAULT_TIMEZONE, resolveDisplayTimezone } from '../../../../features/scheduling/timezone';
import { t } from '../../../../i18n/messages';
import { ServerApiError, serverApiFetch } from '../../../../lib/api/server-api-client';
import {
  listAssessmentTemplates,
  listPatientAssessments,
} from '../../../../features/assessments/api/assessments-api';
import { AssessmentHistorySection } from '../../../../features/assessments/components/assessment-history-section';
import {
  canCreateAssessment,
  canReadAssessments,
} from '../../../../features/assessments/permissions';
import { listPatientPlans } from '../../../../features/rehabilitation/api/rehabilitation-api';
import { RehabilitationPlansSection } from '../../../../features/rehabilitation/components/rehabilitation-plans-section';
import { canCreatePlan, canReadPlans } from '../../../../features/rehabilitation/permissions';
import { getPatientBodyMap } from '../../../../features/anatomy/api/anatomy-api';
import { canReadBodyMap } from '../../../../features/anatomy/permissions';
import { PatientMediaGallery } from '../../../../features/patient-media/patient-media-gallery';
import {
  canReadClinicalReports,
  canReadProgress,
} from '../../../../features/progress/permissions';

export const dynamic = 'force-dynamic';

export default async function PatientProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    created?: string;
    updated?: string;
    statusUpdated?: string;
    assessmentStatus?: 'DRAFT' | 'COMPLETED' | 'VOIDED';
    assessmentTemplate?: string;
    assessmentFrom?: string;
    assessmentTo?: string;
  }>;
}) {
  const me = await serverApiFetch<CurrentUserResponse>('/api/v1/me');
  if (!canReadPatients(me)) {
    return <PatientsForbiddenState />;
  }

  const { id } = await params;
  const flash = await searchParams;

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
        <h1 className="font-serif text-3xl text-text-primary">{t('patientProfileTitle')}</h1>
        <PatientsErrorState message={message} />
        <a href="/app/patients" className="text-sm text-info underline">
          {t('patientBackToList')}
        </a>
      </div>
    );
  }

  let history: Awaited<ReturnType<typeof getPatientHistory>> = [];
  try {
    history = await getPatientHistory(id);
  } catch {
    history = [];
  }

  let appointmentSummary: Awaited<ReturnType<typeof getPatientAppointments>> | null = null;
  let assessments: Awaited<ReturnType<typeof listPatientAssessments>> | null = null;
  let assessmentTemplates: Awaited<ReturnType<typeof listAssessmentTemplates>> = [];
  let rehabilitationPlans: Awaited<ReturnType<typeof listPatientPlans>> | null = null;
  let bodyMap: Awaited<ReturnType<typeof getPatientBodyMap>> | null = null;
  let schedulingTimezone = DEFAULT_TIMEZONE;
  let patientMedia: { items: Array<{ id: string; kind: 'IMAGE' | 'VIDEO'; mimeType: string; originalFileName: string; title: string | null; description: string | null; capturedAt: string | null; createdAt: string; uploadedBy: string; sizeBytes: string }>; total: number } | null = null;
  if (canReadAppointments(me)) {
    try {
      appointmentSummary = await getPatientAppointments(id);
    } catch {
      appointmentSummary = null;
    }
    try {
      const catalog = await getSchedulingCatalog();
      schedulingTimezone = resolveDisplayTimezone(catalog.locations[0]?.timezone);
    } catch {
      schedulingTimezone = DEFAULT_TIMEZONE;
    }
  }
  if (canReadAssessments(me)) {
    const from = /^\d{4}-\d{2}-\d{2}$/.test(flash.assessmentFrom ?? '')
      ? `${flash.assessmentFrom}T00:00:00.000Z`
      : undefined;
    const to = /^\d{4}-\d{2}-\d{2}$/.test(flash.assessmentTo ?? '')
      ? `${flash.assessmentTo}T23:59:59.999Z`
      : undefined;
    try {
      [assessments, assessmentTemplates] = await Promise.all([
        listPatientAssessments(id, {
          status: flash.assessmentStatus,
          templateId: flash.assessmentTemplate,
          from,
          to,
        }),
        listAssessmentTemplates(),
      ]);
    } catch {
      assessments = [];
    }
  }
  if (canReadPlans(me)) {
    try {
      rehabilitationPlans = await listPatientPlans(id);
    } catch {
      rehabilitationPlans = [];
    }
  }
  if (canReadBodyMap(me)) {
    try {
      bodyMap = await getPatientBodyMap(id);
    } catch {
      bodyMap = null;
    }
  }
  if (me.permissions.includes('patient_media.read')) {
    try { patientMedia = await serverApiFetch(`/api/v1/patients/${id}/media?page=1&pageSize=25`); } catch { patientMedia = { items: [], total: 0 }; }
  }

  const flashMessage = flash.created
    ? t('patientCreatedFlash')
    : flash.updated
      ? t('patientUpdatedFlash')
      : flash.statusUpdated
        ? t('patientStatusUpdatedFlash')
        : null;

  return (
    <div className="space-y-8">
      {flashMessage ? (
        <div
          role="status"
          className="rounded-md border border-success/30 bg-success/5 px-4 py-3 text-sm text-success"
        >
          {flashMessage}
        </div>
      ) : null}

      <PatientProfileHeader patient={patient} canEdit={canUpdatePatient(me)} />
      <PatientProfileDetails patient={patient} />

      {patientMedia ? <PatientMediaGallery patientId={id} initialItems={patientMedia.items} initialTotal={patientMedia.total} /> : null}

      {appointmentSummary ? (
        <PatientAppointmentsSection
          patientId={id}
          summary={appointmentSummary}
          timezone={schedulingTimezone}
          canCreate={canCreateAppointment(me)}
        />
      ) : null}

      {assessments ? (
        <AssessmentHistorySection
          patientId={id}
          assessments={assessments}
          canCreate={canCreateAssessment(me)}
          templates={assessmentTemplates}
          filters={{
            status: flash.assessmentStatus,
            templateId: flash.assessmentTemplate,
            from: flash.assessmentFrom,
            to: flash.assessmentTo,
          }}
        />
      ) : null}

      {rehabilitationPlans ? (
        <RehabilitationPlansSection
          patientId={id}
          plans={rehabilitationPlans}
          canCreate={canCreatePlan(me)}
        />
      ) : null}

      {bodyMap ? (
        <section className="rounded-md border border-border bg-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-lg text-text-primary">Clinical body map</h2>
              <p className="mt-1 text-sm text-text-secondary">
                {bodyMap.summary.active} active · {bodyMap.summary.resolved} resolved
                {bodyMap.summary.maximumSeverity === null
                  ? ''
                  : ` · highest severity ${bodyMap.summary.maximumSeverity}/10`}
                {bodyMap.summary.latestRegions.length
                  ? ` · ${bodyMap.summary.latestRegions.join(', ')}`
                  : ''}
                {bodyMap.summary.lastUpdatedAt
                  ? ` · updated ${new Date(bodyMap.summary.lastUpdatedAt).toLocaleDateString()}`
                  : ''}
              </p>
            </div>
            <a
              href={`/app/patients/${id}/body-map`}
              className="rounded bg-info px-3 py-2 text-sm text-white"
            >
              Open body map
            </a>
          </div>
        </section>
      ) : null}

      {canReadProgress(me) || canReadClinicalReports(me) ? (
        <section className="rounded-md border border-border bg-surface p-5">
          <h2 className="font-serif text-lg text-text-primary">Клінічна динаміка та звіти</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Поздовжній перегляд вимірювань, цілей, редакцій плану та позначок тіла.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {canReadProgress(me) ? (
              <a href={`/app/patients/${id}/progress`} className="rc-btn rc-btn-primary">
                Відкрити динаміку
              </a>
            ) : null}
            {canReadClinicalReports(me) ? (
              <a href={`/app/patients/${id}/reports`} className="rc-btn rc-btn-secondary">
                Клінічні звіти
              </a>
            ) : null}
            {me.permissions.includes('patient_monitoring.read') ? <a href={`/app/patients/${id}/monitoring`} className="rc-btn rc-btn-secondary">Моніторинг пацієнта</a> : null}
          </div>
        </section>
      ) : null}

      {canChangePatientStatus(me) ? <PatientStatusForm patient={patient} /> : null}

      <section className="rounded-md border border-border bg-surface p-5">
        <h2 className="font-serif text-lg text-text-primary">{t('patientSectionHistory')}</h2>
        <div className="mt-4">
          <PatientHistoryList items={history} />
        </div>
      </section>
    </div>
  );
}
