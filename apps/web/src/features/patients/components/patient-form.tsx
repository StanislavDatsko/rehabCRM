'use client';

import { PATIENT_SEX_VALUES, PATIENT_STATUSES, type PatientAdministrativeResponse, type ResponsiblePractitionerResponse } from '@repo/contracts';
import { Button } from '@repo/ui/button';
import { useActionState, useEffect, useState } from 'react';
import { t } from '../../../i18n/messages';
import {
  createPatientAction,
  updatePatientAction,
  type PatientFormState,
} from '../actions/patient-actions';
import { patientSexLabel, patientStatusLabel } from '../labels';

const initialState: PatientFormState = { error: null };

function Field({
  id,
  name,
  label,
  required,
  defaultValue,
  type = 'text',
  autoComplete,
}: {
  id: string;
  name: string;
  label: string;
  required?: boolean;
  defaultValue?: string | null;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-text-secondary">
        {label}
        {required ? (
          <span className="ml-1 text-danger">
            ({t('patientRequiredMark')})
          </span>
        ) : null}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? ''}
        autoComplete={autoComplete}
        className="field mt-1 bg-background py-2.5 focus:border-info focus:ring-2 focus:ring-info/20"
      />
    </div>
  );
}

export function PatientForm({
  mode,
  patient,
  practitioners,
  cancelHref,
}: {
  mode: 'create' | 'edit';
  patient?: PatientAdministrativeResponse;
  practitioners: ResponsiblePractitionerResponse[];
  cancelHref: string;
}) {
  const action = mode === 'create' ? createPatientAction : updatePatientAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty || pending) return;
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [dirty, pending]);

  const currentPractitionerId = patient?.responsiblePractitioner?.id ?? '';
  const selectable = practitioners.filter(
    (p) => p.status === 'ACTIVE' || p.id === currentPractitionerId,
  );

  return (
    <form
      action={formAction}
      className="space-y-8"
      onChange={() => setDirty(true)}
      onSubmit={() => setDirty(false)}
    >
      {mode === 'edit' && patient ? (
        <>
          <input type="hidden" name="patientId" value={patient.id} />
          <input type="hidden" name="version" value={patient.version} />
        </>
      ) : null}

      {state.error ? (
        <div role="alert" className="rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {state.error}
        </div>
      ) : null}

        <section className="rc-card space-y-4 p-6">
        <h2 className="font-serif text-lg text-text-primary">{t('patientSectionBasics')}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            id="lastName"
            name="lastName"
            label={t('patientFieldLastName')}
            required
            defaultValue={patient?.lastName}
            autoComplete="family-name"
          />
          <Field
            id="firstName"
            name="firstName"
            label={t('patientFieldFirstName')}
            required
            defaultValue={patient?.firstName}
            autoComplete="given-name"
          />
          <Field
            id="middleName"
            name="middleName"
            label={t('patientFieldMiddleName')}
            defaultValue={patient?.middleName}
            autoComplete="additional-name"
          />
          <Field
            id="dateOfBirth"
            name="dateOfBirth"
            label={t('patientFieldDob')}
            type="date"
            defaultValue={patient?.dateOfBirth}
          />
          <div>
            <label htmlFor="sex" className="block text-xs font-medium text-text-secondary">
              {t('patientFieldSex')}
            </label>
            <select
              id="sex"
              name="sex"
              defaultValue={patient?.sex ?? ''}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">{t('patientSexNone')}</option>
              {PATIENT_SEX_VALUES.map((sex) => (
                <option key={sex} value={sex}>
                  {patientSexLabel(sex)}
                </option>
              ))}
            </select>
          </div>
          {mode === 'edit' ? (
            <div>
              <p className="text-xs font-medium text-text-secondary">{t('patientFieldStatus')}</p>
              <p className="mt-2 text-sm text-text-primary">
                {patient ? patientStatusLabel(patient.status) : t('patientNoValue')}
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                {PATIENT_STATUSES.map((s) => patientStatusLabel(s)).join(' · ')}
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="rc-card space-y-4 p-6">
        <h2 className="font-serif text-lg text-text-primary">{t('patientSectionContacts')}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            id="phone"
            name="phone"
            label={t('patientFieldPhone')}
            type="tel"
            defaultValue={patient?.phone}
            autoComplete="tel"
          />
          <Field
            id="email"
            name="email"
            label={t('patientFieldEmail')}
            type="email"
            defaultValue={patient?.email}
            autoComplete="email"
          />
        </div>
      </section>

      <section className="rc-card space-y-4 p-6">
        <h2 className="font-serif text-lg text-text-primary">{t('patientSectionAddress')}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            id="addressLine1"
            name="addressLine1"
            label={t('patientFieldAddressLine1')}
            defaultValue={patient?.address.line1}
          />
          <Field
            id="addressLine2"
            name="addressLine2"
            label={t('patientFieldAddressLine2')}
            defaultValue={patient?.address.line2}
          />
          <Field
            id="city"
            name="city"
            label={t('patientFieldCity')}
            defaultValue={patient?.address.city}
          />
          <Field
            id="region"
            name="region"
            label={t('patientFieldRegion')}
            defaultValue={patient?.address.region}
          />
          <Field
            id="postalCode"
            name="postalCode"
            label={t('patientFieldPostalCode')}
            defaultValue={patient?.address.postalCode}
          />
          <Field
            id="countryCode"
            name="countryCode"
            label={t('patientFieldCountryCode')}
            defaultValue={patient?.address.countryCode}
          />
        </div>
      </section>

      <section className="rc-card space-y-4 p-6">
        <h2 className="font-serif text-lg text-text-primary">{t('patientSectionEmergency')}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            id="emergencyContactName"
            name="emergencyContactName"
            label={t('patientFieldEmergencyName')}
            defaultValue={patient?.emergencyContact?.name}
          />
          <Field
            id="emergencyContactPhone"
            name="emergencyContactPhone"
            label={t('patientFieldEmergencyPhone')}
            type="tel"
            defaultValue={patient?.emergencyContact?.phone}
          />
          <Field
            id="emergencyContactRelationship"
            name="emergencyContactRelationship"
            label={t('patientFieldEmergencyRelationship')}
            defaultValue={patient?.emergencyContact?.relationship}
          />
        </div>
      </section>

      <section className="rc-card space-y-4 p-6">
        <h2 className="font-serif text-lg text-text-primary">{t('patientSectionCare')}</h2>
        <div>
          <label
            htmlFor="responsiblePractitionerId"
            className="block text-xs font-medium text-text-secondary"
          >
            {t('patientFieldPractitioner')}
          </label>
          <select
            id="responsiblePractitionerId"
            name="responsiblePractitionerId"
            defaultValue={currentPractitionerId}
            className="mt-1 w-full max-w-lg rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">{t('patientsUnassigned')}</option>
            {selectable.map((p) => (
              <option key={p.id} value={p.id} disabled={p.status === 'DISABLED'}>
                {p.displayName}
                {p.status === 'DISABLED' ? ` (${t('patientPractitionerDisabledHint')})` : ''}
              </option>
            ))}
          </select>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending}>
          {t('patientSave')}
        </Button>
        <a href={cancelHref}>
          <Button type="button" variant="secondary">
            {t('patientCancel')}
          </Button>
        </a>
      </div>
    </form>
  );
}
