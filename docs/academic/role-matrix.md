# Role matrix

| Capability | Rehabilitation specialist | Patient | Organization/system administrator |
|---|---|---|---|
| View patient data | Clinical patient data | Own portal only | Organization-scoped clinical and administrative data |
| Modify clinical data | Exact clinical permissions | Own monitoring submissions | Full clinical permissions where granted |
| Rehabilitation planning | Create and manage plans | View own plan | Full clinical permissions |
| Scheduling | Clinical workflow | Policy-limited participation | Full administrative workflow |
| Staff administration | No | No | Yes according to permissions |
| Audit oversight | No by default | No | Organization/platform audit permissions |

Permissions are the source of truth; role labels do not bypass organization isolation or deny-by-default authorization.
