'use client';

import React from 'react';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { MarkerProjector } from './projection';
import { cardPlacement, type CardSide } from './visibility';

const SHEET_QUERY = '(max-width: 767px)';

export function useIsSheet(): boolean {
  const [sheet, setSheet] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(SHEET_QUERY);
    const sync = () => setSheet(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);
  return sheet;
}

/**
 * A card that floats next to a projected marker and stays connected to it with an SVG line.
 * Positioning happens in the projector's frame callback with direct DOM writes, so camera motion
 * never triggers React renders. On phones the card becomes a bottom sheet without a connector.
 */
export function FloatingCard({
  projector,
  markerId,
  className,
  state = 'open',
  testId,
  labelledBy,
  role,
  children,
  onPointerEnter,
  onPointerLeave,
}: {
  projector: MarkerProjector;
  markerId: string;
  className?: string;
  state?: 'open' | 'closing';
  testId?: string;
  labelledBy?: string;
  role?: string;
  children: ReactNode;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
}) {
  const card = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const line = useRef<SVGLineElement>(null);
  const dot = useRef<SVGCircleElement>(null);
  const sheet = useIsSheet();
  const [side, setSide] = useState<CardSide>('right');

  useLayoutEffect(() => {
    if (sheet) return;
    const element = card.current;
    const layer = element?.parentElement;
    if (!element || !layer) return;
    let lastSide: CardSide | null = null;
    const place = () => {
      const screen = projector.screenOf(markerId);
      const hidden = !screen || !screen.visible;
      element.style.visibility = hidden ? 'hidden' : 'visible';
      if (svg.current) svg.current.style.visibility = hidden ? 'hidden' : 'visible';
      if (!screen || hidden) return;
      const placement = cardPlacement({
        marker: { x: screen.x, y: screen.y },
        card: { width: element.offsetWidth, height: element.offsetHeight },
        viewport: { width: layer.clientWidth, height: layer.clientHeight },
      });
      element.style.left = `${placement.x.toFixed(1)}px`;
      element.style.top = `${placement.y.toFixed(1)}px`;
      if (placement.side !== lastSide) {
        lastSide = placement.side;
        setSide(placement.side);
      }
      line.current?.setAttribute('x1', screen.x.toFixed(1));
      line.current?.setAttribute('y1', screen.y.toFixed(1));
      line.current?.setAttribute('x2', placement.anchor.x.toFixed(1));
      line.current?.setAttribute('y2', placement.anchor.y.toFixed(1));
      dot.current?.setAttribute('cx', placement.anchor.x.toFixed(1));
      dot.current?.setAttribute('cy', placement.anchor.y.toFixed(1));
    };
    place();
    const unsubscribe = projector.onUpdate(place);
    const observer = new ResizeObserver(place);
    observer.observe(element);
    observer.observe(layer);
    return () => {
      unsubscribe();
      observer.disconnect();
    };
  }, [projector, markerId, sheet]);

  return (
    <>
      {sheet ? null : (
        <svg ref={svg} className="pa-connector" aria-hidden="true" focusable="false">
          <line ref={line} x1="0" y1="0" x2="0" y2="0" />
          <circle ref={dot} r="2.2" />
        </svg>
      )}
      <div
        ref={card}
        role={role}
        aria-labelledby={labelledBy}
        data-testid={testId}
        data-side={side}
        data-state={state}
        className={`pa-card ${sheet ? 'pa-card--sheet' : ''} ${className ?? ''}`}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        onPointerDown={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </>
  );
}
