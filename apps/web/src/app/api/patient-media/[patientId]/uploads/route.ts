import { NextResponse } from 'next/server';
import { serverApiFetch } from '../../../../../lib/api/server-api-client';
export async function POST(request: Request, { params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  try { return NextResponse.json(await serverApiFetch(`/api/v1/patients/${patientId}/media/uploads`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: await request.text() })); } catch { return NextResponse.json({ message: 'Media upload could not be started.' }, { status: 502 }); }
}
