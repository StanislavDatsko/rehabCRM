'use client';

import { PATIENT_STATUSES, type PatientAdministrativeResponse } from '@repo/contracts';
import { Button } from '@repo/ui/button';
import { useActionState, useMemo, useState } from 'react';
import { t } from '../../../i18n/messages';
import { changePatientStatusAction, type PatientFormState } from '../actions/patient-actions';
import { patientStatusLabel } from '../labels';

const initialState: PatientFormState = { error: null };

export function PatientStatusForm({ patient }: { patient: PatientAdministrativeResponse }) {
  const [state, formAction, pending] = useActionState(changePatientStatusAction, initialState);
  const [selected, setSelected] = useState(patient.status);

  const needsConfirm = useMemo(
    () => selected !== patient.status && (selected === 'COMPLETED' || selected === 'ARCHIVED'),
    [patient.status, selected],
  );

  return (
    <form action={formAction} className="ui-surface space-y-3 p-5">
      <input type="hidden" name="patientId" value={patient.id} />
      <input type="hidden" name="version" value={patient.version} />
      <h2 className="font-sans text-lg text-text-primary">{t('patientSectionStatus')}</h2>

      {state.error ? (
        <div
          role="alert"
          className="rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger"
        >
          {state.error}
        </div>
      ) : null}

      <div>
        <label htmlFor="status" className="block text-xs font-medium text-text-secondary">
          {t('patientFieldStatus')}
        </label>
        <select
          id="status"
          name="status"
          value={selected}
          onChange={(event) => setSelected(event.target.value as typeof selected)}
          className="field mt-1 w-full max-w-sm"
        >
          {PATIENT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {patientStatusLabel(status)}
            </option>
          ))}
        </select>
      </div>

      {needsConfirm ? (
        <label className="flex items-start gap-2 text-sm text-warning">
          <input type="checkbox" required className="mt-1" />
          <span>{t('patientStatusConfirmHint')}</span>
        </label>
      ) : null}

      <Button type="submit" disabled={pending || selected === patient.status}>
        {t('patientChangeStatus')}
      </Button>
    </form>
  );
}
