import type { PatientAdministrativeResponse } from '@repo/contracts';
import { Button } from '@repo/ui/button';
import { t } from '../../../i18n/messages';
import { ageFromDateOfBirth, formatDateOfBirth } from '../age';
import { buildPatientsListHref, type PatientListQuery } from '../list-query';
import { PatientStatusBadge } from './patient-status-badge';

function formatUpdatedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return t('patientNoValue');
  }
  return new Intl.DateTimeFormat('uk-UA', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function dobAgeCell(patient: PatientAdministrativeResponse): string {
  const dob = formatDateOfBirth(patient.dateOfBirth);
  const age = ageFromDateOfBirth(patient.dateOfBirth);
  if (!dob && age === null) {
    return t('patientNoValue');
  }
  if (dob && age !== null) {
    return `${dob} · ${age} ${t('patientsAgeYears')}`;
  }
  return dob ?? `${age} ${t('patientsAgeYears')}`;
}

function contactsCell(patient: PatientAdministrativeResponse): string {
  const parts = [patient.phone, patient.email].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : t('patientNoValue');
}

export function PatientListTable({
  items,
  query,
  totalPages,
  canEdit,
}: {
  items: PatientAdministrativeResponse[];
  query: PatientListQuery;
  totalPages: number;
  canEdit: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-md border border-border bg-surface">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border bg-surface-muted/60 text-xs uppercase tracking-wide text-text-secondary">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                {t('patientsColPatient')}
              </th>
              <th scope="col" className="hidden px-4 py-3 font-medium md:table-cell">
                {t('patientsColDobAge')}
              </th>
              <th scope="col" className="hidden px-4 py-3 font-medium lg:table-cell">
                {t('patientsColContacts')}
              </th>
              <th scope="col" className="hidden px-4 py-3 font-medium xl:table-cell">
                {t('patientsColPractitioner')}
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                {t('patientsColStatus')}
              </th>
              <th scope="col" className="hidden px-4 py-3 font-medium sm:table-cell">
                {t('patientsColUpdated')}
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                {t('patientsColActions')}
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((patient) => (
              <tr
                key={patient.id}
                className="border-b border-border last:border-b-0 hover:bg-surface-muted/40"
              >
                <td className="px-4 py-3">
                  <a
                    href={`/app/patients/${patient.id}`}
                    className="font-medium text-text-primary underline-offset-2 hover:underline"
                  >
                    {patient.fullName}
                  </a>
                  {patient.internalReferenceNumber ? (
                    <p className="mt-0.5 text-xs text-text-secondary">
                      {patient.internalReferenceNumber}
                    </p>
                  ) : null}
                </td>
                <td className="hidden px-4 py-3 text-text-secondary md:table-cell">
                  {dobAgeCell(patient)}
                </td>
                <td className="hidden px-4 py-3 text-text-secondary lg:table-cell">
                  {contactsCell(patient)}
                </td>
                <td className="hidden px-4 py-3 text-text-secondary xl:table-cell">
                  {patient.responsiblePractitioner?.displayName ?? t('patientsUnassigned')}
                </td>
                <td className="px-4 py-3">
                  <PatientStatusBadge status={patient.status} />
                </td>
                <td className="hidden px-4 py-3 text-text-secondary sm:table-cell">
                  {formatUpdatedAt(patient.updatedAt)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <a href={`/app/patients/${patient.id}`}>
                      <Button type="button" variant="secondary">
                        {t('patientsOpen')}
                      </Button>
                    </a>
                    {canEdit ? (
                      <a href={`/app/patients/${patient.id}/edit`}>
                        <Button type="button" variant="ghost">
                          {t('patientsEdit')}
                        </Button>
                      </a>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <nav
          aria-label={t('patientsPaginationPage')}
          className="flex flex-wrap items-center justify-between gap-3 text-sm"
        >
          <p className="text-text-secondary">
            {t('patientsPaginationPage')} {query.page} / {totalPages}
          </p>
          <div className="flex gap-2">
            {query.page > 1 ? (
              <a href={buildPatientsListHref(query, { page: query.page - 1 })}>
                <Button type="button" variant="secondary">
                  {t('patientsPaginationPrev')}
                </Button>
              </a>
            ) : (
              <Button type="button" variant="secondary" disabled>
                {t('patientsPaginationPrev')}
              </Button>
            )}
            {query.page < totalPages ? (
              <a href={buildPatientsListHref(query, { page: query.page + 1 })}>
                <Button type="button" variant="secondary">
                  {t('patientsPaginationNext')}
                </Button>
              </a>
            ) : (
              <Button type="button" variant="secondary" disabled>
                {t('patientsPaginationNext')}
              </Button>
            )}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
