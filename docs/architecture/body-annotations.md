# Body annotations

Body annotations are staff-authored clinical observations, not diagnoses. Supported types are `PAIN`, `MOBILITY_LIMITATION`, `WEAKNESS`, `TENSION`, `INFLAMMATION`, `POST_SURGERY`, `INJURY`, `SENSITIVITY`, and `OTHER`; severity is optional and constrained to 0–10.

Creation derives both user and active practitioner identity from authentication. The API verifies organization-scoped patient access, optional encounter ownership/patient match, active model version, reviewed structure mapping, and the complete surface anchor. Clinical notes are excluded from generic audit metadata and request logging redaction includes `note` and `anchor`.

Lifecycle policy is `ACTIVE → RESOLVED`, `ACTIVE → VOIDED`, or `RESOLVED → VOIDED`. Resolved and voided records are read-only; void requires a reason; voided is terminal. Each transition appends `BodyAnnotationStatusHistory`. Edits use compare-and-swap `version` and stale writes return `BODY_ANNOTATION_UPDATE_CONFLICT`.

Heatmap values are derived from filtered active annotations using maximum recorded severity per structure. They are labeled recorded intensity and are never stored as diagnostic truth.

The body-map response bounds detailed annotation rows at 200 and includes `annotationWindow { limit, returned, total, truncated }`. Status totals, maximum severity, latest regions, and per-structure summaries remain exact for the patient even when the detail window is truncated.
