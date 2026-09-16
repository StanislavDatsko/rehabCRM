import { NextResponse } from 'next/server';
import { ServerApiError, serverApiFetch } from '../../../../../../lib/api/server-api-client';
export async function GET(
  _: Request,
  { params }: { params: Promise<{ patientId: string; mediaId: string }> },
) {
  const { patientId, mediaId } = await params;
  try {
    return NextResponse.json(
      await serverApiFetch(`/api/v1/patients/${patientId}/media/${mediaId}/access`),
    );
  } catch (error) {
    if (error instanceof ServerApiError) {
      return NextResponse.json(
        error.body ?? { code: 'PATIENT_MEDIA_ACCESS_FAILED', message: error.message },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { code: 'PATIENT_MEDIA_ACCESS_FAILED', message: 'Media could not be accessed.' },
      { status: 502 },
    );
  }
}
