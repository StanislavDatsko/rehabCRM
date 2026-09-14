import type { CurrentUserResponse } from '@repo/contracts';
import { getPatient } from '../../../../../../features/patients/api/patients-api';
import { NewPlanForm } from '../../../../../../features/rehabilitation/components/new-plan-form';
import { canCreatePlan } from '../../../../../../features/rehabilitation/permissions';
import { serverApiFetch } from '../../../../../../lib/api/server-api-client';

export const dynamic = 'force-dynamic';

export default async function NewRehabilitationPlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ baseline?: string }>;
}) {
  const me = await serverApiFetch<CurrentUserResponse>('/api/v1/me');
  if (!canCreatePlan(me))
    return (
      <p className="rounded-md border border-danger/30 p-5 text-danger">
        Немає дозволу створювати плани реабілітації.
      </p>
    );
  const patient = await getPatient((await params).id);
  return (
    <NewPlanForm
      patientId={patient.id}
      patientName={patient.fullName}
      baselineMeasurementId={(await searchParams).baseline}
    />
  );
}
