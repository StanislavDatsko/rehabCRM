'use client';

import { useState } from 'react';
import { AuthLayout } from './auth-layout';

type Invitation = {
  status?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  organizationName: string;
  role?: string;
  expiresAt: string;
};

export function InviteClaim({ token, invitation }: { token: string; invitation: Invitation }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const claim = async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetch(`/api/invite/${encodeURIComponent(token)}/claim`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: invitation.email, password }) });
      if (response.ok) return;
      if (response.status === 409) throw new Error('Запрошення вже використане, прострочене або належить іншій адресі.');
      if (response.status !== 401 || attempt === 2) throw new Error('Не вдалося активувати запрошення.');
      await new Promise(resolve => setTimeout(resolve, attempt === 0 ? 250 : 500));
    }
  };
  async function submit() {
    setPending(true); setError(null);
    try {
      if (password.length < 10 || password !== confirm) throw new Error('Пароль має містити щонайменше 10 символів; підтвердження повинні збігатися.');
      await claim();
      window.location.assign('/');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Не вдалося активувати запрошення.'); setPending(false); }
  }
  return <AuthLayout title="Приєднайтеся до команди" description={`${invitation.firstName ?? ''} ${invitation.lastName ?? ''}, вас запрошено до ${invitation.organizationName} як ${invitation.role ?? 'учасника команди'}.`}>
    <p className="mb-6 text-sm text-text-secondary">{invitation.email} · дійсне до {new Intl.DateTimeFormat('uk-UA', { dateStyle: 'medium' }).format(new Date(invitation.expiresAt))}</p>
    <div className="ui-surface space-y-4 p-5"><label className="block text-sm font-medium">Email<input readOnly value={invitation.email} className="field mt-2" /></label><label className="block text-sm font-medium">Пароль<input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="field mt-2" /></label><label className="block text-sm font-medium">Підтвердьте пароль<input required type="password" value={confirm} onChange={e => setConfirm(e.target.value)} className="field mt-2" /></label><button disabled={pending} onClick={submit} className="rc-btn rc-btn-primary w-full">{pending ? 'Обробка…' : 'Створити пароль і активувати'}</button></div>
    {error ? <p role="alert" className="ui-error-state mt-5">{error}</p> : null}
  </AuthLayout>;
}
