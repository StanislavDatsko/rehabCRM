import type { PatientAdministrativeResponse } from '@repo/contracts';
import type { ReactNode } from 'react';
import { Avatar } from '@repo/ui/workspace';
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
  actions,
}: {
  patient: PatientAdministrativeResponse;
  canEdit: boolean;
  actions?: ReactNode;
}) {
  const dob = formatDateOfBirth(patient.dateOfBirth);
  const age = ageFromDateOfBirth(patient.dateOfBirth);

  return (
    <header className="patient-identity">
      <div>
        <a href="/app/patients" className="mb-5 inline-flex text-xs text-text-secondary hover:text-info">← {t('patientBackToList')}</a>
        <div className="flex items-center gap-4"><Avatar name={patient.fullName} size="lg" /><div><p className="rc-kicker">Картка пацієнта</p><h1 className="ui-page-title mt-1 break-words">{patient.fullName}</h1></div></div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <PatientStatusBadge status={patient.status} />
          {patient.internalReferenceNumber ? (
            <span className="text-sm text-text-secondary">
              {t('patientFieldReference')}: {patient.internalReferenceNumber}
            </span>
          ) : null}
        </div>
        <dl className="patient-identity-facts">
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
      <div className="flex flex-wrap justify-end gap-2">
        {actions}
        {canEdit ? (
          <a className="rc-btn rc-btn-secondary inline-flex items-center" href={`/app/patients/${patient.id}/edit`}>{t('patientsEdit')}</a>
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
    <div className="patient-details">
      <section>
        <h2 className="text-base font-semibold tracking-tight text-text-primary">{t('patientSectionBasics')}</h2>
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

      <section>
        <h2 className="text-base font-semibold tracking-tight text-text-primary">{t('patientSectionAddress')}</h2>
        <p className="mt-4 text-sm text-text-primary">
          {addressParts.length > 0 ? addressParts.join(', ') : t('patientNoValue')}
        </p>
      </section>

      <section className="lg:col-span-2">
        <h2 className="text-base font-semibold tracking-tight text-text-primary">{t('patientSectionEmergency')}</h2>
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
