# Data retention and deletion policy boundary

RehabCRM retains clinical and audit records by default. UI deletion is intentionally absent for patients, assessments, plans, annotations, reports, practitioners, and audit events; lifecycle status, voiding, and append-only history preserve referential integrity. Staff identities may be disabled, while historical practitioner and audit references remain.

Legal must approve retention periods, legal holds, subject-request procedures, backup expiry, and secure destruction for each operating jurisdiction. Until approved, operators must not manually delete production rows or bucket objects. Any eventual deletion workflow requires authorization, dependency analysis, immutable audit evidence, backup propagation, and clinical/legal sign-off.
