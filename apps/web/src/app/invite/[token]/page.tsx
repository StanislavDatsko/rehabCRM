import { notFound } from 'next/navigation';
import { InviteClaim } from '../../../features/auth/invite-claim';
import { auth } from '../../../lib/auth/server';

export const dynamic = 'force-dynamic';

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const response = await fetch(`${process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL}/api/v1/invite/${encodeURIComponent(token)}`, { cache: 'no-store' });
  if (!response.ok) notFound();
  const invitation = await response.json() as { email: string; firstName: string; lastName: string; organizationName: string; role: string; expiresAt: string };
  const { data: session } = await auth.getSession();
  return <InviteClaim token={token} invitation={invitation} signedInEmail={session?.user?.email ?? null} />;
}
