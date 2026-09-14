import 'server-only';
import type { BodyAnnotationProgressResponse, ClinicalReportDownloadResponse, ClinicalReportListResponse, ClinicalReportResponse, ClinicalTimelineResponse, GoalProgressResponse, MeasurementTrendsResponse, PlanHistoryItem, ProgressPeriod, ProgressSummaryResponse } from '@repo/contracts';
import { serverApiFetch } from '../../../lib/api/server-api-client';

const json = (method: string, body?: unknown): RequestInit => ({ method, headers: { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
export type ProgressFilters = { period?: ProgressPeriod; from?: string; to?: string };
const query = (filters: ProgressFilters) => { const p = new URLSearchParams(); Object.entries(filters).forEach(([k, v]) => v && p.set(k, v)); return p.toString(); };

export const getProgressSummary = (patientId: string, filters: ProgressFilters): Promise<ProgressSummaryResponse> => serverApiFetch(`/api/v1/patients/${patientId}/progress/summary?${query(filters)}`);
export const getMeasurementTrends = (patientId: string, filters: ProgressFilters): Promise<MeasurementTrendsResponse> => serverApiFetch(`/api/v1/patients/${patientId}/progress/measurements?${query(filters)}`);
export const getGoalProgress = (patientId: string, filters: ProgressFilters): Promise<GoalProgressResponse> => serverApiFetch(`/api/v1/patients/${patientId}/progress/goals?${query(filters)}`);
export const getPlanHistory = (patientId: string, filters: ProgressFilters): Promise<PlanHistoryItem[]> => serverApiFetch(`/api/v1/patients/${patientId}/progress/plan-history?${query(filters)}`);
export const getBodyAnnotationProgress = (patientId: string, filters: ProgressFilters): Promise<BodyAnnotationProgressResponse> => serverApiFetch(`/api/v1/patients/${patientId}/progress/body-annotations?${query(filters)}`);
export const getClinicalTimeline = (patientId: string, filters: Omit<ProgressFilters, 'period'> & { category?: string; cursor?: string }): Promise<ClinicalTimelineResponse> => serverApiFetch(`/api/v1/patients/${patientId}/clinical-timeline?${query(filters as ProgressFilters)}`);
export const listClinicalReports = (patientId: string): Promise<ClinicalReportListResponse> => serverApiFetch(`/api/v1/patients/${patientId}/reports`);
export const createClinicalReport = (patientId: string, body: { period: { from: string; to: string }; sections: string[]; professionalSummary: string | null }): Promise<ClinicalReportResponse> => serverApiFetch(`/api/v1/patients/${patientId}/reports`, json('POST', body));
export const downloadClinicalReport = (id: string): Promise<ClinicalReportDownloadResponse> => serverApiFetch(`/api/v1/clinical-reports/${id}/download`, json('POST'));
export const voidClinicalReport = (id: string, reason: string): Promise<ClinicalReportResponse> => serverApiFetch(`/api/v1/clinical-reports/${id}/void`, json('POST', { reason }));
