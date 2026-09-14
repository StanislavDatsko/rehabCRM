# Rehabilitation goals (Phase 6)

Goals belong to an immutable plan revision. They may be clinician-described or linked to a Phase 5 `MeasurementDefinition`.

A linked numeric goal records definition, region, laterality, a constrained operator (`GREATER_THAN_OR_EQUAL`, `LESS_THAN_OR_EQUAL`, `EQUAL`, `BETWEEN`), target value(s), and canonical target unit. When based on an actual measurement, it retains `baselineMeasurementId` plus snapshots of the value, unit, definition code/name, region, laterality, and performed time. Later voiding or definition changes cannot erase historical rendering.

The API retrieves the latest completed, non-voided comparable measurement for the same organization, patient, definition, region, and laterality. Responses expose baseline/current/target explicitly. They may state that a target *appears reached*, but goal status remains specialist-controlled and is never automatically changed to `ACHIEVED`.

Manual baselines are not implemented in Phase 6. A clinician-described goal remains valid without numeric linkage.

