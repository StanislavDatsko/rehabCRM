import type { CurrentUserResponse } from '@repo/contracts';
import { Button } from '@repo/ui/button';
import {
  listPatients,
  listResponsiblePractitioners,
} from '../../../features/patients/api/patients-api';
import { PatientListFilters } from '../../../features/patients/components/patient-list-filters';
import { PatientListTable } from '../../../features/patients/components/patient-list-table';
import {
  PatientsEmptyState,
  PatientsErrorState,
  PatientsForbiddenState,
} from '../../../features/patients/components/patients-states';
import { mapApiErrorToMessage } from '../../../features/patients/labels';
import { parsePatientListQuery } from '../../../features/patients/list-query';
import {
  canCreatePatient,
  canReadPatients,
  canUpdatePatient,
} from '../../../features/patients/permissions';
import { t } from '../../../i18n/messages';
import { ServerApiError } from '../../../lib/api/server-api-client';
import { serverApiFetch } from '../../../lib/api/server-api-client';

export const dynamic = 'force-dynamic';

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const me = await serverApiFetch<CurrentUserResponse>('/api/v1/me');
  if (!canReadPatients(me)) {
    return (
      <>
        <h1 className="font-serif text-3xl text-text-primary">{t('patientsTitle')}</h1>
        <div className="mt-6">
          <PatientsForbiddenState />
        </div>
      </>
    );
  }

  const raw = await searchParams;
  const query = parsePatientListQuery(raw);
  const canCreate = canCreatePatient(me);
  const canEdit = canUpdatePatient(me);

  let practitioners: Awaited<ReturnType<typeof listResponsiblePractitioners>> = [];
  try {
    practitioners = await listResponsiblePractitioners();
  } catch {
    practitioners = [];
  }

  let listError: string | null = null;
  let list: Awaited<ReturnType<typeof listPatients>> | null = null;
  try {
    list = await listPatients(query);
  } catch (error) {
    listError =
      error instanceof ServerApiError
        ? mapApiErrorToMessage(error.body?.code)
        : mapApiErrorToMessage(undefined);
  }

  const filtered = Boolean(query.search || query.status || query.responsiblePractitionerId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl text-text-primary">{t('patientsTitle')}</h1>
          <p className="mt-1 text-sm text-text-secondary">{t('patientsSubtitle')}</p>
          {list ? (
            <p className="mt-2 text-sm text-text-secondary">
              {t('patientsTotal')}: {list.total}
            </p>
          ) : null}
        </div>
        {canCreate ? (
          <a href="/app/patients/new">
            <Button type="button">{t('patientsCreate')}</Button>
          </a>
        ) : null}
      </div>

      <PatientListFilters query={query} practitioners={practitioners} />

      {listError ? <PatientsErrorState message={listError} /> : null}

      {!listError && list && list.items.length === 0 ? (
        <PatientsEmptyState filtered={filtered} canCreate={canCreate} />
      ) : null}

      {!listError && list && list.items.length > 0 ? (
        <PatientListTable
          items={list.items}
          query={query}
          totalPages={list.totalPages}
          canEdit={canEdit}
        />
      ) : null}
    </div>
  );
}
