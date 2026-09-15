# Thesis defense demo scenario

Use only the fictional seeded demo data. The complete path is designed for approximately 5–10 minutes and requires no manual database edits.

1. Sign in as the seeded rehabilitation specialist and open the patient record.
2. Show the patient profile, recent appointment/encounter context, assessments, and existing plan.
3. Open the rehabilitation plan to show its patient-specific goals, phases, prescriptions, dosage, frequency, laterality, and instructions.
4. Sign in as the seeded patient in a separate browser context. Open **Мій план**, review exercises, submit a daily report, and record an exercise completion.
5. Open **Прогрес** to show the patient’s entered measurements and provenance.
6. Open **Сповіщення** to show a plan-update notification and the self-only read/dismiss actions.
7. Return to the specialist context and open patient monitoring. Show the daily report, exercise adherence, source `PATIENT_REPORTED`, and trend information.
8. Open **Потребує уваги** to show the clinician notification/alert surface, source traceability, neutral wording, and alert state controls.
9. Optionally demonstrate the security boundary by attempting the patient URL from the patient session or a foreign-organization patient URL from the other specialist fixture; access is denied.

The demo deliberately presents alerts as review assistance rather than diagnosis and keeps patient and clinician identities in separate portal surfaces.

