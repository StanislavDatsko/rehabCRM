# Patient media and clinical attachments

`PatientMedia` stores metadata only in PostgreSQL. Original photo/video bytes are stored in the private MinIO/S3 documents bucket under an opaque organization/patient/media key; uploaded filenames are display metadata and never become object paths.

The specialist requests an upload intent, and the API creates `PENDING_UPLOAD` metadata plus a short-lived presigned PUT URL. The browser uploads directly to MinIO, so large videos are not buffered through NestJS. Finalization performs a private object HEAD check for expected size and MIME type, records an optional SHA-256 supplied by the upload client, and changes the record to `READY`. Abandoned intents remain pending for operational cleanup; normal UI voiding retains both metadata and original object.

Only `READY` records appear in the default bounded (maximum 50) patient gallery. Access is authorized through the API and then returned as a five-minute inline signed GET URL, which supports normal browser video range requests. The original object is immutable; no thumbnails or transcoding are claimed in this phase.

The product imposes no count limit on media records. Infrastructure limits are configurable with `PATIENT_MEDIA_MAX_IMAGE_BYTES`, `PATIENT_MEDIA_MAX_VIDEO_BYTES`, and `PATIENT_MEDIA_UPLOAD_URL_TTL_SECONDS`. Supported formats are the validated MIME allowlist in `media.schemas.ts`.

