'use client';

import { useState } from 'react';
import { Button } from '@repo/ui/button';
import { auth } from '../../lib/auth/client';

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        const form = new FormData(event.currentTarget);
        const result = await auth.signIn.email({
          email: String(form.get('email') ?? ''),
          password: String(form.get('password') ?? ''),
        });
        if (result.error) {
          setError('Невірна електронна адреса або пароль.');
          setPending(false);
          return;
        }
        window.location.assign('/');
      }}
    >
      <label className="block text-sm font-medium">
        Email
        <input name="email" type="email" required autoComplete="email" className="mt-1 w-full rounded border border-border bg-background px-3 py-2" />
      </label>
      <label className="block text-sm font-medium">
        Пароль
        <input name="password" type="password" required autoComplete="current-password" className="mt-1 w-full rounded border border-border bg-background px-3 py-2" />
      </label>
      {error ? <p role="alert" className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{error}</p> : null}
      <Button type="submit" disabled={pending}>{pending ? 'Вхід…' : 'Увійти в систему'}</Button>
    </form>
  );
}
