import { notFound } from 'next/navigation';
import { InviteClaim } from '../../../features/auth/invite-claim';
import { auth } from '../../../lib/auth/server';

export const dynamic = 'force-dynamic';

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const response = await fetch(`${process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL}/api/v1/invite/${encodeURIComponent(token)}`, { cache: 'no-store' });
  if (!response.ok) notFound();
  const invitation = await response.json() as { status?: string; email: string; firstName?: string; lastName?: string; organizationName: string; role?: string; expiresAt: string };
  if (invitation.status && invitation.status !== 'PENDING') return <main className="rc-atmosphere mx-auto max-w-2xl rounded-3xl p-10 text-white shadow-brand"><p className="text-xs font-bold uppercase tracking-[.18em] text-brand-lime">RehabMIS · invitation</p><h1 className="mt-4 font-serif text-4xl">{invitation.status === 'EXPIRED' ? 'Запрошення прострочене' : 'Запрошення вже використане'}</h1><p className="mt-4 text-white/75">Це запрошення до {invitation.organizationName} більше не можна активувати. Зверніться до адміністратора організації, щоб отримати нове.</p><a href="/login" className="rc-btn mt-8 inline-block bg-white text-purple-900">Повернутися до входу</a></main>;
  const { data: session } = await auth.getSession();
  return <InviteClaim token={token} invitation={invitation} signedInEmail={session?.user?.email ?? null} />;
}
