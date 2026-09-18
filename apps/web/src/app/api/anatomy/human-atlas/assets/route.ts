import { NextResponse } from 'next/server';
import { serverApiFetch } from '../../../../../lib/api/server-api-client';

export async function GET() {
  const models = await serverApiFetch<Array<{ code: string; activeVersion: { id: string; format: string } | null }>>('/api/v1/anatomy/models');
  const model = models.find((item) => item.code === 'bodyparts3d-human-atlas' && item.activeVersion?.format === 'ATLAS');
  if (!model?.activeVersion) return NextResponse.json([{ kind: 'MANIFEST', assetIndex: 0, url: '/models/human-atlas/atlas.json' }, ...Array.from({ length: 15 }, (_, assetIndex) => ({ kind: 'GEOMETRY_CHUNK' as const, assetIndex, url: `/models/human-atlas/body-${assetIndex}.bin.gz` }))]);
  return NextResponse.json(await serverApiFetch(`/api/v1/anatomy/model-versions/${model.activeVersion.id}/assets`));
}
