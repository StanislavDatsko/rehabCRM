'use client';

import React from 'react';
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Renders into document.body in the browser and inline during static rendering. */
export function Portal({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useEffect(() => setTarget(document.body), []);
  return target ? createPortal(children, target) : <>{children}</>;
}
