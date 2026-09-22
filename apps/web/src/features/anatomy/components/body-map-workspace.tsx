'use client';

import type {
  BodyAnnotationStatus,
  BodyAnnotationType,
  PatientBodyMapResponse,
} from '@repo/contracts';
import { useActionState, useMemo, useState } from 'react';
import { createBodyAnnotationAction, type AnatomyActionState } from '../actions/anatomy-actions';
import { BODY_ANNOTATION_TYPE_LABELS, BODY_ANNOTATION_TYPES } from '../anatomy-ui';
import {
  filterBodyAnnotations,
  renderTargetForStructure,
} from '../body-map-view-model';
import { AnnotationEditor } from './annotation-editor';
import type { SurfaceSelection, UnmappedSurfaceSelection } from './selection-types';
import { StructureInspector } from './structure-inspector';
import { HumanAtlasExplorer } from '../human-atlas/human-atlas-explorer';
import type { AtlasSelection } from '../human-atlas/scene';
import { PageHeader } from '@repo/ui/workspace';

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
  const [selectedStructureId, setSelectedStructureId] = useState<string | null>(() =>
    data.structures.some((item) => item.id === initialStructureId) ? initialStructureId! : null,
  );
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [selection, setSelection] = useState<SurfaceSelection | null>(null);
  const [unmappedSelection, setUnmappedSelection] = useState<UnmappedSurfaceSelection | null>(null);
  const [viewerMessage, setViewerMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<'ALL' | BodyAnnotationStatus>('ALL');
  const [type, setType] = useState<'ALL' | BodyAnnotationType>('ALL');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [clinicalHeatmapMode, setClinicalHeatmapMode] = useState(false);
  const [createState, createAction, creating] = useActionState(createBodyAnnotationAction, initial);
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
  const highlightedSourcePartId = selectedAnnotation
    ? data.mappings.find((mapping) => mapping.structureId === selectedAnnotation.structure.id)?.sourcePartId ?? null
    : null;
  const context = data.clinicalContext.find((item) => item.structureId === selectedStructureId);
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
  const humanAtlasColors = useMemo(() => {
    const result: Record<string, string> = {};
    data.mappings.forEach((mapping) => {
      const colors = data.annotations.filter((annotation) => annotation.status === 'ACTIVE' && annotation.structure.id === mapping.structureId && annotation.colorHex);
      const color = colors.at(-1)?.colorHex;
      if (mapping.sourcePartId && color) result[mapping.sourcePartId] = color;
    });
    return result;
  }, [data.annotations, data.mappings]);
  const humanAtlasMarkers = useMemo(() => {
    const result: Record<string, { position: [number, number, number]; title: string; note: string | null; severity: number | null; color: string | null }> = {};
    data.mappings.forEach((mapping) => {
      const annotation = data.annotations.find((item) => item.status === 'ACTIVE' && item.structure.id === mapping.structureId && item.anchor);
      if (mapping.sourcePartId && annotation) result[mapping.sourcePartId] = { position: annotation.anchor.localPosition, title: annotation.title ?? annotation.structure.name, note: annotation.note, severity: annotation.severity, color: annotation.colorHex };
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
    setViewerMessage(
      target ? null : 'Ця структура ще не має семантичного анатомічного зіставлення.',
    );
  };
  const chooseAnnotation = (annotationId: string) => {
    const annotation = data.annotations.find((item) => item.id === annotationId);
    if (!annotation) return;
    chooseStructure(annotation.structure.id);
    setSelectedAnnotationId(annotationId);
  };

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Clinical body map" title={data.patient.fullName} description="Versioned anatomical surface annotations. Not a diagnostic imaging tool." actions={<a href={`/app/patients/${data.patient.id}`} className="rc-btn rc-btn-secondary">Back to patient</a>} />
      <div className={`grid gap-4 lg:grid-cols-[minmax(0,1fr)] min-[1800px]:grid-cols-[minmax(0,1fr)_340px] ${clinicalHeatmapMode ? 'body-map-clinical-mode' : ''}`}>
        <main className="ui-surface space-y-3 p-4 lg:p-5" aria-label="Interactive clinical body map">
          <section aria-labelledby="human-atlas-primary-title" className="space-y-2">
            <div>
              <h2 id="human-atlas-primary-title" className="font-medium">Human Atlas · primary source</h2>
              <p className="text-sm text-text-secondary">Source geometry is selectable for inspection. Clinical annotations require a verified RehabMIS mapping.</p>
            </div>
            <HumanAtlasExplorer onSelect={chooseHumanAtlas} severity={humanAtlasSeverity} severityColors={humanAtlasColors} markerPoints={humanAtlasMarkers} highlightSourcePartId={highlightedSourcePartId} clinicalMode={clinicalHeatmapMode} onToggleClinicalMode={() => setClinicalHeatmapMode((value) => !value)} />
          </section>
          <div className="atlas-toolbar"><p className="text-xs text-text-secondary">Human Atlas is the only anatomy source for this workspace.</p></div>
          {viewerMessage ? (
            <p
              role="status"
              className="ui-inline-notice ui-inline-notice-warning"
            >
              {viewerMessage}
            </p>
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
              className="ui-surface grid gap-3 border-info/30 p-4"
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
                  className="field mt-1 w-full"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-sm">
                  Type
                  <select
                    name="type"
                    className="field mt-1 w-full"
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
                    className="field mt-1 w-full"
                  />
                </label>
              </div>
              <label className="text-sm">Problem color<input name="colorHex" type="color" defaultValue="#ff4d6d" className="mt-1 h-11 w-full cursor-pointer rounded-md border border-border bg-background p-1" /></label>
              <label className="text-sm">
                  Clinical note
                <textarea
                  name="note"
                  maxLength={3000}
                  rows={3}
                  className="field mt-1 w-full"
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
              <button disabled={creating} className="rc-btn rc-btn-primary">
                Add annotation
              </button>
            </form>
          ) : null}
        </aside>
      </div>
      <section className="ui-surface p-4">
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
              className="field ml-2 px-2 py-1 text-xs"
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
              className="field ml-2 px-2 py-1 text-xs"
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
              className="field px-2 py-1 text-xs"
            />
          </label>
          <label className="text-xs">
            To{' '}
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="field px-2 py-1 text-xs"
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
                  className={`w-full rounded-md border p-3 text-left transition-colors ${annotation.id === selectedAnnotationId ? 'border-info bg-info/5' : 'border-border hover:bg-surface-muted'}`}
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
                    {new Date(annotation.createdAt).toLocaleString('uk-UA', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                      timeZone: 'UTC',
                    })}
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
            <div className="ui-empty-state border-dashed p-5 text-sm text-text-secondary">
              Choose an annotation to inspect its status history or edit an active finding.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
