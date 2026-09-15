# Thesis-safe claims and limitations

## What the system does

- Maintains an application-level electronic patient record.
- Builds personalized rehabilitation plans and revisions.
- Tracks prescribed exercise execution and patient daily reports.
- Processes and visualizes structured recovery measurements, including ROM and mobility indicators.
- Provides patient and clinician in-app notifications and deterministic clinician-attention alerts.
- Stores private rehabilitation photos and videos outside PostgreSQL with specialist-only access and signed URLs.
- Separates doctor, patient, administrator, and receptionist capabilities.
- Applies layered controls intended to protect personal medical data.
- Verifies database behavior, API behavior, UI components, accessibility, and browser workflows.

## What the system does not claim

- It is not a certified national EHR, medical device, or interoperability-certified platform.
- It does not claim formal HIPAA, GDPR, ISO, or other regulatory certification.
- It does not perform autonomous diagnosis, medical decision-making, or automatic emergency escalation.
- Alerts assist clinician review; they are not diagnoses.
- Notifications currently use `IN_APP` delivery only; email, SMS, push, Web Push, mobile-app delivery, and external providers are not implemented.
- Measurements are entered by authorized users; no automatic hardware sensor collection is claimed.
- Media uploads use configurable per-file infrastructure limits; “unlimited” means no application-level record-count limit, not infinite file size or storage capacity.
- No thumbnail generation or transcoding pipeline is claimed; browser-playable originals are retained.
- The system does not replace clinical judgment or professional responsibility.
