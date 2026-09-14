# Structured measurements (Phase 5)

`Measurement` is one queryable observation recorded in an assessment. Clinical values are never represented as an arbitrary `name/value` pair or an assessment-sized JSON document.

## Definitions and typed values

`MeasurementDefinition` supplies a stable machine code, category, value type, canonical unit, bounds, and optional coded choices. `organizationId = null` means built-in; non-null means organization-specific. Application queries expose built-ins plus definitions belonging to the current organization. A database partial unique index protects built-in codes, while `(organizationId, code)` protects custom codes.

Supported value types:

| Type | Stored column | Validation |
| --- | --- | --- |
| `NUMBER` | `numericValue` | finite number; configured min/max |
| `INTEGER` | `numericValue` | integer; configured min/max |
| `SCALE` | `numericValue` | integer; configured min/max |
| `BOOLEAN` | `booleanValue` | boolean only |
| `CODED` | `codedValue` | one configured code |
| `TEXT` | `textValue` | bounded text; reserved for genuinely textual observations |

Exactly one value column must be populated and it must match the definition type. The API rejects client-supplied units that differ from the definition. Unit codes are a deliberately small validated vocabulary (`deg`, `cm`, `mm`, `m`, `s`, `min`, `kg`, `repetition`); UI symbols such as `°` are presentation only. A unit table/ontology is deferred.

Initial stable definitions include `pain.nrs`, `rom.flexion`, `rom.extension`, `strength.mrc`, `mobility.timed_up_and_go`, and `mobility.walk_distance`. Bounds belong to each definition—there is no universal ROM rule and no automatic clinical interpretation.

## Anatomy and repeated observations

`anatomicalRegionCode` uses the lightweight canonical vocabulary `shoulder`, `elbow`, `wrist`, `hip`, `knee`, `ankle`, `cervical_spine`, `thoracic_spine`, and `lumbar_spine`. `laterality` is structured as `LEFT`, `RIGHT`, `BILATERAL`, `MIDLINE`, or `NOT_APPLICABLE`.

These codes are not Three.js mesh IDs. Future anatomy integration resolves `(anatomicalRegionCode, laterality)` to an `AnatomicalStructure`, which then maps to a versioned model mesh.

`sequenceNumber` starts at 1 and permits multiple trials of the same definition/context without schema changes. The template UI uses one row per template item in Phase 5; APIs and storage remain trial-ready.

## Longitudinal history

History reads completed, non-voided measurements for the same organization and patient, optionally filtered by definition code, region, laterality, and bounded performed-at dates. Results sort by `performedAt`, then measurement ID. Comparison uses assessment `performedAt`, never row creation time. The UI shows prior textual values and simple unsmoothed plots without claiming improvement or deterioration.

