'use client';

import dynamic from 'next/dynamic';
import React, { Component, type ComponentProps } from 'react';

const LazyViewer = dynamic(
  () => import('./anatomy-viewer').then((module) => module.AnatomyViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[620px] animate-pulse items-center justify-center rounded-xl border border-border bg-surface-muted text-sm text-text-secondary">
        Loading 3D anatomy…
      </div>
    ),
  },
);

export function AnatomyViewerUnavailable() {
  return (
    <div
      role="alert"
      className="flex h-52 items-center justify-center rounded-xl border border-warning/40 bg-warning/5 p-6 text-center text-sm shadow-sm"
    >
      The 3D view is unavailable. The annotation list and clinical context remain usable below.
    </div>
  );
}

export class AnatomyViewerBoundary extends Component<
  ComponentProps<typeof LazyViewer>,
  { failed: boolean }
> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    if (this.state.failed) return <AnatomyViewerUnavailable />;
    return <LazyViewer {...this.props} />;
  }
}
