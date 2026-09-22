import { notFound } from 'next/navigation';
import { InviteClaim } from '../../../features/auth/invite-claim';
import { AuthLayout } from '../../../features/auth/auth-layout';

export const dynamic = 'force-dynamic';

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const response = await fetch(`${process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL}/api/v1/invite/${encodeURIComponent(token)}`, { cache: 'no-store' });
  if (!response.ok) notFound();
  const invitation = await response.json() as { status?: string; email: string; firstName?: string; lastName?: string; organizationName: string; role?: string; expiresAt: string };
  if (invitation.status && invitation.status !== 'PENDING') return <AuthLayout title={invitation.status === 'EXPIRED' ? 'Запрошення прострочене' : 'Запрошення вже використане'} description={`Це запрошення до ${invitation.organizationName} більше не можна активувати. Зверніться до адміністратора організації, щоб отримати нове.`}><a href="/login" className="rc-btn rc-btn-primary">Повернутися до входу</a></AuthLayout>;
  return <InviteClaim token={token} invitation={invitation} />;
}
