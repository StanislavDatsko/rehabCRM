'use client';

import { useState } from 'react';
import { auth } from '../../lib/auth/client';

type Invitation = {
  status?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  organizationName: string;
  role?: string;
  expiresAt: string;
};

export function InviteClaim({ token, invitation, signedInEmail }: { token: string; invitation: Invitation; signedInEmail: string | null }) {
  const [signup, setSignup] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const claim = async (accessToken: string) => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/invite/${encodeURIComponent(token)}/claim`, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) throw new Error(response.status === 409 ? 'Запрошення вже використане, прострочене або належить іншій адресі.' : 'Не вдалося активувати запрошення.');
  };
  async function submit() {
    setPending(true); setError(null);
    try {
      if (!signedInEmail) {
        if (password.length < 8 || (signup && password !== confirm)) throw new Error('Пароль має містити щонайменше 8 символів; підтвердження повинні збігатися.');
        const result = signup
          ? await auth.signUp.email({ email: invitation.email, password, name: `${invitation.firstName} ${invitation.lastName}` })
          : await auth.signIn.email({ email: invitation.email, password });
        if (result.error) throw new Error('Не вдалося виконати вхід або створити обліковий запис.');
      }
      const session = await auth.getSession();
      const tokenResult = await auth.token();
      if (!session.data?.user || !tokenResult.data?.token) throw new Error('Сеанс Neon Auth не створено.');
      if (session.data.user.email.trim().toLowerCase() !== invitation.email.trim().toLowerCase()) throw new Error(`Ви увійшли як ${session.data.user.email}. Це запрошення призначене для ${invitation.email}.`);
      await claim(tokenResult.data.token);
      window.location.assign('/');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Не вдалося активувати запрошення.'); setPending(false); }
  }
  async function signOutAndRetry() {
    await auth.signOut();
    window.location.reload();
  }
  return <main className="rc-atmosphere mx-auto min-h-[28rem] max-w-2xl overflow-hidden rounded-3xl p-8 text-white shadow-brand sm:p-12">
    <p className="text-xs font-bold uppercase tracking-[.18em] text-brand-lime">RehabMIS · запрошення</p>
    <h1 className="mt-4 font-serif text-4xl">Приєднайтеся до команди</h1>
    <p className="mt-3 text-white/75">{invitation.firstName} {invitation.lastName}, вас запрошено до <strong className="text-white">{invitation.organizationName}</strong> як {invitation.role}.</p>
    <p className="mt-2 text-sm text-white/60">{invitation.email} · дійсне до {new Intl.DateTimeFormat('uk-UA', { dateStyle: 'medium' }).format(new Date(invitation.expiresAt))}</p>
    {signedInEmail ? <><p className="mt-8 rounded-xl bg-white/10 p-4 text-sm">Ви увійшли як <strong>{signedInEmail}</strong>. Це запрошення призначене для <strong>{invitation.email}</strong>.</p>{signedInEmail.trim().toLowerCase() === invitation.email.trim().toLowerCase() ? <button disabled={pending} onClick={submit} className="rc-btn mt-6 bg-brand-lime text-purple-950">{pending ? 'Активація…' : 'Активувати доступ'}</button> : <button onClick={signOutAndRetry} className="rc-btn mt-6 bg-white text-purple-900">Вийти та продовжити</button>}</> : <div className="mt-8 space-y-4 rounded-2xl bg-white/10 p-5 backdrop-blur"><label className="block text-sm">Email<input readOnly value={invitation.email} className="field" /></label><label className="block text-sm">Пароль<input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="field" /></label>{signup ? <label className="block text-sm">Підтвердьте пароль<input required type="password" value={confirm} onChange={e => setConfirm(e.target.value)} className="field" /></label> : null}<button disabled={pending} onClick={submit} className="rc-btn w-full bg-brand-lime text-purple-950">{pending ? 'Обробка…' : signup ? 'Створити акаунт і активувати' : 'Увійти й активувати'}</button><button type="button" onClick={() => setSignup(value => !value)} className="w-full text-sm text-white/75 underline">{signup ? 'Вже маєте акаунт? Увійти' : 'Новий користувач? Створити акаунт'}</button></div>}
    {error ? <p role="alert" className="mt-5 rounded-xl bg-red-950/40 p-4 text-sm text-red-100">{error}</p> : null}
  </main>;
}
