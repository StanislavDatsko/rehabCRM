'use client';
import { useState } from 'react';
import { auth } from '../../lib/auth/client';

export function InviteClaim({ token, invitation, signedInEmail }: { token: string; invitation: { email: string; firstName: string; lastName: string; organizationName: string; role: string; expiresAt: string }; signedInEmail: string | null }) {
  const [error, setError] = useState<string | null>(null);
  const claim = async () => {
    const session = await auth.getSession();
    const tokenResult = await auth.token();
    const accessToken = tokenResult.data?.token;
    if (!session.data?.user || !accessToken) { window.location.assign(`/login?returnTo=/invite/${encodeURIComponent(token)}`); return; }
    if (session.data.user.email.trim().toLowerCase() !== invitation.email.trim().toLowerCase()) { setError('Це запрошення призначене для іншої електронної адреси'); return; }
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/invite/${encodeURIComponent(token)}/claim`, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) { setError('Не вдалося активувати запрошення.'); return; }
    window.location.assign('/');
  };
  return <main className="mx-auto max-w-lg p-8"><h1 className="font-serif text-3xl">Запрошення до RehabMIS</h1><p className="mt-4">{invitation.firstName} {invitation.lastName}, {invitation.organizationName}</p><p className="mt-2 text-sm">{invitation.email} · {invitation.role}</p>{signedInEmail ? <button className="mt-8 rounded bg-primary px-4 py-2 text-white" onClick={claim}>Активувати доступ</button> : <p className="mt-8">Увійдіть або створіть Neon Auth account для активації.</p>}{error ? <p role="alert" className="mt-4 text-danger">{error}</p> : null}</main>;
}
