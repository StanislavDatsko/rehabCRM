import type { CurrentUserResponse } from '@repo/contracts';
import { getMeasurementHistory } from '../../../../features/assessments/api/assessments-api';
import { getPlan, listExercises } from '../../../../features/rehabilitation/api/rehabilitation-api';
import { PlanWorkspace } from '../../../../features/rehabilitation/components/plan-workspace';
import {
  canActivatePlan,
  canCancelPlan,
  canCompletePlan,
  canEditPlan,
  canPausePlan,
  canReadPlans,
} from '../../../../features/rehabilitation/permissions';
import { serverApiFetch } from '../../../../lib/api/server-api-client';

export const dynamic = 'force-dynamic';

export default async function RehabilitationPlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; created?: string; command?: string; baseline?: string }>;
}) {
  const me = await serverApiFetch<CurrentUserResponse>('/api/v1/me');
  if (!canReadPlans(me))
    return (
      <p className="rounded-md border border-danger/30 p-5 text-danger">
        Немає доступу до клінічного плану.
      </p>
    );
  const plan = await getPlan((await params).id);
  const [history, exerciseResult] = await Promise.all([
    getMeasurementHistory(plan.patient.id).catch(() => []),
    listExercises({ pageSize: 50 }).catch(() => ({
      items: [],
      page: 1,
      pageSize: 50,
      total: 0,
      totalPages: 0,
    })),
  ]);
  const flash = await searchParams;
  return (
    <PlanWorkspace
      plan={plan}
      history={history}
      exercises={exerciseResult.items}
      prefillBaselineId={flash.baseline}
      flash={flash.saved ?? flash.created ?? flash.command}
      capabilities={{
        edit: canEditPlan(me),
        activate: canActivatePlan(me),
        pause: canPausePlan(me),
        complete: canCompletePlan(me),
        cancel: canCancelPlan(me),
      }}
    />
  );
}
