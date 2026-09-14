import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AnatomyViewerUnavailable } from './anatomy-viewer-loader';

describe('anatomy viewer fallback', () => {
  it('keeps the textual clinical workspace available when 3D fails', () => {
    const html = renderToStaticMarkup(<AnatomyViewerUnavailable />);
    expect(html).toContain('role="alert"');
    expect(html).toContain('annotation list and clinical context remain usable');
  });
});
