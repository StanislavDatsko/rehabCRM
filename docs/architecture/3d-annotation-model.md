# 3D annotation persistence model

Clinician body markers must survive camera motion, remounts, and **compatible** model updates. They must remain honest when a model is **incompatible**.

## Problem

World-space XYZ in the Three.js scene is fragile (camera, scale, centering, unit conversion). Mesh `uuid` values assigned at runtime are **not** stable identifiers.

## Chosen persistence tuple

Each `BodyAnnotation` stores the exact implementation tuple:

| Field | Role |
| --- | --- |
| `modelVersionId` | Immutable GLB version, checksum, storage key, and alignment transform |
| `structureId` | Canonical clinical structure, independent of mesh names |
| `mappingId` | Reviewed mapping for the exact model version and primitive |
| `stableMeshKey` + `primitiveIndex` | Denormalized, validated render lookup key |
| `triangleIndex` + `barycentricU/V/W` | Stable point on that version's triangle topology |
| `localPositionX/Y/Z` | Same-version fallback and debugging aid |
| `localNormalX/Y/Z` | Optional marker orientation |

### API `anchor` object

```json
{
  "stableMeshKey": "Articular capsule of knee joint.l",
  "primitiveIndex": 0,
  "triangleIndex": 18422,
  "barycentric": [0.21, 0.44, 0.35],
  "localPosition": [0.08, 0.45, 0.01],
  "localNormal": [0.0, 0.0, 1.0]
}
```

- `stableMeshKey` and `primitiveIndex` must match the selected `AnatomicalModelStructureMapping`.
- The mapping, structure, and version are validated together by the API; arbitrary client mesh names are rejected.
- Barycentric values are finite, each in `[0,1]`, and must sum to one within `0.0001`.
- Reconstruction: look up mesh by key → triangle → interpolate vertices with barycentric weights → world matrix of that mesh.

If triangle topology is unavailable, fall back to `localPosition` **only when** `modelVersionId` matches exactly. There is no cross-version projection.

## Annotation lifecycle

`ACTIVE → RESOLVED`, `ACTIVE → VOIDED`, and `RESOLVED → VOIDED` are permitted. `VOIDED` is terminal and Phase 7 does not reopen resolved records. Every status change is appended to `BodyAnnotationStatusHistory`; normal clinical edits are restricted to `ACTIVE` records and use optimistic `version` checks.

## Incompatible model changes

If `checksum` / topology / `meshKey` set changes:

- Do **not** auto-project old annotations onto a new mesh.
- UI: show annotation in the **textual / list** representation and a banner: “Recorded on model version X; 3D placement cannot be displayed on version Y.”
- Optional later: staff **explicitly** re-anchors a copy as a new annotation (audit both).

## Heatmap

Heatmap is a **renderer** over query results (annotations, measurements), not a stored diagnosis. Filters (date range, type, plan) are query parameters. Aggregations (e.g. max severity per structure) are documented as visualization rules, not clinical scores.

## Accessibility

Every annotation has label, type, severity, structure display name, author, time — sufficient for a non-WebGL table. WebGL failure must not hide this list.

## Canonical structure mapping

GLB node hierarchies are render data. `AnatomicalStructure` is the clinical vocabulary and `AnatomicalModelStructureMapping` is version-specific. Runtime selection only exposes `EXACT` or `HIGH_CONFIDENCE` mappings. Unmatched nodes are retained in `assets/anatomy/mappings/manual-review.csv`; they are never assigned silently.

## Related ADR

[ADR-004](../adr/ADR-004-3d-annotation-coordinate-model.md)
