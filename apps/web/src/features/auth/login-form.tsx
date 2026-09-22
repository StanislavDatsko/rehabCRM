'use client';

import { useState } from 'react';
import { Button } from '@repo/ui/button';
import { safeReturnTo } from '../../lib/auth/safe-return-to';

export function LoginForm({ returnTo }: { returnTo?: string } = {}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form
      className="auth-form space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        const form = new FormData(event.currentTarget);
        try {
        const result = await fetch('/api/local-auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: String(form.get('email') ?? ''), password: String(form.get('password') ?? '') }) });
        if (!result.ok) {
          setError('Невірна електронна адреса або пароль.');
          setPending(false);
          return;
        }
        window.location.assign(safeReturnTo(returnTo));
        } catch { setError('Немає зв’язку із сервером. Спробуйте ще раз.'); }
        finally { setPending(false); }
      }}
    >
      <label className="block text-sm font-medium">
        Email
        <input name="email" type="email" required autoComplete="email" placeholder="name@clinic.com" className="field" />
      </label>
      <label className="block text-sm font-medium">
        Пароль
        <input name="password" type={showPassword ? 'text' : 'password'} required maxLength={128} autoComplete="current-password" className="field" />
      </label>
      <button type="button" aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)} className="auth-password-toggle text-sm underline">{showPassword ? 'Приховати пароль' : 'Показати пароль'}</button>
      {error ? <p role="alert" className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={pending}>{pending ? 'Вхід…' : 'Увійти в систему'}</Button>
      <a href="/register" className="auth-form-link block text-center text-sm underline">Створити обліковий запис</a>
    </form>
  );
}
