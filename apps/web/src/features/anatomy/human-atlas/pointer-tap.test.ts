import { describe, expect, it } from 'vitest';
import { PointerTap } from './pointer-tap';

describe('PointerTap', () => {
  it('accepts a click that barely moves', () => {
    const tap = new PointerTap();
    tap.down(1, 100, 100, 5);
    tap.move(1, 102, 101);
    expect(tap.up(1, 103, 101)).toBe(true);
  });

  it('rejects an orbit drag so no annotation is created', () => {
    const tap = new PointerTap();
    tap.down(1, 100, 100, 5);
    tap.move(1, 140, 90);
    tap.move(1, 220, 60);
    expect(tap.up(1, 220, 60)).toBe(false);
  });

  it('rejects a pinch or two-finger pan and a cancelled pointer', () => {
    const pinch = new PointerTap();
    pinch.down(1, 100, 100, 12);
    pinch.down(2, 160, 100, 12);
    expect(pinch.up(1, 100, 100)).toBe(false);
    const cancelled = new PointerTap();
    cancelled.down(3, 10, 10, 5);
    cancelled.cancel(3);
    expect(cancelled.up(3, 10, 10)).toBe(false);
  });

  it('uses a wider threshold for touch than for a mouse', () => {
    const touch = new PointerTap();
    touch.down(1, 50, 50, 12);
    expect(touch.up(1, 58, 55)).toBe(true);
    const mouse = new PointerTap();
    mouse.down(1, 50, 50, 5);
    expect(mouse.up(1, 58, 55)).toBe(false);
  });
});
