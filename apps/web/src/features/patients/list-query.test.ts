import { describe, expect, it } from 'vitest';
import {
  buildPatientsListHref,
  parsePatientListQuery,
} from './list-query';

describe('parsePatientListQuery', () => {
  it('applies defaults and whitelists sort/status', () => {
    expect(parsePatientListQuery({})).toEqual({
      page: 1,
      pageSize: 20,
      search: '',
      status: '',
      responsiblePractitionerId: '',
      sort: 'lastName',
      sortDir: 'asc',
    });

    const parsed = parsePatientListQuery({
      page: '2',
      pageSize: '10',
      search: '  Іван  ',
      status: 'ACTIVE',
      responsiblePractitionerId: 'prac-1',
      sort: 'updatedAt',
      sortDir: 'desc',
    });
    expect(parsed.page).toBe(2);
    expect(parsed.pageSize).toBe(10);
    expect(parsed.search).toBe('Іван');
    expect(parsed.status).toBe('ACTIVE');
    expect(parsed.sort).toBe('updatedAt');
    expect(parsed.sortDir).toBe('desc');
  });

  it('ignores unsafe sort and status values', () => {
    const parsed = parsePatientListQuery({
      sort: 'drop table',
      status: 'DELETED',
      sortDir: 'sideways',
      page: '0',
    });
    expect(parsed.sort).toBe('lastName');
    expect(parsed.status).toBe('');
    expect(parsed.sortDir).toBe('asc');
    expect(parsed.page).toBe(1);
  });

  it('accepts legacy order query alias', () => {
    expect(parsePatientListQuery({ order: 'desc' }).sortDir).toBe('desc');
  });
});

describe('buildPatientsListHref', () => {
  it('keeps URL state for filters and pagination', () => {
    const href = buildPatientsListHref({
      page: 2,
      pageSize: 20,
      search: 'іван',
      status: 'ACTIVE',
      responsiblePractitionerId: '',
      sort: 'lastName',
      sortDir: 'asc',
    });
    expect(href).toContain('/app/patients?');
    expect(href).toContain('page=2');
    expect(href).toContain('search=');
    expect(href).toContain('status=ACTIVE');
  });
});
