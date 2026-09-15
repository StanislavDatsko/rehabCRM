# Patient monitoring

Patient monitoring is a bounded, patient-owned input surface. Patients may submit one daily report for today or the previous local calendar day and record exercise completion against an active or paused prescription.

The API derives organization and patient ownership from the authenticated patient portal context. Client payloads cannot choose another patient, organization, plan, or revision. Records carry `PATIENT_REPORTED` provenance, optimistic versions, and audit events. Clinicians with `patient_monitoring.read` can review the bounded history at `/patients/:patientId/monitoring`; reception and patient accounts cannot use that route.

The feature is intentionally passive: it does not send reminders, notifications, alerts, email, push, or SMS.
