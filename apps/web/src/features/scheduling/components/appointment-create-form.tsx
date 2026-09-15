'use client';

import type { ResponsiblePractitionerResponse, SchedulingCatalogResponse } from '@repo/contracts';
import { Button } from '@repo/ui/button';
import { useActionState, useEffect, useMemo, useState } from 'react';
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
  onClose,
}: {
  catalog: SchedulingCatalogResponse;
  practitioners: ResponsiblePractitionerResponse[];
  timezone: string;
  prefillPatientId: string;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(createAppointmentAction, initialState);
  const [patientQuery, setPatientQuery] = useState('');
  const [patientResults, setPatientResults] = useState<{ id: string; displayName: string }[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState(prefillPatientId);
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('60');

  const selectedLocation = useMemo(
    () => catalog.locations.find((location) => location.id === selectedLocationId) ?? null,
    [catalog.locations, selectedLocationId],
  );

  const rooms = selectedLocation?.rooms ?? [];

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
      aria-labelledby="appointment-create-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
    >
      <div className="rc-card rc-card-elevated max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 id="appointment-create-title" className="font-serif text-2xl text-text-primary">
            {t('appointmentCreateTitle')}
          </h2>
          <button type="button" className="text-sm text-text-secondary underline" onClick={onClose}>
            {t('appointmentClose')}
          </button>
        </div>

        <form action={formAction} className="mt-6 space-y-4">
          <input type="hidden" name="timezone" value={timezone} />
          <input type="hidden" name="patientId" value={selectedPatientId} />

          <div>
            <label
              htmlFor="patient-search"
              className="block text-xs font-medium text-text-secondary"
            >
              {t('appointmentFieldPatient')}
            </label>
            <input
              id="patient-search"
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
                {t('appointmentSelectedPatient')}: {selectedPatientId}
              </p>
            ) : null}
          </div>

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
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-medium text-text-secondary">
              {t('appointmentFieldStartTime')}
              <input
                name="startTime"
                type="time"
                required
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

          <label className="block text-xs font-medium text-text-secondary">
            {t('appointmentFieldLocation')}
            <select
              name="locationId"
              value={selectedLocationId}
              onChange={(event) => setSelectedLocationId(event.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">{t('calendarFilterAll')}</option>
              {catalog.locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </label>

          {rooms.length > 0 ? (
            <label className="block text-xs font-medium text-text-secondary">
              {t('appointmentFieldRoom')}
              <select
                name="roomId"
                defaultValue=""
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="">{t('calendarFilterAll')}</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="block text-xs font-medium text-text-secondary">
            {t('appointmentFieldNote')}
            <textarea
              name="administrativeNote"
              rows={3}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </label>

          {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="submit" disabled={pending || !selectedPatientId}>
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
