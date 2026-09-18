'use client';

import type {
  BodyAnnotationStatus,
  BodyAnnotationType,
  PatientBodyMapResponse,
} from '@repo/contracts';
import { useActionState, useMemo, useState } from 'react';
import { createBodyAnnotationAction, type AnatomyActionState } from '../actions/anatomy-actions';
import {
  ANATOMY_LAYER_LABELS,
  BODY_ANNOTATION_TYPE_LABELS,
  BODY_ANNOTATION_TYPES,
} from '../anatomy-ui';
import {
  filterBodyAnnotations,
  renderTargetForStructure,
  searchAnatomicalStructures,
} from '../body-map-view-model';
import { AnnotationEditor } from './annotation-editor';
import { AnatomyViewerBoundary } from './anatomy-viewer-loader';
import type { SurfaceSelection, UnmappedSurfaceSelection } from './anatomy-viewer';
import { StructureInspector } from './structure-inspector';
import { HumanAtlasExplorer } from '../human-atlas/human-atlas-explorer';
import type { AtlasSelection } from '../human-atlas/scene';

const initial: AnatomyActionState = { error: null, ok: false };

export function BodyMapWorkspace({
  data,
  encounterId,
  initialStructureId,
  permissions,
}: {
  data: PatientBodyMapResponse;
  encounterId?: string;
  initialStructureId?: string;
  permissions: { create: boolean; update: boolean; resolve: boolean; void: boolean };
}) {
  const [layers, setLayers] = useState<Record<string, { visible: boolean; opacity: number }>>({
    MUSCULAR: { visible: true, opacity: 0.82 },
    SKELETAL: { visible: true, opacity: 0.92 },
    JOINTS: { visible: true, opacity: 0.9 },
  });
  const [search, setSearch] = useState('');
  const [selectedStructureId, setSelectedStructureId] = useState<string | null>(() =>
    data.structures.some((item) => item.id === initialStructureId) ? initialStructureId! : null,
  );
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [selection, setSelection] = useState<SurfaceSelection | null>(null);
  const [unmappedSelection, setUnmappedSelection] = useState<UnmappedSurfaceSelection | null>(null);
  const [isolate, setIsolate] = useState(false);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [hiddenMeshKeys, setHiddenMeshKeys] = useState<Set<string>>(new Set());
  const [heatmap, setHeatmap] = useState(false);
  const [preset, setPreset] = useState('anterior');
  const [viewerMessage, setViewerMessage] = useState<string | null>(null);
  const [showHistoricalViewer, setShowHistoricalViewer] = useState(false);
  const [status, setStatus] = useState<'ALL' | BodyAnnotationStatus>('ALL');
  const [type, setType] = useState<'ALL' | BodyAnnotationType>('ALL');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [createState, createAction, creating] = useActionState(createBodyAnnotationAction, initial);
  const structures = useMemo(
    () => searchAnatomicalStructures(data.structures, search),
    [data.structures, search],
  );
  const annotations = useMemo(
    () =>
      filterBodyAnnotations(data.annotations, {
        status,
        type,
        structureId: selectedStructureId,
        from,
        to,
      }),
    [data.annotations, from, selectedStructureId, status, to, type],
  );
  const selectedAnnotation =
    data.annotations.find((item) => item.id === selectedAnnotationId) ?? null;
  const selectedStructure = data.structures.find((item) => item.id === selectedStructureId) ?? null;
  const context = data.clinicalContext.find((item) => item.structureId === selectedStructureId);
  const hasSelection = Boolean(selectedStructureId || unmappedSelection);
  const heatmapHasData = data.annotations.some(
    (item) => item.status === 'ACTIVE' && item.severity !== null,
  );
  const humanAtlasSeverity = useMemo(() => {
    const result: Record<string, number> = {};
    data.mappings.forEach((mapping) => {
      if (!mapping.sourcePartId) return;
      const maximum = data.annotations
        .filter((annotation) => annotation.status === 'ACTIVE' && annotation.structure.id === mapping.structureId && annotation.severity !== null)
        .reduce((value, annotation) => Math.max(value, annotation.severity ?? 0), 0);
      if (maximum > 0) result[mapping.sourcePartId] = maximum;
    });
    return result;
  }, [data.annotations, data.mappings]);
  const chooseSurface = (next: SurfaceSelection) => {
    setSelection(next);
    setUnmappedSelection(null);
    setSelectedStructureId(next.mapping.structureId);
    setSelectedAnnotationId(null);
    setViewerMessage(null);
  };
  const chooseUnmapped = (next: UnmappedSurfaceSelection) => {
    setSelection(null);
    setUnmappedSelection(next);
    setSelectedStructureId(null);
    setSelectedAnnotationId(null);
    setViewerMessage('Вибрано геометрію без підтвердженого анатомічного зіставлення.');
  };
  const chooseHumanAtlas = (next: AtlasSelection) => {
    const atlasModel = data.models.find((model) => model.activeVersion?.format === 'ATLAS');
    const version = atlasModel?.activeVersion;
    const mapping = data.mappings.find(
      (item) => item.modelVersionId === version?.id && item.sourcePartId === next.sourcePartId,
    );
    if (!version || !mapping) {
      chooseUnmapped({
        modelVersionId: version?.id ?? 'human-atlas-unavailable',
        meshName: next.sourcePartId,
        meshKey: next.anchor.stableMeshKey,
        primitiveIndex: next.anchor.primitiveIndex,
        mappingStatus: 'UNMAPPED',
      });
      return;
    }
    chooseSurface({ anchor: next.anchor, mapping, modelVersionId: version.id });
  };
  const chooseStructure = (structureId: string) => {
    setSelectedStructureId(structureId);
    setSelection(null);
    setSelectedAnnotationId(null);
    const target = renderTargetForStructure(data.models, data.mappings, structureId);
    if (target) updateLayer(target.layerKind, { visible: true });
    setViewerMessage(
      target ? null : 'Ця структура ще не має семантичного анатомічного зіставлення.',
    );
    if (target) setPreset(`fit:${structureId}:${Date.now()}`);
  };
  const updateLayer = (kind: string, value: Partial<{ visible: boolean; opacity: number }>) =>
    setLayers((current) => ({ ...current, [kind]: { ...current[kind]!, ...value } }));
  const chooseAnnotation = (annotationId: string) => {
    const annotation = data.annotations.find((item) => item.id === annotationId);
    if (!annotation) return;
    chooseStructure(annotation.structure.id);
    setSelectedAnnotationId(annotationId);
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4 rounded-2xl bg-surface p-6 shadow-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-text-secondary">Clinical body map</p>
          <h1 className="font-serif text-3xl text-text-primary">{data.patient.fullName}</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Versioned anatomical surface annotations. Not a diagnostic imaging tool.
          </p>
        </div>
        <a href={`/app/patients/${data.patient.id}`} className="text-sm text-info underline">
          Back to patient
        </a>
      </header>
      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)] min-[1800px]:grid-cols-[260px_minmax(0,1fr)_340px]">
        <aside className="rc-card space-y-4 p-5">
          <section>
            <h2 className="font-medium">Layers</h2>
            {data.models.map((model) => (
              <div key={model.id} className="mt-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={layers[model.kind]?.visible ?? true}
                    onChange={(event) => updateLayer(model.kind, { visible: event.target.checked })}
                  />
                  {ANATOMY_LAYER_LABELS[model.kind] ?? model.name}
                </label>
                <label className="mt-1 block text-xs text-text-secondary">
                  Opacity
                  <input
                    aria-label={`${model.name} opacity`}
                    type="range"
                    min={0.1}
                    max={1}
                    step={0.1}
                    value={layers[model.kind]?.opacity ?? 1}
                    onChange={(event) =>
                      updateLayer(model.kind, { opacity: Number(event.target.value) })
                    }
                    className="w-full"
                  />
                </label>
              </div>
            ))}
          </section>
          <section className="border-t border-border pt-4">
            <label className="text-sm font-medium">
              Find structure
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Knee, femur…"
                className="mt-2 w-full rounded border border-border bg-background px-3 py-2"
              />
            </label>
            <div
              className="mt-2 max-h-72 overflow-auto"
              role="tree"
              aria-label="Anatomical structures"
            >
              {structures.map((item) => (
                <button
                  key={item.id}
                  role="treeitem"
                  aria-selected={item.id === selectedStructureId}
                  onClick={() => {
                    chooseStructure(item.id);
                  }}
                  className={`block w-full rounded px-2 py-1.5 text-left text-sm ${item.id === selectedStructureId ? 'bg-info/10 text-info' : 'hover:bg-background'}`}
                >
                  {item.name}{' '}
                  <span className="text-xs text-text-secondary">
                    {item.laterality.toLowerCase()}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </aside>
        <main className="rc-card space-y-3 p-4 lg:p-5">
          <section aria-labelledby="human-atlas-primary-title" className="space-y-2">
            <div>
              <h2 id="human-atlas-primary-title" className="font-medium">Human Atlas · primary source</h2>
              <p className="text-sm text-text-secondary">Source geometry is selectable for inspection. Clinical annotations require a verified RehabMIS mapping.</p>
            </div>
            <HumanAtlasExplorer onSelect={chooseHumanAtlas} severity={humanAtlasSeverity} />
          </section>
          <details
            className="rounded border border-border p-3"
            onToggle={(event) => setShowHistoricalViewer(event.currentTarget.open)}
          >
            <summary className="cursor-pointer text-sm font-medium">Historical Z-Anatomy annotations</summary>
            <p className="mt-2 text-xs text-text-secondary">Existing model versions and annotations remain readable and immutable.</p>
            {showHistoricalViewer ? (
              <AnatomyViewerBoundary
                models={data.models}
                mappings={data.mappings}
                annotations={annotations}
                layers={layers}
                selectedStructureId={selectedStructureId}
                selectedAnnotationId={selectedAnnotationId}
                selectedMeshKey={unmappedSelection?.meshKey ?? null}
                isolate={isolate}
                hiddenStructureIds={hidden}
                hiddenMeshKeys={hiddenMeshKeys}
                heatmap={heatmap}
                preset={preset}
                onSelect={chooseSurface}
                onAnnotationSelect={chooseAnnotation}
                onUnmapped={chooseUnmapped}
              />
            ) : null}
          </details>
          <div className="flex flex-wrap gap-2">
            {['anterior', 'posterior', 'left', 'right'].map((item) => (
              <button
                key={item}
                onClick={() => setPreset(item)}
                className="rounded border border-border bg-surface px-3 py-1.5 text-sm capitalize"
              >
                {item}
              </button>
            ))}
            <button
              onClick={() => setPreset(`anterior-${Date.now()}`)}
              className="rounded border border-border bg-surface px-3 py-1.5 text-sm"
            >
              Reset
            </button>
            <button
              disabled={!hasSelection}
              onClick={() => setIsolate((value) => !value)}
              className="rounded border border-border bg-surface px-3 py-1.5 text-sm"
            >
              {isolate ? 'Show all' : 'Isolate'}
            </button>
            <button
              disabled={!hasSelection}
              onClick={() =>
                selectedStructureId
                  ? setPreset(`fit:${selectedStructureId}:${Date.now()}`)
                  : unmappedSelection &&
                    setPreset(`fit-mesh:${unmappedSelection.meshKey}:${Date.now()}`)
              }
              className="rounded border border-border bg-surface px-3 py-1.5 text-sm"
            >
              Fit selection
            </button>
            <button
              disabled={!hasSelection}
              onClick={() =>
                selectedStructureId &&
                setHidden((current) => new Set([...current, selectedStructureId]))
              }
              className="rounded border border-border bg-surface px-3 py-1.5 text-sm"
            >
              Hide
            </button>
            <button
              onClick={() => {
                setHidden(new Set());
                setHiddenMeshKeys(new Set());
              }}
              className="rounded border border-border bg-surface px-3 py-1.5 text-sm"
            >
              Unhide all
            </button>
            {unmappedSelection ? (
              <button
                onClick={() =>
                  setHiddenMeshKeys((current) => new Set([...current, unmappedSelection.meshKey]))
                }
                className="rounded border border-border bg-surface px-3 py-1.5 text-sm"
              >
                Hide selected mesh
              </button>
            ) : null}
            <button
              aria-pressed={heatmap}
              onClick={() => setHeatmap((value) => !value)}
              className="rounded border border-border bg-surface px-3 py-1.5 text-sm"
            >
              Severity heatmap
            </button>
          </div>
          {viewerMessage ? (
            <p
              role="status"
              className="rounded border border-warning/40 bg-warning/5 px-3 py-2 text-sm"
            >
              {viewerMessage}
            </p>
          ) : null}
          {heatmap ? (
            <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary">
              {!heatmapHasData ? (
                <span className="rounded-full bg-surface-muted px-3 py-1">
                  Немає збережених severity data — геометрія neutral
                </span>
              ) : null}
              <span>Recorded intensity 0–3</span>
              <span className="h-2 w-16 bg-success" />
              <span>Recorded intensity 4–6</span>
              <span className="h-2 w-16 bg-warning" />
              <span>Recorded intensity 7–10</span>
              <span className="h-2 w-16 bg-danger" />
            </div>
          ) : null}
        </main>
        <aside className="space-y-4 lg:col-span-2 min-[1800px]:col-span-1">
          <StructureInspector
            structure={selectedStructure}
            context={context}
            annotations={data.annotations}
            unmappedSelection={unmappedSelection}
          />
          {permissions.create && selection ? (
            <form
              action={createAction}
              className="grid gap-3 rounded-md border border-info/30 bg-surface p-4"
            >
              <h2 className="font-medium">New annotation</h2>
              <input type="hidden" name="patientId" value={data.patient.id} />
              <input type="hidden" name="encounterId" value={encounterId ?? ''} />
              <input type="hidden" name="structureId" value={selection.mapping.structureId} />
              <input type="hidden" name="modelVersionId" value={selection.modelVersionId} />
              <input type="hidden" name="mappingId" value={selection.mapping.id} />
              <input type="hidden" name="anchor" value={JSON.stringify(selection.anchor)} />
              <label className="text-sm">
                Title
                <input
                  name="title"
                  maxLength={200}
                  className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-sm">
                  Type
                  <select
                    name="type"
                    className="mt-1 w-full rounded border border-border bg-background px-2 py-2"
                  >
                    {BODY_ANNOTATION_TYPES.map((item) => (
                      <option key={item} value={item}>
                        {BODY_ANNOTATION_TYPE_LABELS[item]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  Severity
                  <input
                    name="severity"
                    type="number"
                    min={0}
                    max={10}
                    className="mt-1 w-full rounded border border-border bg-background px-2 py-2"
                  />
                </label>
              </div>
              <label className="text-sm">
                Clinical note
                <textarea
                  name="note"
                  maxLength={3000}
                  rows={3}
                  className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
                />
              </label>
              {createState.error ? (
                <p role="alert" className="text-sm text-danger">
                  {createState.error}
                </p>
              ) : null}
              {createState.ok ? (
                <p role="status" className="text-sm text-success">
                  Annotation saved.
                </p>
              ) : null}
              <button disabled={creating} className="rounded bg-info px-3 py-2 text-sm text-white">
                Add annotation
              </button>
            </form>
          ) : null}
        </aside>
      </div>
      <section className="rounded-md border border-border bg-surface p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <h2 className="font-medium">Annotations and timeline</h2>
            <p className="text-sm text-text-secondary">
              Active findings and immutable resolved/voided history.
            </p>
          </div>
          <label className="text-xs">
            Status
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as typeof status)}
              className="ml-2 rounded border border-border bg-background px-2 py-1"
            >
              <option>ALL</option>
              {(['ACTIVE', 'RESOLVED', 'VOIDED'] as const).map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            Type
            <select
              value={type}
              onChange={(event) => setType(event.target.value as typeof type)}
              className="ml-2 rounded border border-border bg-background px-2 py-1"
            >
              <option>ALL</option>
              {BODY_ANNOTATION_TYPES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            From{' '}
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="rounded border border-border bg-background px-2 py-1"
            />
          </label>
          <label className="text-xs">
            To{' '}
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="rounded border border-border bg-background px-2 py-1"
            />
          </label>
        </div>
        {data.annotationWindow.truncated ? (
          <p role="status" className="mt-3 text-xs text-warning">
            Showing the {data.annotationWindow.returned} most recent of{' '}
            {data.annotationWindow.total} annotations. Use API filters for older records.
          </p>
        ) : null}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <ol className="max-h-96 space-y-2 overflow-auto">
            {annotations.map((annotation) => (
              <li key={annotation.id}>
                <button
                  onClick={() => chooseAnnotation(annotation.id)}
                  className={`w-full rounded border p-3 text-left ${annotation.id === selectedAnnotationId ? 'border-info bg-info/5' : 'border-border'}`}
                >
                  <span className="font-medium">
                    {annotation.title ?? BODY_ANNOTATION_TYPE_LABELS[annotation.type]}
                  </span>
                  <span className="ml-2 rounded bg-background px-2 py-0.5 text-xs">
                    {annotation.status}
                  </span>
                  <p className="text-sm text-text-secondary">
                    {annotation.structure.name} · {BODY_ANNOTATION_TYPE_LABELS[annotation.type]}
                    {annotation.severity === null
                      ? ''
                      : ` · severity ${annotation.severity}/10`} ·{' '}
                    {new Date(annotation.createdAt).toLocaleString()}
                  </p>
                </button>
              </li>
            ))}
          </ol>
          {selectedAnnotation ? (
            <AnnotationEditor
              annotation={selectedAnnotation}
              patientId={data.patient.id}
              canEdit={permissions.update}
              canResolve={permissions.resolve}
              canVoid={permissions.void}
            />
          ) : (
            <div className="rounded border border-dashed border-border p-5 text-sm text-text-secondary">
              Choose an annotation to inspect its status history or edit an active finding.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
