'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import AnatomyScene from './scene';
import { matchesAnatomyQuery, ukrainianName } from './anatomy-uk';
import type { AtlasSelection, AtlasStatus } from './scene';
import { DEFAULT_VISIBLE, SYSTEMS, type Atlas, type Concept, type SceneState, type SystemId } from './anatomy';
import type { MarkerProjector } from '../point-annotations/projection';
import type { IsolationState } from '../point-annotations/visibility';

const initialState: SceneState = { explode: 0, visible: [...DEFAULT_VISIBLE, 'integumentary'], selected: [], hidden: [], severity: {}, isolate: false, view: 'three-quarter', rotate: false, reset: 0, fit: 0 };

export function HumanAtlasExplorer({ onSelect, onSurfaceTap, onIsolationChange, projector, stageOverlay, severity = {}, severityColors = {}, highlightSourcePartId, clinicalMode = false, onToggleClinicalMode }: {
  onSelect?: (selection: AtlasSelection) => void;
  /** Tap on the surface of the currently isolated structure. Selection does not change. */
  onSurfaceTap?: (selection: AtlasSelection) => void;
  onIsolationChange?: (isolation: IsolationState) => void;
  projector?: MarkerProjector;
  /** Overlay rendered inside the 3D stage, above the canvas (point annotation layer). */
  stageOverlay?: ReactNode;
  severity?: Record<string, number>;
  severityColors?: Record<string, string>;
  highlightSourcePartId?: string | null;
  clinicalMode?: boolean;
  onToggleClinicalMode?: () => void;
}) {
  const [atlas, setAtlas] = useState<Atlas | null>(null);
  const [state, setState] = useState<SceneState>(initialState);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Concept | null>(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<AtlasStatus>('loading');
  const [retry, setRetry] = useState(0);
  const [heatmapEnabled] = useState(true);
  const isolationListener = useRef(onIsolationChange);
  isolationListener.current = onIsolationChange;
  const isolationKey = `${state.isolate ? 1 : 0}:${state.selected.join(',')}`;
  useEffect(() => {
    isolationListener.current?.({ isolate: state.isolate, partIds: state.selected });
  }, [isolationKey]);
  useEffect(() => { let cancelled = false; setStatus('loading'); setError(''); fetch('/api/anatomy/human-atlas/assets').then(async (response) => { if (!response.ok) { const body = await response.json().catch(() => null) as { code?: string } | null; throw new Error(`Human Atlas assets request failed (${response.status}${body?.code ? `: ${body.code}` : ''}).`); } return response.json() as Promise<Array<{ kind: 'MANIFEST' | 'GEOMETRY_CHUNK'; assetIndex: number; url: string }>>; }).then(async (assets) => { const manifestAsset = assets.find((asset) => asset.kind === 'MANIFEST'); if (!manifestAsset) throw new Error('Відсутній маніфест Human Atlas.'); const loaded = await fetch(manifestAsset.url); if (!loaded.ok) throw new Error(`Human Atlas manifest request failed (${loaded.status}).`); const manifest = await loaded.json() as Atlas; manifest.chunks = manifest.chunks.map((chunk, index) => ({ ...chunk, gzip: assets.find((asset) => asset.kind === 'GEOMETRY_CHUNK' && asset.assetIndex === index)?.url ?? chunk.gzip })); if (!cancelled) setAtlas(manifest); }).catch((reason: unknown) => { if (!cancelled) { setStatus('error'); setError(reason instanceof Error ? reason.message : 'Не вдалося завантажити Human Atlas.'); } }); return () => { cancelled = true; }; }, [retry]);
  useEffect(() => {
    if (!highlightSourcePartId || !atlas?.parts.some((part) => part.id === highlightSourcePartId)) return;
    const part = atlas.parts.find((item) => item.id === highlightSourcePartId);
    if (!part) return;
    setSelected({ id: part.conceptId, name: part.name, elements: [part.id] });
    setState((current) => ({ ...current, selected: [part.id], isolate: true, fit: current.fit + 1 }));
  }, [atlas, highlightSourcePartId]);
  const results = useMemo(() => { if (!atlas) return []; const term = query.trim().toLowerCase(); return atlas.concepts.filter((concept) => !term || matchesAnatomyQuery(concept.name, term) || concept.id.toLowerCase().includes(term)).slice(0, 60); }, [atlas, query]);
  const choose = (concept: Concept) => { setSelected(concept); setState((current) => ({ ...current, selected: concept.elements, isolate: false })); };
  // Picking from the list should show the structure: isolate it and frame the camera on it.
  const findStructure = (concept: Concept) => { setSelected(concept); setState((current) => ({ ...current, selected: concept.elements, isolate: true, reset: current.reset + 1 })); };
  const toggleSystem = (id: SystemId) => setState((current) => ({ ...current, visible: current.visible.includes(id) ? current.visible.filter((item) => item !== id) : [...current.visible, id], selected: [], isolate: false }));
  const reset = () => { setState({ ...initialState, reset: state.reset + 1 }); setSelected(null); };
  return <div data-testid="human-atlas-root" data-atlas-status={status} className={`atlas-workspace ${clinicalMode ? 'atlas-workspace-clinical' : ''}`}>
    <div className="atlas-stage">{atlas ? <AnatomyScene atlas={atlas} state={{ ...state, severity: heatmapEnabled ? severity : {}, severityColors }} projector={projector} onSelect={(selection) => {
      // Tapping the isolated mesh anchors a point note instead of re-selecting the structure.
      if (state.isolate && state.selected.includes(selection.sourcePartId)) { onSurfaceTap?.(selection); return; }
      onSelect?.(selection); const part = atlas.parts.find((item) => item.id === selection.sourcePartId); if (part) choose({ id: part.conceptId, name: part.name, elements: [part.id] }); }} onProgress={setProgress} onError={setError} onStatus={setStatus} /> : null}{atlas ? stageOverlay : null}</div>
    <div className="hidden" />
    <header className="atlas-heading"><div><p className="text-xs uppercase tracking-[0.18em] text-info">Основне анатомічне джерело</p><h2 className="text-lg font-semibold">Human Atlas</h2><p className="text-sm text-white/65">BodyParts3D 4.0 · {atlas?.parts.length.toLocaleString('uk-UA') ?? '2 234'} частин джерела · 15 систем</p></div><button type="button" className={`atlas-heatmap-toggle ${clinicalMode ? 'is-active' : ''}`} onClick={onToggleClinicalMode}><span className="atlas-heatmap-dot" />{clinicalMode ? 'Закрити панель' : 'Теплова мапа'}</button></header>
    <aside className={`atlas-browser ${clinicalMode ? 'atlas-browser-clinical-hidden' : ''}`}>
      <div className="atlas-browser-heading"><div><p className="atlas-browser-eyebrow">Анатомічний огляд</p><h3>Знайти структуру</h3></div><span className="atlas-browser-count">{results.length}</span></div>
      <label className="atlas-search"><span className="sr-only">Пошук анатомічних понять</span><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Стегнова кістка, серце…" /></label>
      <div className="atlas-results" aria-label="Анатомічні поняття">{results.map((concept) => <button key={concept.id} type="button" onClick={() => findStructure(concept)} className="atlas-result"><span>{ukrainianName(concept.name)}</span><small>{concept.elements.length}</small></button>)}</div>
      <div className="atlas-systems"><div className="atlas-systems-heading"><p>Видимі системи</p><span>{state.visible.length}/{SYSTEMS.length}</span></div>{SYSTEMS.map((system) => <label key={system.id} className="atlas-system"><input type="checkbox" checked={state.visible.includes(system.id)} onChange={() => toggleSystem(system.id)} /><span className="atlas-checkbox" aria-hidden="true">✓</span><span>{system.name}</span></label>)}</div>
    </aside>
    <div className="atlas-toolbar"><button type="button" className="rc-btn rc-btn-secondary" disabled={!state.selected.length} onClick={() => setState((current) => ({ ...current, isolate: !current.isolate }))}>{state.isolate ? 'Показати все' : 'Ізолювати'}</button><button type="button" className="rc-btn rc-btn-secondary" disabled={!state.selected.length} onClick={() => setState((current) => ({ ...current, isolate: true, reset: current.reset + 1 }))}>Показати вибране</button><button type="button" className="rc-btn rc-btn-secondary" disabled={!state.selected.length} onClick={() => setState((current) => ({ ...current, hidden: [...new Set([...current.hidden, ...current.selected])], selected: [], isolate: false }))}>Сховати вибране</button><button type="button" className="rc-btn rc-btn-secondary" disabled={!state.hidden.length} onClick={() => setState((current) => ({ ...current, hidden: [], reset: current.reset + 1 }))}>Показати все сховане</button><div className="atlas-camera-controls" aria-label="Вигляди камери">{(['front','back','side'] as const).map((view) => <button key={view} type="button" className="atlas-camera-button" aria-pressed={state.view === view} onClick={() => setState((current) => ({ ...current, view, reset: current.reset + 1 }))}>{({ front: 'Спереду', back: 'Ззаду', side: 'Збоку' } as const)[view]}</button>)}</div><label className="ml-auto flex min-w-48 items-center gap-2 text-xs">Розкладено<input aria-label="Розібраний вигляд" type="range" min="0" max="1" step="0.01" value={state.explode} onChange={(event) => setState((current) => ({ ...current, explode: Number(event.target.value) }))} /></label><button type="button" className="text-xs text-info underline" onClick={reset}>Скинути</button><a className="text-xs text-info underline" href="/docs/third-party/bodyparts3d.md">Джерело й авторство</a></div>
    {selected ? <div className="atlas-selection"><p className="text-xs uppercase tracking-wide text-text-secondary">Вибрано з джерела</p><h2 className="mt-1 font-medium">{ukrainianName(selected.name)}</h2><p className="text-xs text-text-secondary">{selected.id} · {selected.elements.length} елементів. Клінічна позначка потребує окремого підтвердженого зіставлення RehabMIS.</p></div> : null}<p className="atlas-context">{Object.keys(severity).length ? 'Теплова мапа: лише збережена клінічна тяжкість.' : 'Для цього вигляду немає збереженої тяжкості — геометрія нейтральна.'}</p>
    {progress < 100 && !error ? <p role="status" className="atlas-load-status">Loading atlas… {progress}%</p> : null}{error ? <div role="alert" className="atlas-load-status flex flex-wrap items-center gap-3 text-danger"><span>{error}</span><button type="button" className="rc-btn rc-btn-secondary" onClick={() => { setAtlas(null); setRetry(value => value + 1); }}>Повторити</button></div> : null}
  </div>;
}
