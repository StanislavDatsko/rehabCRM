import { describe, expect, it } from 'vitest';
import { toRevisionResponse, type RevisionWithContent } from './rehabilitation.mapper';

function revision(): RevisionWithContent {
  const now = new Date('2026-09-02T10:00:00.000Z');
  return {
    id: 'revision',
    organizationId: 'org',
    planId: 'plan',
    basedOnRevisionId: null,
    revisionNumber: 1,
    status: 'PUBLISHED',
    title: 'План',
    description: null,
    startDate: now,
    expectedEndDate: null,
    effectiveFrom: now,
    changeSummary: null,
    createdByUserId: 'user',
    createdAt: now,
    createdBy: { id: 'user', displayName: 'Фахівець' },
    phases: [],
    prescriptions: [],
    goals: [
      {
        id: 'goal',
        organizationId: 'org',
        planRevisionId: 'revision',
        title: 'Згинання',
        description: null,
        category: null,
        anatomicalRegionCode: 'knee',
        laterality: 'LEFT',
        status: 'IN_PROGRESS',
        targetDate: null,
        measurementDefinitionId: 'definition',
        targetOperator: 'GREATER_THAN_OR_EQUAL',
        targetValue: 120,
        targetValueUpper: null,
        targetUnitCode: 'deg',
        baselineMeasurementId: 'baseline',
        baselineNumericValueSnapshot: 95,
        baselineUnitCodeSnapshot: 'deg',
        baselineDefinitionCode: 'rom.flexion',
        baselineDefinitionName: 'Згинання',
        baselinePerformedAt: now,
        displayOrder: 0,
        createdAt: now,
        updatedAt: now,
        measurementDefinition: {
          id: 'definition',
          organizationId: null,
          code: 'rom.flexion',
          name: 'Згинання',
          description: null,
          category: 'RANGE_OF_MOTION',
          valueType: 'NUMBER',
          unitCode: 'deg',
          minimumValue: null,
          maximumValue: null,
          allowedCodedValues: [],
          anatomicalApplicability: 'REQUIRED',
          active: true,
          createdAt: now,
          updatedAt: now,
        },
      },
    ],
  };
}

describe('rehabilitation goal projection', () => {
  it('returns baseline, latest comparable value, and neutral threshold indicator without changing status', () => {
    const response = toRevisionResponse(
      revision(),
      new Map([
        [
          'goal',
          {
            measurementId: 'latest',
            value: 125,
            unit: 'deg',
            performedAt: '2026-09-02T10:00:00.000Z',
          },
        ],
      ]),
    );
    expect(response.goals[0]).toMatchObject({
      status: 'IN_PROGRESS',
      baseline: { measurementId: 'baseline', value: 95 },
      current: { measurementId: 'latest', value: 125 },
      targetValue: 120,
      targetAppearsReached: true,
    });
  });
});
