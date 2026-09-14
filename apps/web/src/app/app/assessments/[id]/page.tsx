import type { CurrentUserResponse } from '@repo/contracts';
import {
  getAssessment,
  getMeasurementHistory,
} from '../../../../features/assessments/api/assessments-api';
import { AssessmentWorkspace } from '../../../../features/assessments/components/assessment-workspace';
import {
  canCompleteAssessment,
  canReadAssessments,
  canUpdateAssessment,
  canVoidAssessment,
} from '../../../../features/assessments/permissions';
import { canCreatePlan } from '../../../../features/rehabilitation/permissions';
import { serverApiFetch } from '../../../../lib/api/server-api-client';

export const dynamic = 'force-dynamic';

export default async function AssessmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    created?: string;
    saved?: string;
    completed?: string;
    voided?: string;
    error?: string;
  }>;
}) {
  const me = await serverApiFetch<CurrentUserResponse>('/api/v1/me');
  if (!canReadAssessments(me)) {
    return (
      <div role="alert" className="rounded-md border border-danger/30 bg-danger/5 p-4 text-danger">
        Недостатньо прав для перегляду клінічних оцінювань.
      </div>
    );
  }
  const { id } = await params;
  const query = await searchParams;
  let assessment: Awaited<ReturnType<typeof getAssessment>>;
  try {
    assessment = await getAssessment(id);
  } catch {
    return (
      <div role="alert" className="rounded-md border border-danger/30 bg-danger/5 p-4 text-danger">
        Оцінювання не знайдено або воно недоступне у вашій організації.
      </div>
    );
  }
  let history: Awaited<ReturnType<typeof getMeasurementHistory>> = [];
  try {
    history = await getMeasurementHistory(assessment.patient.id);
  } catch {
    history = [];
  }
  const notice = query.created
    ? 'Чернетку оцінювання створено.'
    : query.saved
      ? 'Чернетку збережено.'
      : query.completed
        ? 'Оцінювання завершено та захищено від звичайного редагування.'
        : query.voided
          ? 'Оцінювання анульовано; історію збережено.'
          : undefined;
  return (
    <AssessmentWorkspace
      assessment={assessment}
      history={history}
      canUpdate={canUpdateAssessment(me)}
      canComplete={canCompleteAssessment(me)}
      canVoid={canVoidAssessment(me)}
      canCreatePlan={canCreatePlan(me)}
      notice={notice}
      errorCode={query.error}
    />
  );
}
