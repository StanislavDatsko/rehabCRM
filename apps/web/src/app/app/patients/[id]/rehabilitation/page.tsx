import type { CurrentUserResponse } from '@repo/contracts';
import { getPatient } from '../../../../../features/patients/api/patients-api';
import { listPatientPlans } from '../../../../../features/rehabilitation/api/rehabilitation-api';
import { PatientRehabTabs } from '../../../../../features/rehabilitation/components/patient-rehab-tabs';
import { RehabilitationPlansSection } from '../../../../../features/rehabilitation/components/rehabilitation-plans-section';
import { canCreatePlan, canReadPlans } from '../../../../../features/rehabilitation/permissions';
import { serverApiFetch } from '../../../../../lib/api/server-api-client';

export const dynamic = 'force-dynamic';

export default async function PatientRehabilitationPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await serverApiFetch<CurrentUserResponse>('/api/v1/me');
  const { id } = await params;
  if (!canReadPlans(me))
    return (
      <div className="rounded-md border border-danger/30 bg-danger/5 p-5">
        <h1 className="font-sans text-2xl">Плани недоступні</h1>
        <p className="mt-2 text-sm">Недостатньо прав для перегляду реабілітаційних планів.</p>
      </div>
    );
  const [patient, plans] = await Promise.all([getPatient(id), listPatientPlans(id)]);
  return (
    <div>
      <PatientRehabTabs user={me} patientId={id} patientName={patient.fullName} active="plans" />
      <RehabilitationPlansSection patientId={id} plans={plans} canCreate={canCreatePlan(me)} />
    </div>
  );
}
