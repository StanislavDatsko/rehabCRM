import type { CurrentUserResponse } from '@repo/contracts';
import { notFound } from 'next/navigation';
import { getPatientBodyMap } from '../../../../../features/anatomy/api/anatomy-api';
import { BodyMapWorkspace } from '../../../../../features/anatomy/components/body-map-workspace';
import {
  canCreateBodyAnnotation,
  canReadBodyMap,
  canResolveBodyAnnotation,
  canUpdateBodyAnnotation,
  canVoidBodyAnnotation,
} from '../../../../../features/anatomy/permissions';
import {
  ServerApiError,
  serverApiFetch,
} from '../../../../../lib/api/server-api-client';

export const dynamic = 'force-dynamic';

export default async function PatientBodyMapPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ encounterId?: string; structure?: string }>;
}) {
  const me = await serverApiFetch<CurrentUserResponse>('/api/v1/me');
  if (!canReadBodyMap(me))
    return (
      <div className="rounded-md border border-danger/30 bg-danger/5 p-5">
        <h1 className="font-serif text-2xl">Body map unavailable</h1>
        <p className="mt-2 text-sm">You do not have clinical anatomy permissions.</p>
      </div>
    );
  const { id } = await params;
  const query = await searchParams;
  const data = await getPatientBodyMap(id).catch((error: unknown) => {
    if (error instanceof ServerApiError && error.status === 404) notFound();
    throw error;
  });
  return (
    <BodyMapWorkspace
      data={data}
      encounterId={query.encounterId}
      initialStructureId={query.structure}
      permissions={{
        create: canCreateBodyAnnotation(me),
        update: canUpdateBodyAnnotation(me),
        resolve: canResolveBodyAnnotation(me),
        void: canVoidBodyAnnotation(me),
      }}
    />
  );
}
