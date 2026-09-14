'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClinicalReport, downloadClinicalReport, voidClinicalReport } from '../api/progress-api';
import { loadCurrentUser } from '../../../lib/app/load-current-user';
import { canCreateClinicalReport, canReadClinicalReports, canVoidClinicalReport } from '../permissions';

const text = (value: FormDataEntryValue | null) => typeof value === 'string' && value.trim() ? value.trim() : null;
const iso = (value: string, end = false) => `${value}T${end ? '23:59:59.999' : '00:00:00.000'}Z`;
async function user() { const me = await loadCurrentUser(); if (me === 'unauthenticated') redirect('/login?reason=expired'); return me; }

export async function generateReportAction(form: FormData): Promise<void> {
  const me = await user(); const patientId = text(form.get('patientId'));
  if (!patientId || me === 'denied' || !canCreateClinicalReport(me)) redirect(`/app/patients/${patientId ?? ''}/reports?error=FORBIDDEN`);
  const from = text(form.get('from')); const to = text(form.get('to')); const sections = form.getAll('sections').filter((x): x is string => typeof x === 'string');
  if (!from || !to || !sections.length) redirect(`/app/patients/${patientId}/reports?error=VALIDATION_FAILED`);
  try { await createClinicalReport(patientId, { period: { from: iso(from), to: iso(to, true) }, sections, professionalSummary: text(form.get('professionalSummary')) }); }
  catch { redirect(`/app/patients/${patientId}/reports?error=CLINICAL_REPORT_GENERATION_FAILED`); }
  revalidatePath(`/app/patients/${patientId}/reports`); redirect(`/app/patients/${patientId}/reports?created=1`);
}

export async function downloadReportAction(form: FormData): Promise<void> {
  const me = await user(); const id = text(form.get('reportId')); const patientId = text(form.get('patientId'));
  if (!id || !patientId || me === 'denied' || !canReadClinicalReports(me)) redirect(`/app/patients/${patientId ?? ''}/reports?error=FORBIDDEN`);
  try { const result = await downloadClinicalReport(id); redirect(result.url); } catch { redirect(`/app/patients/${patientId}/reports?error=CLINICAL_REPORT_NOT_READY`); }
}

export async function voidReportAction(form: FormData): Promise<void> {
  const me = await user(); const id = text(form.get('reportId')); const patientId = text(form.get('patientId')); const reason = text(form.get('reason'));
  if (!id || !patientId || !reason || me === 'denied' || !canVoidClinicalReport(me)) redirect(`/app/patients/${patientId ?? ''}/reports?error=FORBIDDEN`);
  try { await voidClinicalReport(id, reason); } catch { redirect(`/app/patients/${patientId}/reports?error=CLINICAL_REPORT_ALREADY_VOIDED`); }
  revalidatePath(`/app/patients/${patientId}/reports`); redirect(`/app/patients/${patientId}/reports?voided=1`);
}
