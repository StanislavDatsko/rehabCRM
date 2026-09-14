export const PROGRESS_PERIODS = ['30d', '90d', 'current-plan', 'custom', 'all'] as const;
export type ProgressPeriod = (typeof PROGRESS_PERIODS)[number];

export const CLINICAL_TIMELINE_CATEGORIES = [
  'ENCOUNTER', 'ASSESSMENT', 'MEASUREMENT', 'REHABILITATION_PLAN', 'GOAL', 'BODY_ANNOTATION',
] as const;
export type ClinicalTimelineCategory = (typeof CLINICAL_TIMELINE_CATEGORIES)[number];
export type ProgressPeriodResponse = { key: ProgressPeriod; from: string; to: string; bounded: boolean };

export type ClinicalTimelineItem = {
  id: string;
  category: ClinicalTimelineCategory;
  occurredAt: string;
  title: string;
  description: string | null;
  encounterId: string | null;
  source: { type: string; id: string };
  link: string | null;
};
export type ClinicalTimelineResponse = {
  items: ClinicalTimelineItem[];
  nextCursor: string | null;
  page: number;
  pageSize: number;
};

export type MeasurementTrendPoint = {
  id: string;
  value: number;
  performedAt: string;
  assessmentId: string;
  encounterId: string | null;
};
export type MeasurementTrendSeries = {
  key: string;
  definition: { id: string; code: string; name: string; category: string };
  region: string | null;
  laterality: string | null;
  unit: string | null;
  baseline: MeasurementTrendPoint;
  latest: MeasurementTrendPoint;
  deltaFromBaseline: number;
  points: MeasurementTrendPoint[];
};
export type MeasurementTrendsResponse = { period: ProgressPeriodResponse; series: MeasurementTrendSeries[] };

export type GoalProgressItem = {
  id: string;
  planId: string;
  planRevisionId: string;
  planRevisionNumber: number;
  title: string;
  status: string;
  region: string | null;
  laterality: string | null;
  baseline: { value: number; unit: string | null; performedAt: string } | null;
  current: { value: number; unit: string | null; performedAt: string; measurementId: string } | null;
  target: { operator: string; value: number; upperValue: number | null; unit: string | null } | null;
  targetConditionMet: boolean | null;
};
export type GoalProgressResponse = { period: ProgressPeriodResponse; goals: GoalProgressItem[] };

export type PlanRevisionDiff = {
  goals: { added: string[]; removed: string[]; changed: string[] };
  exercises: { added: string[]; removed: string[]; dosageChanged: string[] };
  phases: { added: string[]; removed: string[]; changed: string[] };
};
export type PlanHistoryItem = {
  planId: string;
  planStatus: string;
  revisionId: string;
  revisionNumber: number;
  title: string;
  effectiveFrom: string | null;
  createdAt: string;
  changeSummary: string | null;
  diffFromPrevious: PlanRevisionDiff | null;
};

export type BodyAnnotationProgressGroup = {
  structure: { id: string; code: string; name: string; region: string | null; laterality: string | null };
  type: string;
  activeCount: number;
  resolvedCount: number;
  latestSeverity: number | null;
  firstObservedAt: string;
  lastObservedAt: string;
  annotations: Array<{ id: string; status: string; severity: number | null; createdAt: string; resolvedAt: string | null; encounterId: string | null }>;
};
export type BodyAnnotationProgressResponse = { period: ProgressPeriodResponse; groups: BodyAnnotationProgressGroup[] };

export type ProgressSummaryResponse = {
  period: ProgressPeriodResponse;
  counts: { completedEncounters: number; completedAssessments: number; comparableMeasurementSeries: number; activeGoals: number; activeBodyAnnotations: number };
  currentPlan: { id: string; title: string; status: string; revisionNumber: number } | null;
  latestClinicalActivityAt: string | null;
};

export const CLINICAL_REPORT_SECTIONS = ['SUMMARY', 'MEASUREMENT_TRENDS', 'GOAL_PROGRESS', 'PLAN_HISTORY', 'BODY_ANNOTATIONS'] as const;
export type ClinicalReportSection = (typeof CLINICAL_REPORT_SECTIONS)[number];
export type ClinicalReportStatus = 'DRAFT' | 'GENERATING' | 'COMPLETED' | 'FAILED' | 'VOIDED';
export type ClinicalReportResponse = {
  id: string;
  patientId: string;
  type: 'PROGRESS';
  status: ClinicalReportStatus;
  period: { from: string; to: string };
  configuration: { sections: ClinicalReportSection[]; professionalSummary: string | null };
  templateVersion: string;
  generatedBy: { id: string; displayName: string };
  createdAt: string;
  generatedAt: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  failureCode: string | null;
};
export type ClinicalReportListResponse = { items: ClinicalReportResponse[] };
export type ClinicalReportDownloadResponse = { url: string; expiresAt: string };
