# ADR-021: Curated clinical timeline rather than audit-log exposure

## Context

Security audit records and clinician-facing history have different purposes, timestamps, audiences, and minimization requirements.

## Decision

Project only allow-listed clinical categories from domain records into a stable timeline DTO. Do not expose raw `AuditEvent` rows or metadata. Use domain occurrence timestamps and deterministic cursor ordering.

## Consequences

The timeline is readable and privacy-minimized, while the audit trail remains independently useful for investigation. New timeline event types require an explicit projection decision.
