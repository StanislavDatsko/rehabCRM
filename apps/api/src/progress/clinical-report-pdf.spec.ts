import { describe, expect, it } from 'vitest';
import { ClinicalReportPdfService } from './clinical-report-pdf';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

describe('clinical report PDF', () => {
  it('renders a real PDF with Ukrainian source text', async () => {
    const period = { key: 'custom' as const, from: '2026-08-01T00:00:00.000Z', to: '2026-09-01T00:00:00.000Z', bounded: true };
    const buffer = await new ClinicalReportPdfService().render({
      organizationName: 'Демонстраційний центр', patientName: 'Пацієнт Тестовий', period,
      generatedAt: new Date('2026-09-03T12:00:00.000Z'), generatedBy: 'Фахівець', professionalSummary: 'Задокументована динаміка.',
      sections: ['SUMMARY', 'MEASUREMENT_TRENDS', 'GOAL_PROGRESS', 'PLAN_HISTORY', 'BODY_ANNOTATIONS'],
      summary: { period, counts: { completedEncounters: 2, completedAssessments: 2, comparableMeasurementSeries: 1, activeGoals: 1, activeBodyAnnotations: 1 }, currentPlan: null, latestClinicalActivityAt: null },
      measurements: { period, series: [{
        key: 'flexion|knee|LEFT', definition: { id: 'definition', code: 'rom.flexion', name: 'Згинання колінного суглоба', category: 'RANGE_OF_MOTION' }, region: 'knee', laterality: 'LEFT', unit: 'deg',
        baseline: { id: 'm1', value: 95, performedAt: '2026-08-01T09:00:00.000Z', assessmentId: 'a1', encounterId: 'e1' },
        latest: { id: 'm3', value: 120, performedAt: '2026-09-01T09:00:00.000Z', assessmentId: 'a3', encounterId: 'e3' }, deltaFromBaseline: 25,
        points: [
          { id: 'm1', value: 95, performedAt: '2026-08-01T09:00:00.000Z', assessmentId: 'a1', encounterId: 'e1' },
          { id: 'm2', value: 110, performedAt: '2026-08-15T09:00:00.000Z', assessmentId: 'a2', encounterId: 'e2' },
          { id: 'm3', value: 120, performedAt: '2026-09-01T09:00:00.000Z', assessmentId: 'a3', encounterId: 'e3' },
        ],
      }] },
      goals: { period, goals: [{ id: 'goal', planId: 'plan', planRevisionId: 'revision', planRevisionNumber: 2, title: 'Збільшити згинання лівого коліна', status: 'IN_PROGRESS', region: 'knee', laterality: 'LEFT', baseline: { value: 95, unit: 'deg', performedAt: '2026-08-01T09:00:00.000Z' }, current: { value: 120, unit: 'deg', performedAt: '2026-09-01T09:00:00.000Z', measurementId: 'm3' }, target: { operator: 'GREATER_THAN_OR_EQUAL', value: 125, upperValue: null, unit: 'deg' }, targetConditionMet: false }] },
      planHistory: [{ planId: 'plan', planStatus: 'ACTIVE', revisionId: 'revision', revisionNumber: 2, title: 'Відновлення функції лівого коліна', effectiveFrom: '2026-08-20T09:00:00.000Z', createdAt: '2026-08-20T09:00:00.000Z', changeSummary: 'Оновлено ціль згинання та дозування після повторного оцінювання.', diffFromPrevious: { goals: { added: [], removed: [], changed: ['Згинання'] }, exercises: { added: [], removed: [], dosageChanged: ['Ковзання пʼятою'] }, phases: { added: [], removed: [], changed: ['Рух'] } } }],
      annotations: { period, groups: [{ structure: { id: 'knee', code: 'knee.left', name: 'Лівий колінний суглоб', region: 'knee', laterality: 'LEFT' }, type: 'PAIN', activeCount: 1, resolvedCount: 1, latestSeverity: 2, firstObservedAt: '2026-08-01T09:00:00.000Z', lastObservedAt: '2026-09-01T09:00:00.000Z', annotations: [{ id: 'annotation', status: 'ACTIVE', severity: 2, createdAt: '2026-09-01T09:00:00.000Z', resolvedAt: null, encounterId: 'e3' }] }] },
    });
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
    expect(buffer.length).toBeGreaterThan(5_000);
    if (process.env.PHASE8_PDF_OUTPUT) {
      await mkdir(dirname(process.env.PHASE8_PDF_OUTPUT), { recursive: true });
      await writeFile(process.env.PHASE8_PDF_OUTPUT, buffer);
    }
  });
});
