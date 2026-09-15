import { NextResponse } from 'next/server';
import { serverApiFetch } from '../../../../../../lib/api/server-api-client';
export async function POST(request: Request, { params }: { params: Promise<{ patientId: string; mediaId: string }> }) {
  const { patientId, mediaId } = await params;
  try { return NextResponse.json(await serverApiFetch(`/api/v1/patients/${patientId}/media/${mediaId}/complete`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: await request.text() })); } catch { return NextResponse.json({ message: 'Media upload could not be finalized.' }, { status: 502 }); }
}
