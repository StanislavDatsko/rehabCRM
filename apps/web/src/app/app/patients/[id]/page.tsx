/* eslint-disable @typescript-eslint/no-explicit-any -- exercise-log and media payloads are not yet typed in @repo/contracts */
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
import { PatientVisitHistory } from '../../../../features/scheduling/components/patient-visit-history';
import {
  getPatientAppointments,
  getPatientVisitHistory,
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
    statusUpdated?: string; activated?: string;
    assessmentStatus?: 'DRAFT' | 'COMPLETED' | 'VOIDED';
    assessmentTemplate?: string;
    assessmentFrom?: string;
    assessmentTo?: string;
    tab?: string;
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
        <h1 className="font-sans text-3xl text-text-primary">{t('patientProfileTitle')}</h1>
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
  let visitHistory: Awaited<ReturnType<typeof getPatientVisitHistory>> | null = null;
  let schedulingTimezone = DEFAULT_TIMEZONE;
  let patientMedia: { items: Array<{ id: string; kind: 'IMAGE' | 'VIDEO'; mimeType: string; originalFileName: string; title: string | null; description: string | null; capturedAt: string | null; createdAt: string; uploadedBy: string; sizeBytes: string }>; total: number } | null = null;
  let visitMedia: { items: any[]; total: number } = { items: [], total: 0 };
  if (canReadAppointments(me)) {
    try {
      appointmentSummary = await getPatientAppointments(id);
    } catch {
      appointmentSummary = null;
    }
    try {
      visitHistory = await getPatientVisitHistory(id);
    } catch {
      visitHistory = null;
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
    try { visitMedia = await serverApiFetch(`/api/v1/patients/${id}/media?page=1&pageSize=100&encounterOnly=true`); } catch { visitMedia = { items: [], total: 0 }; }
  }

  const flashMessage = flash.activated
    ? 'Пацієнта додано до списку.'
    : flash.created
    ? t('patientCreatedFlash')
    : flash.updated
      ? t('patientUpdatedFlash')
      : flash.statusUpdated
        ? t('patientStatusUpdatedFlash')
      : null;

  const visitMediaGroups = Object.values(visitMedia.items.reduce<Record<string, { encounterId: string; startedAt: string | null; items: any[] }>>((groups, item) => {
    if (!item.encounterId) return groups;
    const group = groups[item.encounterId] ?? { encounterId: item.encounterId, startedAt: item.encounterStartedAt, items: [] as any[] };
    group.items.push(item);
    groups[item.encounterId] = group;
    return groups;
  }, {})).sort((a, b) => new Date(b.startedAt ?? 0).getTime() - new Date(a.startedAt ?? 0).getTime());

  // Card tabs: "overview" shows everything; every other tab shows only its own section.
  const tabs: { id: string; label: string }[] = [
    { id: 'overview', label: 'Огляд' },
    ...(appointmentSummary || visitHistory ? [{ id: 'appointments', label: 'Візити' }] : []),
    ...(assessments ? [{ id: 'assessments', label: 'Оцінювання' }] : []),
    ...(rehabilitationPlans ? [{ id: 'plans', label: 'Плани' }] : []),
    ...(patientMedia ? [{ id: 'media', label: 'Медіа' }] : []),
    ...(me.permissions.includes('patient_media.read') ? [{ id: 'visit-media', label: 'Медіа з візитів' }] : []),
    ...(bodyMap ? [{ id: 'body-map', label: 'Карта тіла' }] : []),
    { id: 'history', label: 'Історія' },
  ];
  const tab = tabs.some((item) => item.id === flash.tab) ? (flash.tab as string) : 'overview';
  const isOverview = tab === 'overview';
  const show = (name: string) => isOverview || tab === name;

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

      {patient.status === 'DRAFT' && canUpdatePatient(me) ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-warning/30 bg-warning/5 px-4 py-3 text-sm">
          <span className="text-warning">Це чернетка з календаря: пацієнта ще немає у загальному списку.</span>
          <a className="rc-btn rc-btn-primary" href={`/app/patients/${id}/edit?activate=1`}>Додати до списку пацієнтів</a>
        </div>
      ) : null}

      <PatientProfileHeader
        patient={patient}
        canEdit={canUpdatePatient(me)}
        actions={<>
          {canReadAssessments(me) && canCreateAssessment(me) ? <a className="rc-btn rc-btn-secondary" href={`/app/patients/${id}/assessments/new`}>+ Оцінювання</a> : null}
          {canReadPlans(me) && canCreatePlan(me) ? <a className="rc-btn rc-btn-secondary" href={`/app/patients/${id}/rehabilitation/new`}>+ План</a> : null}
          {canReadBodyMap(me) && bodyMap ? <a className="rc-btn rc-btn-secondary" href={`/app/patients/${id}/body-map`}>Карта тіла</a> : null}
        </>}
      />
      <nav aria-label="Розділи картки пацієнта" className="patient-section-nav">
        {tabs.map((item) => (
          <a
            key={item.id}
            href={item.id === 'overview' ? `/app/patients/${id}` : `/app/patients/${id}?tab=${item.id}`}
            aria-current={item.id === tab ? 'page' : undefined}
          >
            {item.label}
          </a>
        ))}
        {canReadProgress(me) && <a href={`/app/patients/${id}/progress`}>Динаміка</a>}
        {canReadClinicalReports(me) && <a href={`/app/patients/${id}/reports`}>Звіти</a>}
      </nav>
      {isOverview ? <section id="overview" className="patient-workspace-section"><PatientProfileDetails patient={patient} /></section> : null}

      {patientMedia && show('media') ? <section id="media" className="patient-workspace-section"><PatientMediaGallery patientId={id} initialItems={patientMedia.items} initialTotal={patientMedia.total} /></section> : null}

      {me.permissions.includes('patient_media.read') && show('visit-media') ? (
        <section id="visit-media" className="patient-workspace-section">
          <details className="ui-surface overflow-hidden" open>
            <summary className="cursor-pointer px-5 py-4 font-sans text-lg text-text-primary">Медіа з візитів · {visitMedia.total} записів</summary>
            <div className="space-y-5 border-t border-border p-5">
              {!visitMediaGroups.length ? <p className="text-sm text-text-secondary">Медіа з візитів ще не додано.</p> : null}
              {visitMediaGroups.map((group) => (
                <div key={group.encounterId} className="space-y-3">
                  <div className="flex items-center gap-3 text-sm font-semibold text-text-primary">
                    <span className="h-px flex-1 bg-border" />
                    <span>{group.startedAt ? new Date(group.startedAt).toLocaleDateString('uk-UA', { dateStyle: 'long', timeZone: schedulingTimezone }) : 'Дата візиту не вказана'}</span>
                    <span className="h-px flex-1 bg-border" />
                  </div>
                  <PatientMediaGallery patientId={id} encounterId={group.encounterId} initialItems={group.items} initialTotal={group.items.length} title="Медіа візиту" description="Фото та відео тренування" />
                </div>
              ))}
            </div>
          </details>
        </section>
      ) : null}

      {tab === 'appointments' && visitHistory ? (
        <section id="appointments" className="patient-workspace-section">
          <PatientVisitHistory patientId={id} history={visitHistory} timezone={schedulingTimezone} canCreate={canCreateAppointment(me)} />
        </section>
      ) : null}

      {appointmentSummary && show('appointments') && !(tab === 'appointments' && visitHistory) ? (
        <section id="appointments" className="patient-workspace-section">
        <PatientAppointmentsSection
          patientId={id}
          summary={appointmentSummary}
          timezone={schedulingTimezone}
          canCreate={canCreateAppointment(me)}
        />
        </section>
      ) : null}

      {assessments && show('assessments') ? (
        <section id="assessments" className="patient-workspace-section">
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
        </section>
      ) : null}

      {rehabilitationPlans && show('plans') ? (
        <section id="plans" className="patient-workspace-section">
        <RehabilitationPlansSection
          patientId={id}
          plans={rehabilitationPlans}
          canCreate={canCreatePlan(me)}
        />
        </section>
      ) : null}

      {bodyMap && show('body-map') ? (
        <section id="body-map" className="patient-workspace-section ui-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-sans text-lg text-text-primary">Клінічна карта тіла</h2>
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
              className="rc-btn rc-btn-primary"
            >
              Відкрити карту тіла
            </a>
          </div>
        </section>
      ) : null}

      {isOverview && (canReadProgress(me) || canReadClinicalReports(me)) ? (
        <section className="ui-surface p-5">
          <h2 className="font-sans text-lg text-text-primary">Клінічна динаміка та звіти</h2>
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

      {isOverview && canChangePatientStatus(me) ? <PatientStatusForm patient={patient} /> : null}

      {show('history') ? <section id="history" className="patient-workspace-section ui-surface p-5">
        <h2 className="font-sans text-lg text-text-primary">{t('patientSectionHistory')}</h2>
        <div className="mt-4">
          <PatientHistoryList items={history} />
        </div>
      </section> : null}
    </div>
  );
}
