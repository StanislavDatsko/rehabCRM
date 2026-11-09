import type { CurrentUserResponse } from '@repo/contracts';
import { PageHeader } from '@repo/ui/workspace';
import {
  listPatients,
  listResponsiblePractitioners,
} from '../../../features/patients/api/patients-api';
import { buildPatientsListHref } from '../../../features/patients/list-query';
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
        <h1 className="font-sans text-3xl text-text-primary">{t('patientsTitle')}</h1>
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
  const onDrafts = query.tab === 'drafts';

  // The other tab's count, so both tabs can show how many patients they hold.
  let otherTotal: number | null = null;
  try {
    const other = await listPatients({
      ...query,
      tab: onDrafts ? 'patients' : 'drafts',
      status: '',
      search: '',
      responsiblePractitionerId: '',
      page: 1,
      pageSize: 1,
    });
    otherTotal = other.total;
  } catch {
    otherTotal = null;
  }
  const patientsCount = onDrafts ? otherTotal : (list?.total ?? null);
  const draftsCount = onDrafts ? (list?.total ?? null) : otherTotal;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Клінічна практика" title={t('patientsTitle')} description={t('patientsSubtitle')} metadata={list ? <span className="ui-count" aria-label={`${t('patientsTotal')}: ${list.total}`}>{list.total}</span> : null} actions={canCreate ? <a className="rc-btn rc-btn-primary inline-flex items-center gap-2" href="/app/patients/new"><span aria-hidden="true">+</span>{t('patientsCreate')}</a> : null} />

      <nav className="ui-segmented w-fit" aria-label="Розділи списку пацієнтів">
        <a
          aria-current={onDrafts ? undefined : 'page'}
          href={buildPatientsListHref({ ...query, tab: 'patients', page: 1, status: '' })}
        >
          Пацієнти{patientsCount !== null ? ` · ${patientsCount}` : ''}
        </a>
        <a
          aria-current={onDrafts ? 'page' : undefined}
          href={buildPatientsListHref({ ...query, tab: 'drafts', page: 1, status: '' })}
        >
          Чернетки{draftsCount !== null ? ` · ${draftsCount}` : ''}
        </a>
      </nav>

      {onDrafts ? (
        <p className="text-sm text-text-secondary">
          Тут пацієнти, яких записали з календаря за ПІБ і телефоном. Коли пацієнт прийде, натисніть «Додати до списку пацієнтів», дозаповніть дані — і він з’явиться у загальному списку.
        </p>
      ) : null}

      <PatientListFilters query={query} practitioners={practitioners} />

      {listError ? <PatientsErrorState message={listError} /> : null}

      {!listError && list && list.items.length === 0 ? (
        onDrafts && !filtered ? (
          <p className="overview-empty">Чернеток немає. Нові пацієнти з календаря з’являться тут.</p>
        ) : (
          <PatientsEmptyState filtered={filtered} canCreate={canCreate} />
        )
      ) : null}

      {!listError && list && list.items.length > 0 ? (
        <PatientListTable
          items={list.items}
          query={query}
          totalPages={list.totalPages}
          canEdit={canEdit}
          draftMode={onDrafts}
        />
      ) : null}
    </div>
  );
}
