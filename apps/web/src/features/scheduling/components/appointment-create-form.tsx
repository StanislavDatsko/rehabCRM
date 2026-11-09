'use client';

import {
  APPOINTMENT_PRICE_PRESETS,
  type ResponsiblePractitionerResponse,
  type SchedulingCatalogResponse,
} from '@repo/contracts';
import { Button } from '@repo/ui/button';
import { useActionState, useEffect, useRef, useState } from 'react';
import { t } from '../../../i18n/messages';
import {
  createAppointmentAction,
  searchPatientsForSchedulingAction,
  type SchedulingFormState,
} from '../actions/scheduling-actions';
import { PRICE_PRESET_LABELS } from '../price';

const initialState: SchedulingFormState = { error: null };
const inputClass = 'field mt-1 block w-full bg-background text-sm';

type PriceChoice = '' | 'free' | 'custom' | `p${number}`;

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
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [patientQuery, setPatientQuery] = useState('');
  const [patientResults, setPatientResults] = useState<{ id: string; displayName: string }[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState(prefillPatientId);
  const [selectedPatientName, setSelectedPatientName] = useState('');
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [priceChoice, setPriceChoice] = useState<PriceChoice>('');
  const [customPrice, setCustomPrice] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const handledState = useRef<SchedulingFormState | null>(null);

  // Saving only closes the dialog; the calendar behind it already shows the new record.
  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  // If the booking failed after a draft patient was created, reuse that draft on retry
  // instead of creating a duplicate.
  useEffect(() => {
    if (state.draftPatientId && handledState.current !== state) {
      handledState.current = state;
      setMode('existing');
      setSelectedPatientId(state.draftPatientId);
      setSelectedPatientName(state.draftPatientName ?? '');
      setPatientQuery(state.draftPatientName ?? '');
    }
  }, [state]);

  useEffect(() => {
    searchRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    const handle = window.setTimeout(async () => {
      if (mode !== 'existing' || patientQuery.trim().length < 2 || patientQuery === selectedPatientName) {
        setPatientResults([]);
        return;
      }
      setPatientResults(await searchPatientsForSchedulingAction(patientQuery));
    }, 300);
    return () => window.clearTimeout(handle);
  }, [patientQuery, mode, selectedPatientName]);

  useEffect(() => {
    const type = catalog.appointmentTypes.find((item) => item.id === selectedTypeId);
    if (type) setDurationMinutes(String(type.defaultDurationMinutes));
  }, [catalog.appointmentTypes, selectedTypeId]);

  const priceValue =
    priceChoice === 'free'
      ? '0'
      : priceChoice === 'custom'
        ? customPrice
        : priceChoice.startsWith('p')
          ? priceChoice.slice(1)
          : '';

  const patientReady =
    mode === 'existing' ? Boolean(selectedPatientId) : newName.trim().split(/\s+/).length >= 2;
  const showPatientSearchError = mode === 'existing' && !selectedPatientId;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="appointment-create-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="cal-modal-backdrop"
    >
      <div className="cal-modal">
        <header className="cal-modal-header">
          <h2 id="appointment-create-title">{t('appointmentCreateTitle')}</h2>
          <button type="button" className="cal-modal-close" onClick={onClose} aria-label={t('appointmentClose')}>
            ✕
          </button>
        </header>

        <form action={formAction} className="cal-modal-body">
          <input type="hidden" name="timezone" value={timezone} />
          <input type="hidden" name="patientId" value={mode === 'existing' ? selectedPatientId : ''} />
          <input type="hidden" name="newPatient" value={mode === 'new' ? '1' : '0'} />
          <input type="hidden" name="priceAmount" value={priceValue} />

          <fieldset className="cal-field-group">
            <legend className="cal-label">{t('appointmentFieldPatient')}</legend>
            <div className="cal-toggle" role="group" aria-label="Тип пацієнта">
              <button type="button" aria-pressed={mode === 'existing'} onClick={() => setMode('existing')}>
                Існуючий пацієнт
              </button>
              <button type="button" aria-pressed={mode === 'new'} onClick={() => setMode('new')}>
                Новий пацієнт
              </button>
            </div>

            {mode === 'existing' ? (
              <div className="mt-3">
                <input
                  id="patient-search"
                  ref={searchRef}
                  type="search"
                  value={patientQuery}
                  onChange={(event) => {
                    setPatientQuery(event.target.value);
                    if (selectedPatientId) {
                      setSelectedPatientId('');
                      setSelectedPatientName('');
                    }
                  }}
                  placeholder={t('appointmentPatientSearchPlaceholder')}
                  className={inputClass}
                  autoComplete="off"
                  aria-label={t('appointmentFieldPatient')}
                />
                {patientResults.length > 0 ? (
                  <ul className="cal-results">
                    {patientResults.map((patient) => (
                      <li key={patient.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPatientId(patient.id);
                            setSelectedPatientName(patient.displayName);
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
                  <p className="cal-hint cal-hint-ok">
                    ✓ {selectedPatientName ? `Обрано: ${selectedPatientName}` : 'Пацієнта обрано'}
                  </p>
                ) : showPatientSearchError && patientQuery.trim().length >= 2 && patientResults.length === 0 ? (
                  <p className="cal-hint">
                    Не знайдено.{' '}
                    <button type="button" className="cal-link" onClick={() => { setMode('new'); setNewName(patientQuery); }}>
                      Створити нового пацієнта
                    </button>
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="cal-label sm:col-span-2">
                  ПІБ
                  <input
                    name="newPatientName"
                    value={newName}
                    onChange={(event) => setNewName(event.target.value)}
                    placeholder="Прізвище Ім’я По батькові"
                    autoComplete="off"
                    required
                    autoFocus
                    className={inputClass}
                  />
                </label>
                <label className="cal-label sm:col-span-2">
                  Номер телефону
                  <input
                    name="newPatientPhone"
                    type="tel"
                    value={newPhone}
                    onChange={(event) => setNewPhone(event.target.value)}
                    placeholder="+380 …"
                    autoComplete="off"
                    className={inputClass}
                  />
                </label>
                <p className="cal-hint sm:col-span-2">
                  Буде створено чернетку картки в розділі «Пацієнти». Решту даних можна заповнити, коли пацієнт прийде.
                </p>
              </div>
            )}
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="cal-label">
              {t('appointmentFieldDate')}
              <input name="date" type="date" required defaultValue={initialDate} className={inputClass} />
            </label>
            <label className="cal-label">
              {t('appointmentFieldStartTime')}
              <input name="startTime" type="time" required defaultValue={initialStartTime} className={inputClass} />
            </label>
            <label className="cal-label">
              {t('appointmentFieldDuration')}
              <input
                name="durationMinutes"
                type="number"
                min={10}
                max={480}
                step={5}
                required
                value={durationMinutes}
                onChange={(event) => setDurationMinutes(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="cal-label">
              {t('appointmentFieldPractitioner')}
              <select
                name="practitionerId"
                required
                defaultValue={practitioners.length === 1 ? practitioners[0]?.id : ''}
                className={inputClass}
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
          </div>

          {catalog.appointmentTypes.length > 0 ? (
            <label className="cal-label">
              {t('appointmentFieldType')}
              <select
                name="appointmentTypeId"
                value={selectedTypeId}
                onChange={(event) => setSelectedTypeId(event.target.value)}
                className={inputClass}
              >
                <option value="">Не вказано</option>
                {catalog.appointmentTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="cal-label">
              Вартість
              <select
                value={priceChoice}
                onChange={(event) => setPriceChoice(event.target.value as PriceChoice)}
                className={inputClass}
              >
                <option value="">Не вказано</option>
                {APPOINTMENT_PRICE_PRESETS.map((amount) => (
                  <option key={amount} value={`p${amount}`}>
                    {amount} ₴ — {PRICE_PRESET_LABELS[amount] ?? 'тариф'}
                  </option>
                ))}
                <option value="free">Безкоштовно</option>
                <option value="custom">Інша сума…</option>
              </select>
            </label>
            {priceChoice === 'custom' ? (
              <label className="cal-label">
                Сума, ₴
                <input
                  type="number"
                  min={0}
                  max={1000000}
                  step={10}
                  required
                  value={customPrice}
                  onChange={(event) => setCustomPrice(event.target.value)}
                  className={inputClass}
                  autoFocus
                />
              </label>
            ) : null}
          </div>

          <label className="cal-label">
            {t('appointmentFieldNote')}
            <textarea name="administrativeNote" rows={2} className={inputClass} />
          </label>

          {state.error ? (
            <p role="alert" className="cal-error">
              {state.error}
            </p>
          ) : null}

          <div className="cal-modal-actions">
            <Button type="button" variant="secondary" onClick={onClose}>
              {t('appointmentCancel')}
            </Button>
            <Button type="submit" disabled={pending || !patientReady}>
              {pending ? 'Збереження…' : t('appointmentSave')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
