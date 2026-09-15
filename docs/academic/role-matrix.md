# Academic role matrix

| Capability | Лікар / реабілітолог (`REHABILITATION_SPECIALIST`) | Пацієнт (`PATIENT`) | Адміністратор (`ORGANIZATION_ADMIN` / `SYSTEM_ADMIN`) | Реєстратор (`RECEPTIONIST`) |
|---|---|---|---|---|
| View patient data | Assigned clinical projection | Own portal context only | Administrative patient data; no automatic clinical access | Administrative patient data |
| Modify clinical data | Yes, through exact domain permissions | No; submits own monitoring data | No | No |
| Rehabilitation planning | Create and manage assigned plans | View own active plan | No | No |
| Submit monitoring | No patient self-submission | Own daily reports and completions | No | No |
| View progress | Clinical patient progress | Own progress | No clinical progress by default | No |
| Notifications | Own clinician notifications | Own notifications | No clinician alerts by default | No clinician alerts |
| Clinical alerts | Read, acknowledge, resolve alerts for responsible patients | Never | No | No |
| Scheduling | Read clinical schedule as permitted | Policy-limited patient participation | Full administrative workflow | Full administrative workflow |
| Staff administration | No | No | Yes according to admin role | No |
| Audit oversight | No by default | No | Organization audit permission | No |

Administrative role is intentionally not equivalent to clinical-data access.

