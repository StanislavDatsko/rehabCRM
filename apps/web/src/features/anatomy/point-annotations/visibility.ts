/** Isolation state reported by the Human Atlas explorer. */
export type IsolationState = { isolate: boolean; partIds: readonly string[] };

export const NO_ISOLATION: IsolationState = { isolate: false, partIds: [] };

/**
 * Point annotations are visible only for the structure that is currently isolated.
 * Full-body view and every other structure hide them, even for the same patient.
 */
export function visiblePointAnnotations<T extends { partId: string; structureId: string }>(
  items: readonly T[],
  isolation: IsolationState,
  structureIdForPart: (partId: string) => string | null | undefined,
): T[] {
  if (!isolation.isolate || isolation.partIds.length === 0) return [];
  const parts = new Set(isolation.partIds);
  return items.filter(
    (item) => parts.has(item.partId) && structureIdForPart(item.partId) === item.structureId,
  );
}

export function canCreatePointAt(input: {
  isolation: IsolationState;
  partId: string;
  canCreate: boolean;
}): boolean {
  return (
    input.canCreate && input.isolation.isolate && input.isolation.partIds.includes(input.partId)
  );
}

export type CardSide = 'right' | 'left';

export type CardPlacement = {
  side: CardSide;
  /** Top-left corner of the card inside the viewer. */
  x: number;
  y: number;
  /** Point on the card edge that the connector line should meet. */
  anchor: { x: number; y: number };
};

/**
 * Prefer opening to the right of the marker, fall back to the left, and keep the card inside the
 * viewer vertically. Pure so it can be verified without a DOM.
 */
export function cardPlacement(input: {
  marker: { x: number; y: number };
  card: { width: number; height: number };
  viewport: { width: number; height: number };
  gap?: number;
  margin?: number;
}): CardPlacement {
  const gap = input.gap ?? 22;
  const margin = input.margin ?? 8;
  const { marker, card, viewport } = input;
  const fitsRight = marker.x + gap + card.width <= viewport.width - margin;
  const fitsLeft = marker.x - gap - card.width >= margin;
  const side: CardSide = fitsRight || !fitsLeft ? 'right' : 'left';
  const unclampedX = side === 'right' ? marker.x + gap : marker.x - gap - card.width;
  const maxX = Math.max(margin, viewport.width - card.width - margin);
  const x = Math.min(Math.max(unclampedX, margin), maxX);
  const maxY = Math.max(margin, viewport.height - card.height - margin);
  const y = Math.min(Math.max(marker.y - card.height / 2, margin), maxY);
  const anchor = { x: side === 'right' ? x : x + card.width, y: y + card.height / 2 };
  return { side, x, y, anchor };
}

export function excerpt(text: string, max = 96): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}
