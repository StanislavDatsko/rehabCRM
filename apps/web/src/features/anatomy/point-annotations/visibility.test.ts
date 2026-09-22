import { describe, expect, it } from 'vitest';
import {
  canCreatePointAt,
  cardPlacement,
  excerpt,
  NO_ISOLATION,
  visiblePointAnnotations,
} from './visibility';

const biceps = { id: 'a1', partId: 'FJ2000', structureId: 'biceps' };
const triceps = { id: 'a2', partId: 'FJ3000', structureId: 'triceps' };
const structureOf = (partId: string) => ({ FJ2000: 'biceps', FJ3000: 'triceps' })[partId];

describe('visiblePointAnnotations', () => {
  it('hides every point on the full-body view', () => {
    expect(visiblePointAnnotations([biceps, triceps], NO_ISOLATION, structureOf)).toEqual([]);
    expect(
      visiblePointAnnotations([biceps], { isolate: false, partIds: ['FJ2000'] }, structureOf),
    ).toEqual([]);
  });

  it('shows only the isolated structure and hides the previous one', () => {
    const isolation = { isolate: true, partIds: ['FJ2000'] };
    expect(visiblePointAnnotations([biceps, triceps], isolation, structureOf)).toEqual([biceps]);
    const next = { isolate: true, partIds: ['FJ3000'] };
    expect(visiblePointAnnotations([biceps, triceps], next, structureOf)).toEqual([triceps]);
  });

  it('requires the stored structure to match the mapping of the isolated mesh', () => {
    const stale = { id: 'a3', partId: 'FJ2000', structureId: 'old-structure' };
    expect(
      visiblePointAnnotations([stale], { isolate: true, partIds: ['FJ2000'] }, structureOf),
    ).toEqual([]);
  });

  it('supports structures made of several meshes', () => {
    const items = [biceps, { ...biceps, id: 'a4', partId: 'FJ2001' }];
    const structure = (partId: string) => (partId.startsWith('FJ200') ? 'biceps' : undefined);
    expect(
      visiblePointAnnotations(items, { isolate: true, partIds: ['FJ2000', 'FJ2001'] }, structure),
    ).toHaveLength(2);
  });
});

describe('canCreatePointAt', () => {
  it('allows creation only on the isolated mesh with the create permission', () => {
    const isolation = { isolate: true, partIds: ['FJ2000'] };
    expect(canCreatePointAt({ isolation, partId: 'FJ2000', canCreate: true })).toBe(true);
    expect(canCreatePointAt({ isolation, partId: 'FJ3000', canCreate: true })).toBe(false);
    expect(canCreatePointAt({ isolation, partId: 'FJ2000', canCreate: false })).toBe(false);
    expect(canCreatePointAt({ isolation: NO_ISOLATION, partId: 'FJ2000', canCreate: true })).toBe(
      false,
    );
  });
});

describe('cardPlacement', () => {
  const card = { width: 240, height: 80 };
  const viewport = { width: 800, height: 600 };

  it('opens to the right when there is room', () => {
    const placement = cardPlacement({ marker: { x: 300, y: 300 }, card, viewport });
    expect(placement.side).toBe('right');
    expect(placement.x).toBe(322);
    expect(placement.y).toBe(260);
    expect(placement.anchor).toEqual({ x: 322, y: 300 });
  });

  it('flips to the left near the right edge', () => {
    const placement = cardPlacement({ marker: { x: 700, y: 300 }, card, viewport });
    expect(placement.side).toBe('left');
    expect(placement.x).toBe(700 - 22 - 240);
    expect(placement.anchor.x).toBe(placement.x + card.width);
  });

  it('keeps the card inside the viewer near the top and bottom', () => {
    expect(cardPlacement({ marker: { x: 300, y: 10 }, card, viewport }).y).toBe(8);
    expect(cardPlacement({ marker: { x: 300, y: 590 }, card, viewport }).y).toBe(600 - 80 - 8);
  });

  it('clamps horizontally when neither side fits', () => {
    const narrow = { width: 260, height: 600 };
    const placement = cardPlacement({ marker: { x: 130, y: 300 }, card, viewport: narrow });
    expect(placement.x).toBe(12);
    expect(placement.x + card.width).toBeLessThanOrEqual(narrow.width - 8);
  });
});

describe('excerpt', () => {
  it('collapses whitespace and truncates with an ellipsis', () => {
    expect(excerpt('  Біль   при згинанні ')).toBe('Біль при згинанні');
    expect(excerpt('a'.repeat(200), 20)).toHaveLength(20);
    expect(excerpt('a'.repeat(200), 20).endsWith('…')).toBe(true);
  });
});
