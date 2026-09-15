import { serverApiFetch } from '../../../lib/api/server-api-client';
import { dismissNotification, markNotificationRead } from '../../../features/notifications/actions';
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
      <header className="rc-gradient-brand rounded-[1.25rem] p-6 text-white shadow-brand">
        <p className="rc-kicker text-white/75">Комунікація</p>
        <h1 className="mt-1 text-3xl font-semibold">Сповіщення</h1>
        <p className="mt-2 text-sm text-white/80">Ваші внутрішні сповіщення про реабілітацію.</p>
      </header>
      {items.length ? (
        <div className="space-y-3">
          {items.map((item) => (
            <article
              key={item.id}
              className={`rc-card p-4 ${item.status === 'UNREAD' ? 'border-brand/40 bg-brand/5' : ''}`}
            >
              <p className="font-medium">{item.title}</p>
              <p className="mt-1 text-sm">{item.message}</p>
              <p className="mt-2 text-xs text-text-secondary">
                {new Date(item.createdAt).toLocaleString('uk-UA')} ·{' '}
                {item.status === 'UNREAD' ? 'нове' : 'прочитано'}
              </p>
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
