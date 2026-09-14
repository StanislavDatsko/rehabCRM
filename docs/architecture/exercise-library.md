# Exercise library and prescriptions (Phase 6)

`ExerciseDefinition` is reusable knowledge; `ExercisePrescription` is patient-specific content in a plan revision. Definitions never contain patient dosage, dates, progression, precautions, or patient notes.

Built-in definitions use `organizationId = null`; custom definitions are organization-scoped. Shared definitions are immutable through normal APIs, and Phase 6 exposes read/search only. Stable codes, canonical anatomical region codes, optional muscle-group codes, equipment, and supported dosage kinds prepare future anatomy mapping without Three.js identifiers.

Prescriptions use typed optional columns: sets, repetitions, trials, duration seconds, hold seconds, distance metres, load kilograms, frequency type, sessions per day, and days per week. Only positive/non-negative appropriate values are accepted. Not every exercise requires sets/repetitions. Complex calendar recurrence and patient adherence are deferred.

`ExerciseMedia` stores metadata and an object-storage key or deliberate external URL, never media bytes. Licensing/attribution fields are available. Seed data contains no commercial media.

`GET /api/v1/exercises` uses bounded server pagination and filters for text, category, canonical anatomical region, equipment, and active status. Results are scoped to shared definitions plus the current organization. `GET /api/v1/exercises/:id` returns instructions, safety information, laterality applicability, and media attribution. There is no Phase 6 management endpoint.

Common frequency values cover daily, weekly, alternate-day, and supervised-only prescriptions, supplemented by sessions-per-day and days-per-week. Arbitrary recurrence rules, calendar scheduling, automatic progression, and adherence are deliberately unsupported.
