# Rehabilitation plans (Phase 6)

A rehabilitation plan is a specialist-authored, versioned clinical working document. The plan row owns patient, practitioner, lifecycle status, current revision pointer, and optimistic `version`. Meaning-bearing content lives in revisions.

## Lifecycle

```text
DRAFT ──activate──> ACTIVE ──pause──> PAUSED
  │                    │  └─complete/cancel
  └────cancel──────────┘
PAUSED ──resume──> ACTIVE
PAUSED ──complete/cancel
COMPLETED and CANCELLED are terminal
```

Activation requires at least one goal or prescription. This deliberately minimal Phase 6 rule avoids inventing clinical policy. Completion is always explicit; measurement progress never completes a plan.
An ACTIVE or PAUSED plan with an unpublished draft must publish that draft before completion, preventing an unreachable draft from remaining on a terminal plan. Cancellation may preserve an unpublished draft as non-effective historical work, but terminal plans cannot edit or publish it.

## Revisions

- A new plan starts with editable draft revision 1.
- Activation publishes revision 1 and sets it as current.
- An ACTIVE or PAUSED plan is never edited in place. `POST /revisions` copies the current published revision into one editable draft.
- Draft aggregate saves replace the draft's goals, phases, and prescriptions transactionally and use the plan `version`.
- Publishing atomically marks the draft published, advances `currentRevisionId`, and writes audit metadata. Old revisions remain immutable.
- Draft saves do not create revisions; revision creation and publication are explicit clinician actions, never keystroke side effects.

Plan ownership is derived from the authenticated user's active Practitioner profile. Phase 6 has no transfer/co-ownership workflow. Authorized specialists can access plans in their organization; assignment-based narrowing remains a policy boundary.

## Aggregate API and concurrency

- `GET/POST /api/v1/patients/:patientId/rehabilitation-plans`
- `GET/PATCH /api/v1/rehabilitation-plans/:id`
- `POST /api/v1/rehabilitation-plans/:id/revisions`
- `POST /api/v1/rehabilitation-plans/:id/revisions/:revisionId/publish`
- explicit `activate`, `pause`, `resume`, `complete`, and `cancel` command endpoints

The PATCH request carries plan metadata, goals, phases, and prescriptions as one aggregate and commits them in one transaction. Every mutation compares the supplied plan version, increments it exactly once, and returns `409 REHABILITATION_PLAN_UPDATE_CONFLICT` on a stale version. Child identifiers may only be preserved when they already belong to the selected draft.

## Audit

Lifecycle events are `REHABILITATION_PLAN_CREATED`, `ACTIVATED`, `PAUSED`, `RESUMED`, `COMPLETED`, and `CANCELLED`. Revision events record creation, update, and publication. Goal and prescription events record created/updated/status-changed or added/updated/removed identifiers. Generic audit metadata contains only plan/revision/child IDs, revision numbers, and status transitions—not plan descriptions, goal values, dosage, instructions, notes, or precautions.
