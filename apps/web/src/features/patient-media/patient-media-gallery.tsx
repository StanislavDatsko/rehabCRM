'use client';
import { useEffect, useState } from 'react';

type MediaItem = {
  id: string;
  kind: 'IMAGE' | 'VIDEO';
  mimeType: string;
  originalFileName: string;
  title: string | null;
  description: string | null;
  capturedAt: string | null;
  createdAt: string;
  uploadedBy: string;
  sizeBytes: string;
};
export function PatientMediaGallery({
  patientId,
  initialItems,
  initialTotal,
}: {
  patientId: string;
  initialItems: MediaItem[];
  initialTotal: number;
}) {
  const [items, setItems] = useState(initialItems);
  const [total] = useState(initialTotal);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [previewErrors, setPreviewErrors] = useState<Record<string, boolean>>({});
  const [hydrated, setHydrated] = useState(false);
  const [localPreviews, setLocalPreviews] = useState<
    Array<{ id: string; name: string; url: string; kind: 'IMAGE' | 'VIDEO'; file: File; status: 'uploading' | 'failed' }>
  >([]);
  useEffect(() => {
    let cancelled = false;
    void Promise.all(
      initialItems.slice(0, 25).map(async (item) => {
        const response = await fetch(`/api/patient-media/${patientId}/${item.id}/access`);
        if (!response.ok) return null;
        const data = (await response.json()) as { url: string };
        return [item.id, data.url] as const;
      }),
    ).then((entries) => {
      if (!cancelled)
        setUrls(
          Object.fromEntries(
            entries.filter((entry): entry is readonly [string, string] => entry !== null),
          ),
        );
    });
    return () => {
      cancelled = true;
    };
  }, [initialItems, patientId]);
  useEffect(() => {
    setHydrated(true);
  }, []);
  async function upload(files: FileList | null) {
    if (!files?.length) return;
    const pendingPreviews = Array.from(files).map((file) => ({
      id: `${file.name}-${file.lastModified}`,
      name: file.name,
      url: URL.createObjectURL(file),
      kind: file.type.startsWith('video/') ? ('VIDEO' as const) : ('IMAGE' as const),
      file,
      status: 'uploading' as const,
    }));
    setLocalPreviews(pendingPreviews);
    setBusy(true);
    setMessage('');
    let completed = 0;
    const failedUploadIds = new Set<string>();
    for (const file of Array.from(files)) {
      try {
        const kind = file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE';
        const start = await fetch(`/api/patient-media/${patientId}/uploads`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            kind,
            mimeType: file.type,
            sizeBytes: file.size,
            originalFileName: file.name,
          }),
        });
        if (!start.ok) throw new Error('start');
        const intent = (await start.json()) as {
          mediaId: string;
          uploadUrl: string;
          requiredHeaders: Record<string, string>;
        };
        const put = await fetch(intent.uploadUrl, {
          method: 'PUT',
          headers: intent.requiredHeaders,
          body: file,
        });
        if (!put.ok) throw new Error('put');
        const done = await fetch(`/api/patient-media/${patientId}/${intent.mediaId}/complete`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: '{}',
        });
        if (!done.ok) throw new Error('complete');
        const ready = (await done.json()) as { id: string };
        const access = await fetch(`/api/patient-media/${patientId}/${ready.id}/access`);
        if (!access.ok) throw new Error('access');
        const accessData = (await access.json()) as { url: string };
        setUrls((current) => ({ ...current, [ready.id]: accessData.url }));
        setItems((current) => [
          {
            id: ready.id,
            kind,
            mimeType: file.type,
            originalFileName: file.name,
            title: null,
            description: null,
            capturedAt: null,
            createdAt: new Date().toISOString(),
            uploadedBy: 'Ви',
            sizeBytes: String(file.size),
          },
          ...current,
        ]);
        completed += 1;
      } catch {
        const localId = `${file.name}-${file.lastModified}`;
        failedUploadIds.add(localId);
        setLocalPreviews((current) =>
          current.map((preview) => (preview.id === localId ? { ...preview, status: 'failed' } : preview)),
        );
        setMessage(`${file.name}: не вдалося завантажити.`);
        continue;
      }
    }
    setBusy(false);
    const failedIds = failedUploadIds;
    pendingPreviews.forEach((item) => {
      if (!failedIds.has(item.id)) URL.revokeObjectURL(item.url);
    });
    setLocalPreviews((current) => current.filter((preview) => failedIds.has(preview.id)));
    if (completed)
      setMessage(
        `${completed} файл(ів) завантажено. Нові записи з’являться після оновлення списку.`,
      );
  }
  async function open(item: MediaItem) {
    const response = await fetch(`/api/patient-media/${patientId}/${item.id}/access`);
    if (response.ok) {
      const data = (await response.json()) as { url: string };
      setUrls((current) => ({ ...current, [item.id]: data.url }));
      setPreviewErrors((current) => ({ ...current, [item.id]: false }));
    } else setPreviewErrors((current) => ({ ...current, [item.id]: true }));
  }
  return (
    <section className="rc-card rc-card-elevated p-5" aria-labelledby="patient-media-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="patient-media-title" className="font-serif text-lg text-text-primary">
            Фото та відео
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Приватні матеріали реабілітаційного процесу · {total} записів
          </p>
        </div>
        <label className="rc-btn rc-btn-primary cursor-pointer">
          {busy ? 'Завантаження…' : 'Додати медіа'}
          <input
            data-testid="patient-media-input"
            data-hydrated={hydrated ? 'true' : 'false'}
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/quicktime,video/webm"
            multiple
            disabled={!hydrated || busy}
            onChange={(event) => {
              void upload(event.target.files);
              event.currentTarget.value = '';
            }}
          />
        </label>
      </div>
      {message ? (
        <p role="alert" className="mt-3 text-sm text-danger">
          {message}
        </p>
      ) : null}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {localPreviews.map((item) => (
          <article
            key={item.id}
            className="overflow-hidden rounded-xl border border-brand/30 bg-brand/5"
          >
            <div className="relative">
              {item.kind === 'VIDEO' ? (
                <video
                  className="aspect-video w-full object-cover"
                  src={item.url}
                  onError={() =>
                    setMessage(`${item.name}: локальний preview недоступний у цьому браузері.`)
                  }
                />
              ) : (
                <img
                  className="aspect-video w-full object-cover"
                  src={item.url}
                  alt={item.name}
                  onError={() =>
                    setMessage(`${item.name}: локальний preview недоступний у цьому браузері.`)
                  }
                />
              )}
              <span className="absolute bottom-2 left-2 rounded-full bg-text-primary/80 px-2 py-1 text-xs text-white">
                {item.status === 'failed' ? 'Помилка завантаження' : 'Завантаження…'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 p-3">
              <p className="text-sm font-medium">{item.name}</p>
              {item.status === 'failed' ? (
                <span className="flex gap-2 text-xs">
                  <button type="button" className="text-brand underline" onClick={() => {
                    const transfer = new DataTransfer();
                    transfer.items.add(item.file);
                    void upload(transfer.files);
                  }}>Повторити</button>
                  <button type="button" className="text-danger underline" onClick={() => {
                    URL.revokeObjectURL(item.url);
                    setLocalPreviews((current) => current.filter((preview) => preview.id !== item.id));
                  }}>Видалити</button>
                </span>
              ) : null}
            </div>
          </article>
        ))}
        {items.map((item) => (
          <article
            key={item.id}
            className="overflow-hidden rounded-xl border border-border bg-surface-muted/40"
          >
            <button
              type="button"
              className="block w-full text-left"
              onClick={() => {
                void open(item);
              }}
            >
              {previewErrors[item.id] ? (
                <div className="flex aspect-video items-center justify-center bg-danger/5 p-4 text-center text-sm text-danger">
                  Не вдалося завантажити передогляд. Натисніть, щоб повторити.
                </div>
              ) : urls[item.id] ? (
                item.kind === 'VIDEO' ? (
                  <video
                    className="aspect-video w-full object-cover"
                    controls
                    preload="metadata"
                    src={urls[item.id]}
                    onError={() => setPreviewErrors((current) => ({ ...current, [item.id]: true }))}
                  />
                ) : (
                  <img
                    className="aspect-video w-full object-cover"
                    src={urls[item.id]}
                    alt={item.title ?? item.originalFileName}
                    onError={() => setPreviewErrors((current) => ({ ...current, [item.id]: true }))}
                  />
                )
              ) : (
                <div className="flex aspect-video items-center justify-center bg-surface-muted text-sm text-text-secondary">
                  {item.kind === 'VIDEO' ? 'Відео' : 'Зображення'} · відкрити
                </div>
              )}
              <div className="p-3">
                <p className="font-medium text-text-primary">
                  {item.title ?? item.originalFileName}
                </p>
                <p className="mt-1 text-xs text-text-secondary">
                  {item.capturedAt
                    ? new Date(item.capturedAt).toLocaleDateString()
                    : 'Дата не вказана'}{' '}
                  · {item.uploadedBy}
                </p>
                {item.description ? (
                  <p className="mt-2 text-sm text-text-secondary">{item.description}</p>
                ) : null}
              </div>
            </button>
          </article>
        ))}
      </div>
      {!items.length ? (
        <p className="mt-5 text-sm text-text-secondary">Медіа ще не додано.</p>
      ) : null}
    </section>
  );
}
