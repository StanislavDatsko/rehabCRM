import { PATIENT_STATUSES, type ResponsiblePractitionerResponse } from '@repo/contracts';
import { Button } from '@repo/ui/button';
import { t } from '../../../i18n/messages';
import { patientStatusLabel } from '../labels';
import {
  PATIENT_SORT_FIELDS,
  type PatientListQuery,
  type PatientSortField,
} from '../list-query';

const SORT_LABEL_KEYS: Record<PatientSortField, 'sortLastName' | 'sortCreatedAt' | 'sortUpdatedAt' | 'sortDateOfBirth' | 'sortStatus'> = {
  lastName: 'sortLastName',
  createdAt: 'sortCreatedAt',
  updatedAt: 'sortUpdatedAt',
  dateOfBirth: 'sortDateOfBirth',
  status: 'sortStatus',
};

export function PatientListFilters({
  query,
  practitioners,
}: {
  query: PatientListQuery;
  practitioners: ResponsiblePractitionerResponse[];
}) {
  return (
    <form method="get" action="/app/patients" className="rc-card p-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <label htmlFor="patient-search" className="block text-xs font-medium text-text-secondary">
            {t('patientsSearch')}
          </label>
          <input
            id="patient-search"
            name="search"
            type="search"
            defaultValue={query.search}
            placeholder={t('patientsSearchPlaceholder')}
            className="field mt-1 bg-background py-2.5 text-text-primary focus:border-info focus:ring-2 focus:ring-info/20"
          />
        </div>
        <div>
          <label htmlFor="patient-status" className="block text-xs font-medium text-text-secondary">
            {t('patientsFilterStatus')}
          </label>
          <select
            id="patient-status"
            name="status"
            defaultValue={query.status}
            className="field mt-1 bg-background py-2.5 focus:border-info focus:ring-2 focus:ring-info/20"
          >
            <option value="">{t('patientsFilterAll')}</option>
            {PATIENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {patientStatusLabel(status)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="patient-practitioner"
            className="block text-xs font-medium text-text-secondary"
          >
            {t('patientsFilterPractitioner')}
          </label>
          <select
            id="patient-practitioner"
            name="responsiblePractitionerId"
            defaultValue={query.responsiblePractitionerId}
            className="field mt-1 bg-background py-2.5 focus:border-info focus:ring-2 focus:ring-info/20"
          >
            <option value="">{t('patientsFilterAll')}</option>
            {practitioners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.displayName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="patient-sort" className="block text-xs font-medium text-text-secondary">
            {t('patientsSort')}
          </label>
          <select
            id="patient-sort"
            name="sort"
            defaultValue={query.sort}
            className="field mt-1 bg-background py-2.5 focus:border-info focus:ring-2 focus:ring-info/20"
          >
            {PATIENT_SORT_FIELDS.map((field) => (
              <option key={field} value={field}>
                {t(SORT_LABEL_KEYS[field])}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="patient-order" className="block text-xs font-medium text-text-secondary">
            {t('patientsSortOrder')}
          </label>
          <select
            id="patient-order"
            name="sortDir"
            defaultValue={query.sortDir}
            className="field mt-1 bg-background py-2.5 focus:border-info focus:ring-2 focus:ring-info/20"
          >
            <option value="asc">{t('patientsSortAsc')}</option>
            <option value="desc">{t('patientsSortDesc')}</option>
          </select>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="submit">{t('patientsApplyFilters')}</Button>
        <a href="/app/patients" className="inline-flex">
          <Button type="button" variant="secondary">
            {t('patientsResetFilters')}
          </Button>
        </a>
      </div>
    </form>
  );
}
