import { Button } from '@repo/ui/button';
import { t } from '../../../i18n/messages';

export function PatientsEmptyState({
  filtered,
  canCreate,
}: {
  filtered: boolean;
  canCreate: boolean;
}) {
  return (
    <div className="rounded-md border border-dashed border-border bg-surface px-6 py-14 text-center">
      <h2 className="font-serif text-xl text-text-primary">
        {filtered ? t('patientsEmptyFilteredTitle') : t('patientsEmptyTitle')}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-text-secondary">
        {filtered ? t('patientsEmptyFilteredBody') : t('patientsEmptyBody')}
      </p>
      {!filtered && canCreate ? (
        <div className="mt-6">
          <a href="/app/patients/new">
            <Button type="button">{t('patientsCreate')}</Button>
          </a>
        </div>
      ) : null}
    </div>
  );
}

export function PatientsErrorState({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-md border border-danger/30 bg-danger/5 px-5 py-6 text-sm text-danger"
    >
      <p className="font-semibold">{t('patientsErrorTitle')}</p>
      <p className="mt-1">{message}</p>
    </div>
  );
}

export function PatientsForbiddenState() {
  return (
    <div role="alert" className="rounded-md border border-border bg-surface px-5 py-8 text-sm">
      <p className="text-text-primary">{t('patientsForbidden')}</p>
    </div>
  );
}
