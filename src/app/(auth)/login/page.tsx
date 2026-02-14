'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { GoogleIcon } from '@/components/GoogleIcon';

export default function LoginPage() {
  const t = useTranslations('auth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    setIsLoading(false);

    if (result?.error) {
      setError(t('error.invalidCredentials'));
    } else {
      window.location.href = '/products';
    }
  };

  const handleGoogleLogin = () => {
    signIn('google', { callbackUrl: '/products' });
  };

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">{t('login.title')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('login.subtitle')}</p>
      </div>

      {/* Google Login */}
      <button
        onClick={handleGoogleLogin}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium transition-colors hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
      >
        <GoogleIcon />
        {t('login.google')}
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200 dark:border-zinc-700" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-zinc-50 px-2 text-gray-400 dark:bg-zinc-950">{t('login.or')}</span>
        </div>
      </div>

      {/* Email Login Form */}
      <form onSubmit={handleEmailLogin} className="space-y-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('field.email')}
          required
          aria-label={t('field.email')}
          aria-describedby={error ? 'login-error' : undefined}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent dark:bg-zinc-800 dark:border-zinc-700 dark:focus:ring-zinc-400"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('field.password')}
          required
          aria-label={t('field.password')}
          aria-describedby={error ? 'login-error' : undefined}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent dark:bg-zinc-800 dark:border-zinc-700 dark:focus:ring-zinc-400"
        />

        {error && (
          <p id="login-error" className="text-sm text-red-500" role="alert">{error}</p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-xl bg-black px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200"
        >
          {isLoading ? t('login.loading') : t('login.submit')}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500">
        {t('login.noAccount')}{' '}
        <Link href="/signup" className="font-medium text-black dark:text-white hover:underline">
          {t('login.signupLink')}
        </Link>
      </p>
    </div>
  );
}
