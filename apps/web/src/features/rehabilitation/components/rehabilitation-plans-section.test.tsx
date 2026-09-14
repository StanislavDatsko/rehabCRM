import type { RehabilitationPlanListItem } from '@repo/contracts';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RehabilitationPlansSection } from './rehabilitation-plans-section';

const plan: RehabilitationPlanListItem = {
  id: 'plan-1',
  status: 'ACTIVE',
  title: 'Відновлення коліна',
  startDate: '2026-09-02',
  expectedEndDate: null,
  responsiblePractitioner: { id: 'practitioner-1', displayName: 'Фахівець' },
  currentRevisionNumber: 2,
  hasDraftRevision: true,
  goalCount: 2,
  prescriptionCount: 3,
  version: 4,
  updatedAt: '2026-09-02T10:00:00.000Z',
};

describe('RehabilitationPlansSection', () => {
  it('renders a useful empty state and create link', () => {
    const html = renderToStaticMarkup(
      <RehabilitationPlansSection patientId="patient-1" plans={[]} canCreate />,
    );
    expect(html).toContain('Планів ще немає');
    expect(html).toContain('/app/patients/patient-1/rehabilitation/new');
  });

  it('renders plan status, counts, and draft revision signal', () => {
    const html = renderToStaticMarkup(
      <RehabilitationPlansSection patientId="patient-1" plans={[plan]} canCreate={false} />,
    );
    expect(html).toContain('Відновлення коліна');
    expect(html).toContain('Активний');
    expect(html).toContain('цілей: 2');
    expect(html).toContain('Є неопублікована редакція');
    expect(html).not.toContain('Новий план');
  });
});
