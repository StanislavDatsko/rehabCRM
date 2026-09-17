'use client';
import { useState } from 'react';
import { auth } from '../../lib/auth/client';

export function InviteClaim({ token, invitation, signedInEmail }: { token: string; invitation: { email: string; firstName: string; lastName: string; organizationName: string; role: string; expiresAt: string }; signedInEmail: string | null }) {
  const [error, setError] = useState<string | null>(null);
  const [signup, setSignup] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const claim = async () => {
    if (signup) {
      if (password.length < 8 || password !== confirm) { setError('Паролі мають збігатися та містити щонайменше 8 символів.'); return; }
      const result = await auth.signUp.email({ email: invitation.email, password, name: `${invitation.firstName} ${invitation.lastName}` });
      if (result.error) { setError('Не вдалося створити обліковий запис.'); return; }
    }
    const session = await auth.getSession();
    const tokenResult = await auth.token();
    const accessToken = tokenResult.data?.token;
    if (!session.data?.user || !accessToken) { window.location.assign(`/login?returnTo=/invite/${encodeURIComponent(token)}`); return; }
    if (session.data.user.email.trim().toLowerCase() !== invitation.email.trim().toLowerCase()) { setError('Це запрошення призначене для іншої електронної адреси'); return; }
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/invite/${encodeURIComponent(token)}/claim`, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) { setError('Не вдалося активувати запрошення.'); return; }
    window.location.assign('/');
  };
  return <main className="mx-auto max-w-lg p-8"><h1 className="font-serif text-3xl">Запрошення до RehabMIS</h1><p className="mt-4">{invitation.firstName} {invitation.lastName}, {invitation.organizationName}</p><p className="mt-2 text-sm">{invitation.email} · {invitation.role}</p>{signedInEmail ? <button className="mt-8 rounded bg-primary px-4 py-2 text-white" onClick={claim}>Активувати доступ</button> : <div className="mt-8 space-y-3"><input readOnly value={invitation.email} className="w-full rounded border p-2" />{signup ? <><input type="password" placeholder="Пароль" value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded border p-2" /><input type="password" placeholder="Підтвердіть пароль" value={confirm} onChange={e => setConfirm(e.target.value)} className="w-full rounded border p-2" /></> : null}<button className="rounded bg-primary px-4 py-2 text-white" onClick={claim}>{signup ? 'Створити обліковий запис' : 'Увійти та активувати'}</button><button className="ml-3 text-sm underline" onClick={() => setSignup(!signup)}>{signup ? 'Уже маєте обліковий запис?' : 'Створити новий обліковий запис'}</button></div>}{error ? <p role="alert" className="mt-4 text-danger">{error}</p> : null}</main>;
}
