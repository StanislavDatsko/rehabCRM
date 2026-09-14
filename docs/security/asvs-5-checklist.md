# OWASP ASVS 5 release checklist

Status values: `implemented`, `verified`, `not applicable`, `open`. This is a focused pilot checklist, not a claim of ASVS certification.

| Control area | Status | Phase 9 evidence / remaining gate |
| --- | --- | --- |
| Architecture and threat modeling | implemented | Modular trust boundaries and threat model exist; independent review open. |
| Authentication | implemented | OIDC authorization code + PKCE, secure server session, refresh rotation; production MFA/provider verification open. |
| Session management | implemented | HttpOnly/Secure/SameSite cookies and provider logout; immediate revocation residual-token test open. |
| Access control | implemented | Deny-by-default API permissions, org scoping, cross-org 404, last-admin invariant; real-stack negative E2E open. |
| Input validation | implemented | Strict Zod schemas, UUID parsing, bounded JSON/form bodies, file/model validation. |
| Stored cryptography | open | TLS and provider-managed encryption required; deployment and backup encryption verification open. |
| Error handling and logging | implemented | Stable error bodies, request IDs, structured redaction; production sink/retention review open. |
| Data protection | implemented | Patients are not identities, signed private objects, no passwords; legal retention/deletion approval open. |
| Communications | open | HTTPS/HSTS configuration exists; external TLS scan and certificate automation open. |
| Malicious code | open | Secret/dependency/container scans and SBOM are in CI; first successful run and findings triage open. |
| Business logic | implemented | Optimistic versions, state machines, appointment exclusion constraint, immutable reports; live concurrency test open. |
| Files and resources | implemented | Private buckets and bounded report/model workflows; malware-scanner provider remains open. |
| API and web service | implemented | Exact CORS, bearer auth, CSP, security headers, rate limiting; deployed header/CSP validation open. |
| Configuration | implemented | Staging/production fail-fast checks and seed guard; secret-manager deployment verification open. |

Any open control with critical/high risk blocks pilot unless explicitly accepted in writing by the security and clinic owners.
