import { NextResponse } from 'next/server';
import { serverApiFetch } from '../../../../../../lib/api/server-api-client';
export async function GET(_: Request, { params }: { params: Promise<{ patientId: string; mediaId: string }> }) {
  const { patientId, mediaId } = await params;
  try { return NextResponse.json(await serverApiFetch(`/api/v1/patients/${patientId}/media/${mediaId}/access`)); } catch { return NextResponse.json({ message: 'Media could not be accessed.' }, { status: 404 }); }
}
