import { Button } from '@repo/ui/button';
import { EmptyState, ErrorState } from '@repo/ui/components';
import { t } from '../../../i18n/messages';

export function PatientsEmptyState({
  filtered,
  canCreate,
}: {
  filtered: boolean;
  canCreate: boolean;
}) {
  return <EmptyState title={filtered ? t('patientsEmptyFilteredTitle') : t('patientsEmptyTitle')} description={filtered ? t('patientsEmptyFilteredBody') : t('patientsEmptyBody')} action={!filtered && canCreate ? <a href="/app/patients/new"><Button type="button">{t('patientsCreate')}</Button></a> : undefined} />;
}

export function PatientsErrorState({ message }: { message: string }) {
  return <ErrorState title={t('patientsErrorTitle')} description={message} />;
}

export function PatientsForbiddenState() {
  return (
    <div role="alert" className="ui-surface px-5 py-8 text-sm">
      <p className="text-text-primary">{t('patientsForbidden')}</p>
    </div>
  );
}
