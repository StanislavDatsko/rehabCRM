# 3D anatomy workspace

Phase 7 adds a specialist-only patient body map. Three independently signed GLBs are rendered as muscular, skeletal, and joint layers using React Three Fiber and Drei. The body-map route dynamically imports the renderer, so Three.js is absent from ordinary patient, scheduling, assessment, and plan routes.

The desktop layout uses structure/layer navigation, a central orbit/zoom/pan canvas, and a clinical inspector. Large-tablet layouts stack these regions. Camera presets, reset, fit-selection, opacity, isolate/hide/restore, hover, search, and controlled material highlights are local viewer state.

The canvas is not a clinical source of truth. A textual tabbed structure inspector, annotation list, filters, author/time/status history, measurement context, active goals, and current prescriptions remain available when WebGL or model loading fails. Unmapped geometry displays an explicit warning and cannot create a record. The initial body-map payload is capped at the 200 most recent detailed annotations and reports its total/truncation state; aggregate counts are calculated from minimal organization-scoped facts rather than the truncated window.

The current assets use identity model-version transforms. Computational bounds show compatible height/origin, but skeleton depth/width and joint vertical extent differ naturally. A real layered browser session is still required before production approval; transforms must be changed in version metadata, never eyeballed in React.

See [3d-annotation-model.md](./3d-annotation-model.md) and [anatomy-asset-pipeline.md](./anatomy-asset-pipeline.md).
