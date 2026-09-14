# ADR-004: 3D annotation coordinate model

## Context

Annotations must reload after navigation and remain interpretable if GLB assets are optimized. World coordinates and Three.js `uuid`s are unstable.

## Decision

Persist **modelId + modelVersion + anatomical structure identity + triangle barycentric `surfaceReference`**, with **local-space position** as a same-version fallback. Incompatible model versions **do not** auto-remap; UI falls back to the accessible list + explicit warning.

Full tuple: [3d-annotation-model.md](../architecture/3d-annotation-model.md).

This ADR also subsumes the proposed separate surface-anchor ADR: the implementation uses scalar database columns for triangle/barycentric and local-position values so database constraints can reject malformed anchors.

## Alternatives

- World XYZ only — rejected (fragile).
- UV coordinates only — rejected as primary (many clinical meshes lack stable unique UVs).
- Bone attachment only — incomplete for surface pain markers.
- Re-project on every asset replace — rejected (silent clinical error).

## Consequences

- GLB pipeline must preserve `meshKey` / node names across compatible versions.
- Draco compression is allowed if triangle indices remain defined after decode for that version.
- Heatmaps consume persisted observations; they do not store a second coordinate system.
