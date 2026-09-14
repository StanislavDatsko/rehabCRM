import { describe, expect, it } from 'vitest';
import { diffPlanRevisions, type DiffableRevision } from './progress-diff';

const revision = (): DiffableRevision => ({
  goals: [{ title: 'Згинання', status: 'IN_PROGRESS', target: '>=|120' }],
  phases: [{ name: 'Рух', criteria: 'Без загострення', dates: '1|2' }],
  exercises: [{ code: 'heel-slide', name: 'Ковзання', dosage: '3|10' }],
});

describe('domain-aware plan revision diff', () => {
  it('separates goal, exercise dosage and phase changes', () => {
    const before = revision();
    const after = revision();
    after.goals[0]!.target = '>=|125';
    after.exercises[0]!.dosage = '4|10';
    after.phases.push({ name: 'Сила', criteria: null, dates: '2|3' });
    expect(diffPlanRevisions(before, after)).toEqual({
      goals: { added: [], removed: [], changed: ['Згинання'] },
      exercises: { added: [], removed: [], dosageChanged: ['heel-slide'] },
      phases: { added: ['Сила'], removed: [], changed: [] },
    });
  });
});
