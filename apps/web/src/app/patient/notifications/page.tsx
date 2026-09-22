import { serverApiFetch } from '../../../lib/api/server-api-client';
import { dismissNotification, markNotificationRead } from '../../../features/notifications/actions';
import { PageHeader, StatusPill } from '@repo/ui/workspace';
type Item = {
  id: string;
  title: string;
  message: string;
  type: string;
  status: string;
  createdAt: string;
  readAt: string | null;
};
export default async function PatientNotificationsPage() {
  const items = await serverApiFetch<Item[]>('/api/v1/patient-portal/notifications');
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Комунікація" title="Сповіщення" description="Ваші внутрішні сповіщення про реабілітацію." />
      {items.length ? (
        <div className="space-y-3">
          {items.map((item) => (
            <article
              key={item.id}
              className={`ui-filter-bar p-4 ${item.status === 'UNREAD' ? 'border-info/40 bg-info/5' : ''}`}
            >
              <p className="font-medium">{item.title}</p>
              <p className="mt-1 text-sm">{item.message}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-text-secondary"><span>{new Date(item.createdAt).toLocaleString('uk-UA')}</span><StatusPill tone={item.status === 'UNREAD' ? 'info' : 'neutral'}>{item.status === 'UNREAD' ? 'Нове' : 'Прочитано'}</StatusPill></div>
              {item.status === 'UNREAD' ? (
                <div className="mt-3 flex gap-3">
                  <form action={markNotificationRead}>
                    <input type="hidden" name="id" value={item.id} />
                    <button className="text-sm text-info underline">Позначити прочитаним</button>
                  </form>
                  <form action={dismissNotification}>
                    <input type="hidden" name="id" value={item.id} />
                    <button className="text-sm text-info underline">Приховати</button>
                  </form>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <p className="text-text-secondary">Сповіщень поки немає.</p>
      )}
    </div>
  );
}
