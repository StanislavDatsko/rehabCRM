'use client';

import type { ResponsiblePractitionerResponse, SchedulingCatalogResponse } from '@repo/contracts';
import { Button } from '@repo/ui/button';
import { useActionState, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { t } from '../../../i18n/messages';
import {
  createAppointmentAction,
  searchPatientsForSchedulingAction,
  type SchedulingFormState,
} from '../actions/scheduling-actions';

const initialState: SchedulingFormState = { error: null };

export function AppointmentCreateForm({
  catalog,
  practitioners,
  timezone,
  prefillPatientId,
  initialDate,
  initialStartTime,
  onClose,
}: {
  catalog: SchedulingCatalogResponse;
  practitioners: ResponsiblePractitionerResponse[];
  timezone: string;
  prefillPatientId: string;
  initialDate?: string;
  initialStartTime?: string;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(createAppointmentAction, initialState);
  const router = useRouter();
  const [patientQuery, setPatientQuery] = useState('');
  const [patientMode, setPatientMode] = useState<'existing' | 'new'>('existing');
  const [patientResults, setPatientResults] = useState<{ id: string; displayName: string }[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState(prefillPatientId);
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [priceType, setPriceType] = useState<'STANDARD' | 'DISCOUNTED' | 'CUSTOM' | 'FREE'>('STANDARD');
  const [customPrice, setCustomPrice] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (state.success) {
      onClose();
      router.refresh();
    }
  }, [onClose, router, state.success]);

  useEffect(() => {
    const handle = window.setTimeout(async () => {
      if (patientQuery.trim().length < 2) {
        setPatientResults([]);
        return;
      }
      const results = await searchPatientsForSchedulingAction(patientQuery);
      setPatientResults(results);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [patientQuery]);

  useEffect(() => {
    const type = catalog.appointmentTypes.find((item) => item.id === selectedTypeId);
    if (type) {
      setDurationMinutes(String(type.defaultDurationMinutes));
    }
  }, [catalog.appointmentTypes, selectedTypeId]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Створення нового прийому"
      aria-labelledby="appointment-create-title"
      aria-describedby="appointment-create-description"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
    >
      <div className="ui-surface max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 id="appointment-create-title" className="font-sans text-2xl text-text-primary">
            {t('appointmentCreateTitle')}
          </h2>
          <p id="appointment-create-description" className="sr-only">Створення нового прийому для пацієнта.</p>
          <button type="button" className="text-sm text-text-secondary underline" onClick={onClose}>
            {t('appointmentClose')}
          </button>
        </div>

        <form action={formAction} className="mt-6 space-y-4">
          <input type="hidden" name="timezone" value={timezone} />
          <input type="hidden" name="patientId" value={selectedPatientId} />
          <input type="hidden" name="patientMode" value={patientMode} />

          <div className="ui-segmented" aria-label="Тип пацієнта"><button type="button" aria-pressed={patientMode === 'existing'} onClick={() => setPatientMode('existing')}>Існуючий пацієнт</button><button type="button" aria-pressed={patientMode === 'new'} onClick={() => setPatientMode('new')}>Новий пацієнт</button></div>

          {patientMode === 'new' ? <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs text-text-secondary">Ім’я *<input name="firstName" required className="field mt-1 w-full" /></label><label className="text-xs text-text-secondary">Прізвище *<input name="lastName" required className="field mt-1 w-full" /></label><label className="text-xs text-text-secondary">По батькові<input name="middleName" className="field mt-1 w-full" /></label><label className="text-xs text-text-secondary">Телефон *<input name="phone" required className="field mt-1 w-full" /></label></div> : <div>
            <label
              htmlFor="patient-search"
              className="block text-xs font-medium text-text-secondary"
            >
              {t('appointmentFieldPatient')}
            </label>
            <input
              id="patient-search"
              ref={searchRef}
              type="search"
              value={patientQuery}
              onChange={(event) => setPatientQuery(event.target.value)}
              placeholder={t('appointmentPatientSearchPlaceholder')}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              autoComplete="off"
            />
            {patientResults.length > 0 ? (
              <ul className="mt-2 max-h-40 overflow-y-auto rounded-md border border-border">
                {patientResults.map((patient) => (
                  <li key={patient.id}>
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-surface-muted"
                      onClick={() => {
                        setSelectedPatientId(patient.id);
                        setPatientQuery(patient.displayName);
                        setPatientResults([]);
                      }}
                    >
                      {patient.displayName}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {selectedPatientId ? (
              <p className="mt-1 text-xs text-text-secondary">
                {t('appointmentSelectedPatient')}: {patientQuery}
              </p>
            ) : null}
          </div>}

          <label className="block text-xs font-medium text-text-secondary">
            {t('appointmentFieldType')}
            <select
              name="appointmentTypeId"
              value={selectedTypeId}
              onChange={(event) => setSelectedTypeId(event.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">{t('calendarFilterAll')}</option>
              {catalog.appointmentTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-medium text-text-secondary">
            {t('appointmentFieldPractitioner')}
            <select
              name="practitionerId"
              required
              defaultValue=""
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="" disabled>
                {t('appointmentSelectPractitioner')}
              </option>
              {practitioners.map((practitioner) => (
                <option key={practitioner.id} value={practitioner.id}>
                  {practitioner.displayName}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-medium text-text-secondary">
              {t('appointmentFieldDate')}
              <input
                name="date"
                type="date"
                required
                defaultValue={initialDate}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-medium text-text-secondary">
              {t('appointmentFieldStartTime')}
              <input
                name="startTime"
                type="time"
                required
                defaultValue={initialStartTime}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
          </div>

          <label className="block text-xs font-medium text-text-secondary">
            {t('appointmentFieldDuration')}
            <input
              name="durationMinutes"
              type="number"
              min={10}
              max={480}
              required
              value={durationMinutes}
              onChange={(event) => setDurationMinutes(event.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </label>

          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-text-secondary">Вартість</legend>
            {([['STANDARD', 'Стандартна — 500 ₴'], ['DISCOUNTED', 'Пільгова — 300 ₴'], ['CUSTOM', 'Інша сума'], ['FREE', 'Безкоштовно']] as const).map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
                <input type="radio" name="priceType" value={value} checked={priceType === value} onChange={() => setPriceType(value)} />
                <span>{label}</span>
              </label>
            ))}
            {priceType === 'CUSTOM' ? <label className="block text-xs text-text-secondary">Сума<input name="customPrice" type="number" min="1" max="1000000" required value={customPrice} onChange={(event) => setCustomPrice(event.target.value)} className="field mt-1 w-full" /></label> : null}
            <input type="hidden" name="priceAmountUah" value={priceType === 'STANDARD' ? '500' : priceType === 'DISCOUNTED' ? '300' : priceType === 'FREE' ? '0' : customPrice} />
          </fieldset>


          <label className="block text-xs font-medium text-text-secondary">
            {t('appointmentFieldNote')}
            <textarea
              name="administrativeNote"
              rows={3}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </label>

          {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}

          <div className="ui-form-actions">
            <Button type="submit" disabled={pending || (patientMode === 'existing' && !selectedPatientId)}>
              {t('appointmentSave')}
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>
              {t('appointmentCancel')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
