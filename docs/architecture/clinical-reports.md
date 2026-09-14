# Clinical reports

## Lifecycle

`ClinicalReport` is organization- and patient-scoped. Statuses are `DRAFT`, `GENERATING`, `COMPLETED`, `FAILED`, and `VOIDED`. Phase 8 generation is synchronous but persists `GENERATING` first, so a later worker/queue can take over without changing the API contract.

Completed reports are immutable PDF snapshots. The only later state change is explicit voiding with a reason; the private object is retained for audit and retention policy. A failed attempt records a non-PHI failure code.

## Snapshot and authoring

The specialist selects the reporting period and included sections and may author a professional summary. The system does not synthesize conclusions, prognosis, recommendations, or goal completion. `sourceSnapshotMetadata` records the capture time, template version, and IDs/versions/timestamps of assessments, measurements, plans/revisions/goals, and annotations used for reproducibility. It is not returned by normal report DTOs.

The server renderer uses embedded Roboto font data with Cyrillic support, searchable text, A4 pagination, repeated semantic tables, page numbers, and a clinical-safety disclaimer. Charts are represented as exact textual tables in the PDF.

## Storage and access

Objects use server-generated keys under `clinical-reports/<organization>/<patient>/<report>.pdf` in the private documents bucket with `private, no-store` caching. Download requires `clinical_report.read`, emits an audit event, and returns a five-minute signed URL with attachment disposition. S3 credentials and storage keys never reach forms or report creation DTOs. Production bucket encryption is required policy but was not verified against the unavailable local storage service.

Audited actions are `CLINICAL_REPORT_CREATED`, `CLINICAL_REPORT_GENERATED`, `CLINICAL_REPORT_DOWNLOADED`, and `CLINICAL_REPORT_VOIDED`. Audit metadata contains identifiers, period/template/count facts, and never report prose or measurement bodies.
