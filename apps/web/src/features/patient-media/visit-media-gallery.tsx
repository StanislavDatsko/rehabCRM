'use client';

import { useEffect, useMemo, useState } from 'react';

type VisitMediaItem = {
  id: string;
  kind: 'IMAGE' | 'VIDEO';
  originalFileName: string;
  createdAt: string;
};

type VisitMediaGroup = {
  encounterId: string;
  startedAt: string | null;
  items: VisitMediaItem[];
};

function dayKey(value: string | Date | null) {
  if (!value) return '';
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function VisitMediaGallery({ patientId, groups, total }: { patientId: string; groups: VisitMediaGroup[]; total: number }) {
  const [selectedEncounterId, setSelectedEncounterId] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [month, setMonth] = useState(() => {
    const first = groups[0]?.startedAt ? new Date(groups[0].startedAt) : new Date();
    return new Date(first.getFullYear(), first.getMonth(), 1);
  });
  const [urls, setUrls] = useState<Record<string, string>>({});

  const selectedGroup = groups.find((group) => group.encounterId === selectedEncounterId) ?? null;
  const visibleGroups = selectedGroup ? [selectedGroup] : groups;
  const availableDays = useMemo(() => new Set(groups.map((group) => dayKey(group.startedAt))), [groups]);
  const monthDays = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const firstWeekday = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7;

  useEffect(() => {
    const items = visibleGroups.flatMap((group) => group.items).slice(0, 100);
    let cancelled = false;
    void Promise.all(items.map(async (item) => {
      const response = await fetch(`/api/patient-media/${patientId}/${item.id}/access`);
      if (!response.ok) return null;
      const data = (await response.json()) as { url: string };
      return [item.id, data.url] as const;
    })).then((entries) => {
      if (!cancelled) setUrls((current) => ({ ...current, ...Object.fromEntries(entries.filter(Boolean) as Array<readonly [string, string]>) }));
    });
    return () => { cancelled = true; };
  }, [patientId, selectedEncounterId, groups]);

  function selectDay(day: number) {
    const target = groups.find((group) => {
      const date = group.startedAt ? new Date(group.startedAt) : null;
      return date && date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth() && date.getDate() === day;
    });
    if (target) {
      setSelectedEncounterId(target.encounterId);
      setCalendarOpen(false);
    }
  }

  return <div className="p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-text-secondary">{selectedGroup ? `Візит · ${new Date(selectedGroup.startedAt ?? '').toLocaleDateString('uk-UA', { dateStyle: 'long' })}` : `${total} фото та відео з усіх візитів`}</p>
      <div className="flex items-center gap-2"><button type="button" className="rc-btn rc-btn-secondary" onClick={() => setCalendarOpen(true)}>Обрати дату</button>{selectedGroup ? <button type="button" className="rc-btn rc-btn-ghost" onClick={() => setSelectedEncounterId('')}>Показати всі</button> : null}</div>
    </div>
    <div className="space-y-5 p-5">
      {!visibleGroups.length ? <p className="text-sm text-text-secondary">Медіа з візитів ще не додано.</p> : visibleGroups.map((group) => <div key={group.encounterId} className="space-y-2">
        <div className="flex items-center gap-3 text-xs font-semibold text-text-secondary"><span className="h-px flex-1 bg-border"/><span>{group.startedAt ? new Date(group.startedAt).toLocaleDateString('uk-UA', { dateStyle: 'long' }) : 'Дата не вказана'}</span><span className="h-px flex-1 bg-border"/></div>
        <div className="grid grid-cols-3 gap-1 sm:grid-cols-5 md:grid-cols-6">
          {group.items.map((item) => <button key={item.id} type="button" className="group relative aspect-square overflow-hidden rounded-md bg-surface-muted" onClick={() => window.open(urls[item.id], '_blank', 'noopener,noreferrer')} aria-label={item.originalFileName}>
            {urls[item.id] ? item.kind === 'VIDEO' ? <video src={urls[item.id]} className="h-full w-full object-cover" muted preload="metadata"/> : <img src={urls[item.id]} alt={item.originalFileName} className="h-full w-full object-cover"/> : <span className="absolute inset-0 animate-pulse bg-surface-muted"/>}
            {item.kind === 'VIDEO' ? <span className="absolute bottom-1 right-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] text-white">▶</span> : null}
          </button>)}
        </div>
      </div>)}
    </div>
    {calendarOpen ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Вибір дати візиту" onClick={() => setCalendarOpen(false)}><div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
      <div className="mb-4 flex items-center justify-between"><h3 className="font-sans text-lg text-text-primary">Медіа за датою</h3><button type="button" className="text-text-secondary" onClick={() => setCalendarOpen(false)}>×</button></div>
      <div className="mb-4 flex items-center justify-between"><button type="button" className="rc-icon-btn" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>‹</button><strong>{month.toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' })}</strong><button type="button" className="rc-icon-btn" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>›</button></div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-text-secondary">{['Пн','Вт','Ср','Чт','Пт','Сб','Нд'].map((day) => <span key={day} className="py-1">{day}</span>)}{Array.from({ length: firstWeekday }).map((_, index) => <span key={`empty-${index}`}/>)}{Array.from({ length: monthDays }, (_, index) => { const day = index + 1; const hasVisit = availableDays.has(dayKey(new Date(month.getFullYear(), month.getMonth(), day))); return <button key={day} type="button" disabled={!hasVisit} onClick={() => selectDay(day)} className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm ${hasVisit ? 'bg-brand/20 font-semibold text-brand hover:bg-brand hover:text-text-primary' : 'text-text-secondary/40'}`}>{day}</button>; })}</div>
      <p className="mt-4 text-xs text-text-secondary">Обведені дати мають медіа з візиту.</p>
    </div></div> : null}
  </div>;
}
