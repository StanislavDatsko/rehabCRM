'use client';

import { useEffect, useMemo, useState } from 'react';
import AnatomyScene from './scene';
import type { AtlasSelection, AtlasStatus } from './scene';
import { DEFAULT_VISIBLE, SYSTEMS, type Atlas, type Concept, type SceneState, type SystemId } from './anatomy';

const initialState: SceneState = { explode: 0, visible: [...DEFAULT_VISIBLE, 'integumentary'], selected: [], hidden: [], severity: {}, isolate: false, view: 'three-quarter', rotate: false, reset: 0, fit: 0 };

export function HumanAtlasExplorer({ onSelect, severity = {}, severityColors = {}, markerPoints = {}, highlightSourcePartId, clinicalMode = false, onToggleClinicalMode }: { onSelect?: (selection: AtlasSelection) => void; severity?: Record<string, number>; severityColors?: Record<string, string>; markerPoints?: SceneState['markerPoints']; highlightSourcePartId?: string | null; clinicalMode?: boolean; onToggleClinicalMode?: () => void }) {
  const [atlas, setAtlas] = useState<Atlas | null>(null);
  const [state, setState] = useState<SceneState>(initialState);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Concept | null>(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<AtlasStatus>('loading');
  const [retry, setRetry] = useState(0);
  const [heatmapEnabled, setHeatmapEnabled] = useState(true);
  const [placedMarker, setPlacedMarker] = useState<SceneState['markerPoints']>({});
  useEffect(() => { let cancelled = false; setStatus('loading'); setError(''); fetch('/api/anatomy/human-atlas/assets').then(async (response) => { if (!response.ok) { const body = await response.json().catch(() => null) as { code?: string } | null; throw new Error(`Human Atlas assets request failed (${response.status}${body?.code ? `: ${body.code}` : ''}).`); } return response.json() as Promise<Array<{ kind: 'MANIFEST' | 'GEOMETRY_CHUNK'; assetIndex: number; url: string }>>; }).then(async (assets) => { const manifestAsset = assets.find((asset) => asset.kind === 'MANIFEST'); if (!manifestAsset) throw new Error('Human Atlas manifest asset is missing.'); const loaded = await fetch(manifestAsset.url); if (!loaded.ok) throw new Error(`Human Atlas manifest request failed (${loaded.status}).`); const manifest = await loaded.json() as Atlas; manifest.chunks = manifest.chunks.map((chunk, index) => ({ ...chunk, gzip: assets.find((asset) => asset.kind === 'GEOMETRY_CHUNK' && asset.assetIndex === index)?.url ?? chunk.gzip })); if (!cancelled) setAtlas(manifest); }).catch((reason: unknown) => { if (!cancelled) { setStatus('error'); setError(reason instanceof Error ? reason.message : 'Human Atlas could not be loaded.'); } }); return () => { cancelled = true; }; }, [retry]);
  useEffect(() => {
    if (!highlightSourcePartId || !atlas?.parts.some((part) => part.id === highlightSourcePartId)) return;
    const part = atlas.parts.find((item) => item.id === highlightSourcePartId);
    if (!part) return;
    setSelected({ id: part.conceptId, name: part.name, elements: [part.id] });
    setState((current) => ({ ...current, selected: [part.id], isolate: true, fit: current.fit + 1 }));
  }, [atlas, highlightSourcePartId]);
  const results = useMemo(() => { if (!atlas) return []; const term = query.trim().toLowerCase(); return atlas.concepts.filter((concept) => !term || concept.name.toLowerCase().includes(term) || concept.id.toLowerCase().includes(term)).slice(0, 60); }, [atlas, query]);
  const choose = (concept: Concept) => { setSelected(concept); setState((current) => ({ ...current, selected: concept.elements, isolate: false })); };
  const toggleSystem = (id: SystemId) => setState((current) => ({ ...current, visible: current.visible.includes(id) ? current.visible.filter((item) => item !== id) : [...current.visible, id], selected: [], isolate: false }));
  const reset = () => { setState({ ...initialState, reset: state.reset + 1 }); setSelected(null); };
  return <div data-testid="human-atlas-root" data-atlas-status={status} className={`atlas-workspace ${clinicalMode ? 'atlas-workspace-clinical' : ''}`}>
    <div className="atlas-stage">{atlas ? <AnatomyScene atlas={atlas} state={{ ...state, severity: heatmapEnabled ? severity : {}, severityColors, markerPoints: clinicalMode ? placedMarker : {} }} onSelect={(selection) => { if (clinicalMode && state.isolate) setPlacedMarker({ [selection.sourcePartId]: { position: selection.anchor.localPosition, title: 'Нова точка', note: null, severity: null, color: null } }); onSelect?.(selection); const part = atlas.parts.find((item) => item.id === selection.sourcePartId); if (part) choose({ id: part.conceptId, name: part.name, elements: [part.id] }); }} onProgress={setProgress} onError={setError} onStatus={setStatus} /> : null}</div>
    <div className="hidden" />
    <header className="atlas-heading"><div><p className="text-xs uppercase tracking-[0.18em] text-info">Primary anatomy source</p><h2 className="text-lg font-semibold">Human Atlas</h2><p className="text-sm text-white/65">BodyParts3D 4.0 · {atlas?.parts.length.toLocaleString('uk-UA') ?? '2 234'} source parts · 15 systems</p></div><button type="button" className={`atlas-heatmap-toggle ${clinicalMode ? 'is-active' : ''}`} onClick={onToggleClinicalMode}><span className="atlas-heatmap-dot" />{clinicalMode ? 'Закрити панель' : 'Теплова мапа'}</button></header>
    <aside className={`atlas-browser ${clinicalMode ? 'atlas-browser-clinical-hidden' : ''}`}>
      <div className="atlas-browser-heading"><div><p className="atlas-browser-eyebrow">Anatomy explorer</p><h3>Find a structure</h3></div><span className="atlas-browser-count">{results.length}</span></div>
      <label className="atlas-search"><span className="sr-only">Search anatomical concepts</span><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Femur, heart…" /></label>
      <div className="atlas-results" aria-label="Anatomical concepts">{results.map((concept) => <button key={concept.id} type="button" onClick={() => choose(concept)} className="atlas-result"><span>{concept.name}</span><small>{concept.elements.length}</small></button>)}</div>
      <div className="atlas-systems"><div className="atlas-systems-heading"><p>Visible systems</p><span>{state.visible.length}/{SYSTEMS.length}</span></div>{SYSTEMS.map((system) => <label key={system.id} className="atlas-system"><input type="checkbox" checked={state.visible.includes(system.id)} onChange={() => toggleSystem(system.id)} /><span className="atlas-checkbox" aria-hidden="true">✓</span><span>{system.name}</span></label>)}</div>
    </aside>
    <div className="atlas-toolbar"><button type="button" className="rc-btn rc-btn-secondary" disabled={!state.selected.length} onClick={() => setState((current) => ({ ...current, isolate: !current.isolate }))}>{state.isolate ? 'Show all' : 'Isolate'}</button><button type="button" className="rc-btn rc-btn-secondary" disabled={!state.selected.length} onClick={() => setState((current) => ({ ...current, isolate: true, reset: current.reset + 1 }))}>Fit selected</button><button type="button" className="rc-btn rc-btn-secondary" disabled={!state.selected.length} onClick={() => setState((current) => ({ ...current, hidden: [...new Set([...current.hidden, ...current.selected])], selected: [], isolate: false }))}>Hide selected</button><button type="button" className="rc-btn rc-btn-secondary" disabled={!state.hidden.length} onClick={() => setState((current) => ({ ...current, hidden: [], reset: current.reset + 1 }))}>Unhide all</button><div className="atlas-camera-controls" aria-label="Camera views">{(['front','back','side'] as const).map((view) => <button key={view} type="button" className="atlas-camera-button" aria-pressed={state.view === view} onClick={() => setState((current) => ({ ...current, view, reset: current.reset + 1 }))}>{view}</button>)}</div><label className="ml-auto flex min-w-48 items-center gap-2 text-xs">Exploded<input aria-label="Exploded view" type="range" min="0" max="1" step="0.01" value={state.explode} onChange={(event) => setState((current) => ({ ...current, explode: Number(event.target.value) }))} /></label><button type="button" className="text-xs text-info underline" onClick={reset}>Reset</button><a className="text-xs text-info underline" href="/docs/third-party/bodyparts3d.md">Source & attribution</a></div>
    {selected ? <div className="atlas-selection"><p className="text-xs uppercase tracking-wide text-text-secondary">Source selection</p><h2 className="mt-1 font-medium">{selected.name}</h2><p className="text-xs text-text-secondary">{selected.id} · {selected.elements.length} mesh(es). Clinical annotation requires a separate verified RehabMIS mapping.</p></div> : null}<p className="atlas-context">{Object.keys(severity).length ? 'Heatmap: stored clinical severity only.' : 'No stored severity for this source view — geometry is neutral.'}</p>
    {progress < 100 && !error ? <p role="status" className="atlas-load-status">Loading atlas… {progress}%</p> : null}{error ? <div role="alert" className="atlas-load-status flex flex-wrap items-center gap-3 text-danger"><span>{error}</span><button type="button" className="rc-btn rc-btn-secondary" onClick={() => { setAtlas(null); setRetry(value => value + 1); }}>Retry</button></div> : null}
  </div>;
}
