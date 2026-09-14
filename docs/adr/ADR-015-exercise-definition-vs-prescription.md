# ADR-015: Separate exercise definitions from prescriptions

- Status: Accepted
- Date: 2026-09-02

## Decision

Reusable exercise identity, instructions, anatomy, safety, media, and supported dosage kinds live in `ExerciseDefinition`. Patient-specific dosage, laterality, instructions, notes, precautions, and progression live in `ExercisePrescription` under a plan revision.

## Consequences

The library stays reusable and safe to search without PHI. Historical prescriptions retain exercise code/name snapshots. Definition management and content approval are separate from clinical plan editing.

