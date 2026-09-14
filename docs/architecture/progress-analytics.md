# Progress analytics

## Read model

Phase 8 adds no competing clinical source of truth. `ProgressService` aggregates encounters, assessments, measurements, current published rehabilitation-plan content, and body annotations through focused endpoints:

- `/progress/summary`
- `/progress/measurements`
- `/progress/goals`
- `/progress/plan-history`
- `/progress/body-annotations`

The UI composes these projections instead of requesting one unbounded patient blob.

## Periods and comparability

The default is a bounded 90-day window. Supported selections are 30 days, 90 days, the current plan, an explicit custom interval, and the full patient record. Custom intervals require both ends and are capped at ten years. “All” is an explicit user choice bounded by patient creation time. The selected period is stored in the URL.

Measurement series group on `(MeasurementDefinition, anatomicalRegionCode, laterality)`. Only numeric `NUMBER`, `INTEGER`, or `SCALE` observations from `COMPLETED`, non-voided assessments are included. `performedAt` is the x-axis; no missing values are interpolated. The first observed point in the interval is explicitly labeled as the displayed baseline, and delta is a neutral arithmetic difference.

Goal projection preserves the authored baseline snapshot and target. The current value is the latest comparable completed measurement in the interval. `targetConditionMet` is informational only and never writes `RehabilitationGoal.status`.

## Plan and anatomy history

Published plan revisions are immutable. Comparison is domain-aware: goals compare authored target/status, prescriptions compare exercise identity and dosage fields, and phases compare criteria/dates. Raw JSON diffs are not exposed.

Body annotations group by canonical structure and annotation type, counting active/resolved records and retaining the observation dates. Links open the Phase 7 body map focused on the canonical structure. Existing Phase 7 mapping remains deliberately limited to the reviewed set; analytics does not broaden mappings.
