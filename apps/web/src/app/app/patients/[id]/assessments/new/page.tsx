import type { CurrentUserResponse } from '@repo/contracts';
import { listAssessmentTemplates } from '../../../../../../features/assessments/api/assessments-api';
import { NewAssessmentForm } from '../../../../../../features/assessments/components/new-assessment-form';
import { canCreateAssessment } from '../../../../../../features/assessments/permissions';
import { getPatient } from '../../../../../../features/patients/api/patients-api';
import { serverApiFetch } from '../../../../../../lib/api/server-api-client';

export const dynamic = 'force-dynamic';

export default async function NewAssessmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ encounterId?: string; error?: string }>;
}) {
  const me = await serverApiFetch<CurrentUserResponse>('/api/v1/me');
  const { id } = await params;
  const query = await searchParams;
  if (!canCreateAssessment(me)) {
    return (
      <div role="alert" className="rounded-md border border-danger/30 bg-danger/5 p-4 text-danger">
        Недостатньо прав для створення клінічного оцінювання.
      </div>
    );
  }
  let patient: Awaited<ReturnType<typeof getPatient>>;
  let templates: Awaited<ReturnType<typeof listAssessmentTemplates>>;
  try {
    [patient, templates] = await Promise.all([getPatient(id), listAssessmentTemplates()]);
  } catch {
    return (
      <div role="alert" className="rounded-md border border-danger/30 bg-danger/5 p-4 text-danger">
        Не вдалося завантажити пацієнта або доступні шаблони оцінювання.
      </div>
    );
  }
  return (
    <NewAssessmentForm
      patient={patient}
      templates={templates}
      encounterId={query.encounterId ?? null}
      errorCode={query.error}
    />
  );
}
