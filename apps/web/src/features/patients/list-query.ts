import {
  PATIENT_STATUSES,
  defaultPagination,
  type PatientStatus,
} from '@repo/contracts';

/** Keep in sync with API `PATIENT_SORT_FIELDS`. */
export const PATIENT_SORT_FIELDS = [
  'lastName',
  'createdAt',
  'updatedAt',
  'dateOfBirth',
  'status',
] as const;

export type PatientSortField = (typeof PATIENT_SORT_FIELDS)[number];
export type SortDir = 'asc' | 'desc';

export type PatientListQuery = {
  page: number;
  pageSize: number;
  search: string;
  status: PatientStatus | '';
  responsiblePractitionerId: string;
  sort: PatientSortField;
  sortDir: SortDir;
};

const SORT_SET = new Set<string>(PATIENT_SORT_FIELDS);
const STATUS_SET = new Set<string>(PATIENT_STATUSES);

function firstString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

export function parsePatientListQuery(
  raw: Record<string, string | string[] | undefined>,
): PatientListQuery {
  const pageRaw = Number(firstString(raw.page));
  const pageSizeRaw = Number(firstString(raw.pageSize));
  const { page, pageSize } = defaultPagination(pageRaw, pageSizeRaw);

  const search = firstString(raw.search).trim().slice(0, 200);
  const statusCandidate = firstString(raw.status);
  const status = STATUS_SET.has(statusCandidate)
    ? (statusCandidate as PatientStatus)
    : '';

  const responsiblePractitionerId = firstString(raw.responsiblePractitionerId).trim();

  const sortCandidate = firstString(raw.sort) || 'lastName';
  const sort = SORT_SET.has(sortCandidate)
    ? (sortCandidate as PatientSortField)
    : 'lastName';

  // Accept legacy `order` alias from bookmarks; API uses `sortDir`.
  const dirCandidate = (
    firstString(raw.sortDir) || firstString(raw.order)
  ).toLowerCase();
  const sortDir: SortDir = dirCandidate === 'desc' ? 'desc' : 'asc';

  return {
    page,
    pageSize,
    search,
    status,
    responsiblePractitionerId,
    sort,
    sortDir,
  };
}

export function patientListQueryToSearchParams(query: PatientListQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.page !== 1) {
    params.set('page', String(query.page));
  }
  if (query.pageSize !== 20) {
    params.set('pageSize', String(query.pageSize));
  }
  if (query.search) {
    params.set('search', query.search);
  }
  if (query.status) {
    params.set('status', query.status);
  }
  if (query.responsiblePractitionerId) {
    params.set('responsiblePractitionerId', query.responsiblePractitionerId);
  }
  if (query.sort !== 'lastName') {
    params.set('sort', query.sort);
  }
  if (query.sortDir !== 'asc') {
    params.set('sortDir', query.sortDir);
  }
  return params;
}

export function buildPatientsListHref(
  query: PatientListQuery,
  overrides: Partial<PatientListQuery> = {},
): string {
  const merged = { ...query, ...overrides };
  const params = patientListQueryToSearchParams(merged);
  const qs = params.toString();
  return qs ? `/app/patients?${qs}` : '/app/patients';
}
