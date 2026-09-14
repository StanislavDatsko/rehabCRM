import type { PatientAdministrativeResponse } from '@repo/contracts';
import { Button } from '@repo/ui/button';
import { t } from '../../../i18n/messages';
import { ageFromDateOfBirth, formatDateOfBirth } from '../age';
import { patientSexLabel } from '../labels';
import { PatientStatusBadge } from './patient-status-badge';

function valueOrDash(value: string | null | undefined): string {
  return value && value.trim().length > 0 ? value : t('patientNoValue');
}

function formatInstant(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return t('patientNoValue');
  }
  return new Intl.DateTimeFormat('uk-UA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function PatientProfileHeader({
  patient,
  canEdit,
}: {
  patient: PatientAdministrativeResponse;
  canEdit: boolean;
}) {
  const dob = formatDateOfBirth(patient.dateOfBirth);
  const age = ageFromDateOfBirth(patient.dateOfBirth);

  return (
    <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
          {t('patientOverviewTab')}
        </p>
        <h1 className="mt-1 font-serif text-3xl text-text-primary">{patient.fullName}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <PatientStatusBadge status={patient.status} />
          {patient.internalReferenceNumber ? (
            <span className="text-sm text-text-secondary">
              {t('patientFieldReference')}: {patient.internalReferenceNumber}
            </span>
          ) : null}
        </div>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-text-secondary">{t('patientFieldPhone')}</dt>
            <dd className="text-text-primary">{valueOrDash(patient.phone)}</dd>
          </div>
          <div>
            <dt className="text-text-secondary">{t('patientFieldDob')}</dt>
            <dd className="text-text-primary">
              {dob
                ? `${dob}${age !== null ? ` · ${age} ${t('patientsAgeYears')}` : ''}`
                : t('patientNoValue')}
            </dd>
          </div>
          <div>
            <dt className="text-text-secondary">{t('patientFieldPractitioner')}</dt>
            <dd className="text-text-primary">
              {patient.responsiblePractitioner?.displayName ?? t('patientsUnassigned')}
            </dd>
          </div>
          <div>
            <dt className="text-text-secondary">{t('patientFieldEmail')}</dt>
            <dd className="text-text-primary">{valueOrDash(patient.email)}</dd>
          </div>
        </dl>
      </div>
      <div className="flex flex-wrap gap-2">
        <a href="/app/patients">
          <Button type="button" variant="secondary">
            {t('patientBackToList')}
          </Button>
        </a>
        {canEdit ? (
          <a href={`/app/patients/${patient.id}/edit`}>
            <Button type="button">{t('patientsEdit')}</Button>
          </a>
        ) : null}
      </div>
    </header>
  );
}

export function PatientProfileDetails({ patient }: { patient: PatientAdministrativeResponse }) {
  const addressParts = [
    patient.address.line1,
    patient.address.line2,
    patient.address.city,
    patient.address.region,
    patient.address.postalCode,
    patient.address.countryCode,
  ].filter(Boolean);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-md border border-border bg-surface p-5">
        <h2 className="font-serif text-lg text-text-primary">{t('patientSectionBasics')}</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="text-text-secondary">{t('patientFieldSex')}</dt>
            <dd>{patient.sex ? patientSexLabel(patient.sex) : t('patientNoValue')}</dd>
          </div>
          <div>
            <dt className="text-text-secondary">{t('patientsColUpdated')}</dt>
            <dd>{formatInstant(patient.updatedAt)}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-md border border-border bg-surface p-5">
        <h2 className="font-serif text-lg text-text-primary">{t('patientSectionAddress')}</h2>
        <p className="mt-4 text-sm text-text-primary">
          {addressParts.length > 0 ? addressParts.join(', ') : t('patientNoValue')}
        </p>
      </section>

      <section className="rounded-md border border-border bg-surface p-5 lg:col-span-2">
        <h2 className="font-serif text-lg text-text-primary">{t('patientSectionEmergency')}</h2>
        {patient.emergencyContact ? (
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-text-secondary">{t('patientFieldEmergencyName')}</dt>
              <dd>{valueOrDash(patient.emergencyContact.name)}</dd>
            </div>
            <div>
              <dt className="text-text-secondary">{t('patientFieldEmergencyPhone')}</dt>
              <dd>{valueOrDash(patient.emergencyContact.phone)}</dd>
            </div>
            <div>
              <dt className="text-text-secondary">{t('patientFieldEmergencyRelationship')}</dt>
              <dd>{valueOrDash(patient.emergencyContact.relationship)}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-4 text-sm text-text-secondary">{t('patientNoValue')}</p>
        )}
      </section>
    </div>
  );
}
