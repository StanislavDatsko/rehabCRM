# Incident response

1. Declare severity and incident commander; start an access-controlled incident log.
2. Contain risk: disable affected memberships for immediate application denial, revoke provider sessions, rotate exposed credentials, isolate compromised components, or stop writes. Do not delete audit evidence.
3. Preserve sanitized logs, release/schema identifiers, timestamps, and infrastructure evidence. Never paste PHI or tokens into chat/tickets.
4. Assess patient-data and clinical-safety impact with privacy, security, clinical, and legal owners. Follow jurisdictional notification deadlines; no compliance assumption is encoded in the product.
5. Recover through immutable image rollback or the tested backup/restore procedure. Validate authorization, organization isolation, record integrity, report/object retrieval, and audit continuity before reopening.
6. Monitor and communicate. Document root cause, detection gap, corrective actions, owners, deadlines, and accepted residual risk.

Identity compromise uses local membership disable first because it blocks API access even when an issued provider token remains cryptographically valid. Object-storage exposure requires credential rotation, signed-URL expiry review, access-log preservation, and bucket policy audit. Suspected cross-organization access is severity critical until disproven.
