# In-app notifications and clinician alerts

Notifications are recipient-owned, bounded in-app records. Their recipient is resolved by the backend and never accepted from a request body. Patient notifications expose only patient-safe action text; clinician notifications and `ClinicalAlert` records are separate permissioned projections.

The initial deterministic rule is deliberately narrow: a patient DailyReport with pain `>= 7` creates one `SYMPTOM_CHANGE` alert for the responsible practitioner (`ATTENTION`, or `HIGH` at `9+`). The report ID is retained as the traceable source, and a unique source key prevents duplicates. The rule communicates that a value needs review; it does not diagnose, escalate emergencies, or make a clinical decision.

Alerts use `OPEN -> ACKNOWLEDGED -> RESOLVED` (with direct open-to-resolved support), optimistic version checks, and audit events. All list projections are bounded to 50 records. Only `IN_APP` delivery is implemented; email, SMS, push, and external providers are out of scope.
