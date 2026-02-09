# Auth Feature Design

> **Feature**: auth
> **Version**: 0.1.0
> **Plan Reference**: [auth.plan.md](../../01-plan/features/auth.plan.md)
> **Date**: 2026-02-09

---

## 1. File Map

| # | File | Type | Sprint |
|---|------|:----:|:------:|
| 1 | `prisma/schema.prisma` | MODIFY | 1 |
| 2 | `src/auth.ts` | NEW | 1 |
| 3 | `src/types/next-auth.d.ts` | NEW | 1 |
| 4 | `src/app/api/auth/[...nextauth]/route.ts` | NEW | 1 |
| 5 | `src/app/api/auth/signup/route.ts` | NEW | 1 |
| 6 | `prisma/seed.ts` | MODIFY | 1 |
| 7 | `.env.example` | MODIFY | 1 |
| 8 | `src/app/(auth)/layout.tsx` | NEW | 2 |
| 9 | `src/app/(auth)/login/page.tsx` | NEW | 2 |
| 10 | `src/app/(auth)/signup/page.tsx` | NEW | 2 |
| 11 | `src/app/(auth)/pending/page.tsx` | NEW | 2 |
| 12 | `src/messages/en/auth.json` | NEW | 2 |
| 13 | `src/messages/ko/auth.json` | NEW | 2 |
| 14 | `src/middleware.ts` | MODIFY | 3 |
| 15 | `src/lib/auth.ts` | NEW | 3 |
| 16 | `src/app/api/admin/users/route.ts` | NEW | 3 |
| 17 | `src/app/api/admin/users/[id]/role/route.ts` | NEW | 3 |
| 18 | `src/app/(dashboard)/admin/users/page.tsx` | NEW | 3 |
| 19 | `src/components/UserMenu.tsx` | NEW | 3 |
| 20 | `src/app/(dashboard)/layout.tsx` | MODIFY | 3 |
| 21 | `src/app/page.tsx` | MODIFY | 3 |
| 22 | `src/messages/en/admin.json` | NEW | 3 |
| 23 | `src/messages/ko/admin.json` | NEW | 3 |
| 24 | `src/app/api/shops/route.ts` | MODIFY | 3 |
| 25 | `src/app/api/shops/[id]/route.ts` | MODIFY | 3 |

**Total: 13 NEW + 8 MODIFY + 4 i18n = 25 file operations**

---

## 2. Dependencies

```bash
npm install next-auth@5 @auth/prisma-adapter bcryptjs
npm install -D @types/bcryptjs
```

---

## 3. Sprint 1: Core Auth Setup

### 3.1 `prisma/schema.prisma` (MODIFY)

Append after existing models:

```prisma
// ---- Auth Models ----

enum UserRole {
  PENDING
  USER
  ADMIN
}

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
  passwordHash  String?
  role          UserRole  @default(PENDING)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  accounts Account[]
  sessions Session[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String
  expires    DateTime

  @@unique([identifier, token])
}
```

### 3.2 `src/auth.ts` (NEW)

```tsx
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  providers: [
    Google({
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user?.passwordHash) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash,
        );

        if (!isValid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user || trigger === 'update') {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub! },
          select: { role: true },
        });
        token.role = dbUser?.role ?? 'PENDING';
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
});
```

### 3.3 `src/types/next-auth.d.ts` (NEW)

```ts
import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: string;
  }
}
```

### 3.4 `src/app/api/auth/[...nextauth]/route.ts` (NEW)

```ts
import { handlers } from '@/auth';

export const { GET, POST } = handlers;
```

### 3.5 `src/app/api/auth/signup/route.ts` (NEW)

```ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const signupSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = signupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: 'Email already registered' },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { name, email, passwordHash },
    select: { id: true, name: true, email: true, role: true },
  });

  return NextResponse.json(user, { status: 201 });
}
```

### 3.6 `prisma/seed.ts` (MODIFY)

Add admin user seed after locations:

```ts
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  // Locations
  const locations = [
    { name: '1st Floor', code: 'F1', level: 1, description: '1층 매장/창고' },
    { name: 'Basement', code: 'B1', level: 1, description: '지하 창고' },
  ];

  for (const loc of locations) {
    await prisma.location.upsert({
      where: { code: loc.code },
      update: {},
      create: loc,
    });
  }

  // Seed admin user
  await prisma.user.upsert({
    where: { email: 'peter.kim@sokimnewyork.com' },
    update: { role: 'ADMIN' },
    create: {
      email: 'peter.kim@sokimnewyork.com',
      name: 'Peter Kim',
      role: 'ADMIN',
    },
  });

  console.log('Seed completed: 2 locations, 1 admin user');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

### 3.7 `.env.example` (MODIFY)

Append:

```env
# Auth (Auth.js v5)
AUTH_SECRET="generate-with-npx-auth-secret"
AUTH_GOOGLE_ID="your-google-client-id"
AUTH_GOOGLE_SECRET="your-google-client-secret"
```

---

## 4. Sprint 2: Auth UI

### 4.1 `src/app/(auth)/layout.tsx` (NEW)

Centered minimal layout for login/signup/pending pages. No dashboard sidebar.

```tsx
import { getLocale, getMessages } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
        {children}
      </div>
    </NextIntlClientProvider>
  );
}
```

### 4.2 `src/app/(auth)/login/page.tsx` (NEW)

```tsx
'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export default function LoginPage() {
  const t = useTranslations('auth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
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
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
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
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent dark:bg-zinc-800 dark:border-zinc-700 dark:focus:ring-zinc-400"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('field.password')}
          required
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent dark:bg-zinc-800 dark:border-zinc-700 dark:focus:ring-zinc-400"
        />

        {error && (
          <p className="text-sm text-red-500">{error}</p>
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
```

### 4.3 `src/app/(auth)/signup/page.tsx` (NEW)

```tsx
'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export default function SignupPage() {
  const t = useTranslations('auth');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error === 'Email already registered'
          ? t('error.emailExists')
          : t('error.signupFailed'));
        setIsLoading(false);
        return;
      }

      // Auto-login after signup
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        window.location.href = '/login';
      } else {
        window.location.href = '/pending';
      }
    } catch {
      setError(t('error.signupFailed'));
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    signIn('google', { callbackUrl: '/pending' });
  };

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">{t('signup.title')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('signup.subtitle')}</p>
      </div>

      {/* Google Signup */}
      <button
        onClick={handleGoogleSignup}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium transition-colors hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        {t('signup.google')}
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200 dark:border-zinc-700" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-zinc-50 px-2 text-gray-400 dark:bg-zinc-950">{t('login.or')}</span>
        </div>
      </div>

      {/* Email Signup Form */}
      <form onSubmit={handleEmailSignup} className="space-y-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('field.name')}
          required
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent dark:bg-zinc-800 dark:border-zinc-700 dark:focus:ring-zinc-400"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('field.email')}
          required
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent dark:bg-zinc-800 dark:border-zinc-700 dark:focus:ring-zinc-400"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('field.password')}
          required
          minLength={8}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent dark:bg-zinc-800 dark:border-zinc-700 dark:focus:ring-zinc-400"
        />

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-xl bg-black px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200"
        >
          {isLoading ? t('signup.loading') : t('signup.submit')}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500">
        {t('signup.hasAccount')}{' '}
        <Link href="/login" className="font-medium text-black dark:text-white hover:underline">
          {t('signup.loginLink')}
        </Link>
      </p>
    </div>
  );
}
```

### 4.4 `src/app/(auth)/pending/page.tsx` (NEW)

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { signOut } from 'next-auth/react';

export default function PendingPage() {
  const t = useTranslations('auth');

  return (
    <div className="w-full max-w-sm space-y-6 text-center">
      {/* Clock icon */}
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-900/20">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="text-amber-500">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('pending.title')}</h1>
        <p className="mt-2 text-sm text-gray-500 leading-relaxed">{t('pending.message')}</p>
      </div>

      <button
        onClick={() => signOut({ callbackUrl: '/login' })}
        className="rounded-full border border-gray-200 px-6 py-2 text-sm font-medium transition-colors hover:bg-gray-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        {t('pending.logout')}
      </button>
    </div>
  );
}
```

### 4.5 `src/messages/en/auth.json` (NEW)

```json
{
  "login": {
    "title": "Welcome back",
    "subtitle": "Sign in to BDJ Inventory",
    "google": "Continue with Google",
    "or": "or",
    "submit": "Sign In",
    "loading": "Signing in...",
    "noAccount": "Don't have an account?",
    "signupLink": "Sign up"
  },
  "signup": {
    "title": "Create an account",
    "subtitle": "Get started with BDJ Inventory",
    "google": "Sign up with Google",
    "submit": "Create Account",
    "loading": "Creating account...",
    "hasAccount": "Already have an account?",
    "loginLink": "Sign in"
  },
  "pending": {
    "title": "Account Pending",
    "message": "Your account is awaiting admin approval. You'll be able to access the system once an administrator approves your request.",
    "logout": "Sign Out"
  },
  "field": {
    "name": "Full name",
    "email": "Email address",
    "password": "Password (min 8 characters)"
  },
  "error": {
    "invalidCredentials": "Invalid email or password",
    "emailExists": "An account with this email already exists",
    "signupFailed": "Failed to create account. Please try again."
  }
}
```

### 4.6 `src/messages/ko/auth.json` (NEW)

```json
{
  "login": {
    "title": "다시 오신 것을 환영합니다",
    "subtitle": "BDJ Inventory에 로그인",
    "google": "Google로 계속하기",
    "or": "또는",
    "submit": "로그인",
    "loading": "로그인 중...",
    "noAccount": "계정이 없으신가요?",
    "signupLink": "회원가입"
  },
  "signup": {
    "title": "계정 만들기",
    "subtitle": "BDJ Inventory 시작하기",
    "google": "Google로 가입",
    "submit": "계정 만들기",
    "loading": "계정 생성 중...",
    "hasAccount": "이미 계정이 있으신가요?",
    "loginLink": "로그인"
  },
  "pending": {
    "title": "승인 대기 중",
    "message": "계정이 관리자 승인을 기다리고 있습니다. 관리자가 요청을 승인하면 시스템에 접근할 수 있습니다.",
    "logout": "로그아웃"
  },
  "field": {
    "name": "이름",
    "email": "이메일 주소",
    "password": "비밀번호 (8자 이상)"
  },
  "error": {
    "invalidCredentials": "이메일 또는 비밀번호가 올바르지 않습니다",
    "emailExists": "이미 등록된 이메일입니다",
    "signupFailed": "계정 생성에 실패했습니다. 다시 시도해 주세요."
  }
}
```

---

## 5. Sprint 3: Route Protection + Admin

### 5.1 `src/middleware.ts` (MODIFY — full rewrite)

```ts
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { defaultLocale, locales, LOCALE_COOKIE, type Locale } from './i18n/config';

const publicPaths = ['/login', '/signup'];
const pendingPaths = ['/pending'];
const adminOnlyPaths = ['/shops', '/admin'];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // ---- i18n cookie logic (preserved) ----
  const cookieLocale = req.cookies.get(LOCALE_COOKIE)?.value;
  let localeResponse: NextResponse | null = null;

  if (!cookieLocale) {
    const acceptLanguage = req.headers.get('Accept-Language') || '';
    const preferredLocale: Locale = acceptLanguage.includes('ko') ? 'ko' : defaultLocale;
    localeResponse = NextResponse.next();
    localeResponse.cookies.set(LOCALE_COOKIE, preferredLocale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
  } else if (!locales.includes(cookieLocale as Locale)) {
    localeResponse = NextResponse.next();
    localeResponse.cookies.set(LOCALE_COOKIE, defaultLocale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
  }

  // ---- Auth logic ----
  const isPublicPath = publicPaths.some((p) => pathname === p || pathname.startsWith(p + '/'));
  const isPendingPath = pendingPaths.some((p) => pathname === p);
  const isAdminPath = adminOnlyPaths.some((p) => pathname === p || pathname.startsWith(p + '/'));

  // Guest: only allow public paths
  if (!session) {
    if (isPublicPath) return localeResponse ?? NextResponse.next();
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const role = session.user?.role;

  // Authenticated on public page → redirect away
  if (isPublicPath) {
    const dest = role === 'PENDING' ? '/pending' : '/products';
    return NextResponse.redirect(new URL(dest, req.url));
  }

  // PENDING user: only allow /pending
  if (role === 'PENDING') {
    if (isPendingPath) return localeResponse ?? NextResponse.next();
    return NextResponse.redirect(new URL('/pending', req.url));
  }

  // Non-pending on /pending → redirect
  if (isPendingPath) {
    return NextResponse.redirect(new URL('/products', req.url));
  }

  // Admin-only paths
  if (isAdminPath && role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/products', req.url));
  }

  return localeResponse ?? NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
```

### 5.2 `src/lib/auth.ts` (NEW)

```ts
import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export async function requireAuth(requiredRole?: 'ADMIN') {
  const session = await auth();

  if (!session?.user) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      session: null,
    };
  }

  const role = session.user.role;

  if (role === 'PENDING') {
    return {
      error: NextResponse.json({ error: 'Account pending approval' }, { status: 403 }),
      session: null,
    };
  }

  if (requiredRole === 'ADMIN' && role !== 'ADMIN') {
    return {
      error: NextResponse.json({ error: 'Admin access required' }, { status: 403 }),
      session: null,
    };
  }

  return { error: null, session };
}
```

### 5.3 API Route Protection Pattern

All existing API routes add auth check at the top of each handler:

**Shop routes** (`src/app/api/shops/route.ts`, `shops/[id]/route.ts`, etc.):
```ts
import { requireAuth } from '@/lib/auth';

export async function GET() {
  const { error } = await requireAuth('ADMIN');
  if (error) return error;
  // ... existing logic
}
```

**All other routes** (products, inventory, locations, etc.):
```ts
import { requireAuth } from '@/lib/auth';

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;
  // ... existing logic
}
```

### 5.4 `src/app/api/admin/users/route.ts` (NEW)

```ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  const { error } = await requireAuth('ADMIN');
  if (error) return error;

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      createdAt: true,
    },
    orderBy: [
      { role: 'asc' },
      { createdAt: 'desc' },
    ],
  });

  return NextResponse.json({ users });
}
```

### 5.5 `src/app/api/admin/users/[id]/role/route.ts` (NEW)

```ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';

const roleSchema = z.object({
  role: z.enum(['USER', 'ADMIN']),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, session } = await requireAuth('ADMIN');
  if (error) return error;

  const { id } = await params;

  // Prevent self-demotion
  if (id === session!.user.id) {
    return NextResponse.json(
      { error: 'Cannot change your own role' },
      { status: 400 },
    );
  }

  const body = await req.json();
  const parsed = roleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id },
    data: { role: parsed.data.role },
    select: { id: true, name: true, email: true, role: true },
  });

  return NextResponse.json(user);
}
```

### 5.6 `src/app/(dashboard)/admin/users/page.tsx` (NEW)

```tsx
'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: 'PENDING' | 'USER' | 'ADMIN';
  createdAt: string;
}

const roleBadgeStyles: Record<string, string> = {
  ADMIN: 'bg-black text-white dark:bg-white dark:text-black',
  USER: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

export default function AdminUsersPage() {
  const t = useTranslations('admin');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json() as Promise<{ users: User[] }>;
    },
  });

  const mutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const res = await fetch(`/api/admin/users/${id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error('Failed to update role');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const handleRoleChange = useCallback((id: string, role: string) => {
    mutation.mutate({ id, role });
  }, [mutation]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{t('users.title')}</h1>

      {isLoading ? (
        <p className="py-20 text-center text-gray-400">{t('users.loading')}</p>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white dark:bg-zinc-900 dark:border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:bg-zinc-800/50 dark:border-zinc-700">
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('users.name')}</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('users.email')}</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('users.role')}</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('users.joined')}</th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">{t('users.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-zinc-700">
              {data?.users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                  <td className="px-5 py-4 font-medium">
                    <div className="flex items-center gap-3">
                      {user.image ? (
                        <img src={user.image} alt="" className="h-8 w-8 rounded-full" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-bold dark:bg-zinc-700">
                          {(user.name?.[0] || user.email[0]).toUpperCase()}
                        </div>
                      )}
                      {user.name || '-'}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-500">{user.email}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${roleBadgeStyles[user.role]}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-gray-500">{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-4 text-right">
                    {user.role === 'PENDING' && (
                      <button
                        onClick={() => handleRoleChange(user.id, 'USER')}
                        className="rounded-full bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700"
                      >
                        {t('users.approve')}
                      </button>
                    )}
                    {user.role === 'USER' && (
                      <button
                        onClick={() => handleRoleChange(user.id, 'ADMIN')}
                        className="rounded-full border border-gray-200 px-3 py-1 text-xs font-medium hover:bg-gray-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                      >
                        {t('users.promote')}
                      </button>
                    )}
                    {user.role === 'ADMIN' && (
                      <button
                        onClick={() => handleRoleChange(user.id, 'USER')}
                        className="rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-400 hover:bg-gray-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                      >
                        {t('users.demote')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

### 5.7 `src/components/UserMenu.tsx` (NEW)

```tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';

export function UserMenu() {
  const { data: session } = useSession();
  const t = useTranslations('common');
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!session?.user) return null;

  const initials = (session.user.name?.[0] || session.user.email?.[0] || '?').toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 text-sm transition-colors hover:bg-gray-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        {session.user.image ? (
          <img src={session.user.image} alt="" className="h-6 w-6 rounded-full" />
        ) : (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-black text-[10px] font-bold text-white dark:bg-white dark:text-black">
            {initials}
          </div>
        )}
        <span className="hidden sm:inline">{session.user.name || session.user.email}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <div className="border-b border-gray-200 px-4 py-2 dark:border-zinc-700">
            <p className="text-sm font-medium">{session.user.name}</p>
            <p className="text-xs text-gray-400">{session.user.email}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50 dark:hover:bg-zinc-800"
          >
            {t('button.logout')}
          </button>
        </div>
      )}
    </div>
  );
}
```

### 5.8 `src/app/(dashboard)/layout.tsx` (MODIFY)

```tsx
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';
import { UserMenu } from '@/components/UserMenu';
import { auth } from '@/auth';
import { SessionProvider } from 'next-auth/react';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <SessionProvider session={session}>
      <DashboardShell>{children}</DashboardShell>
    </SessionProvider>
  );
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  // Note: this must be a separate client component or use useTranslations at the right level
  return <InnerLayout>{children}</InnerLayout>;
}
```

> **Note**: Since `useTranslations` is a client hook but `auth()` is server-only, the layout becomes an async server component that wraps a client component. The exact pattern will be refined during implementation to work with both next-intl and SessionProvider.

Key changes:
- Add `SessionProvider` wrapper (needed for `useSession` in `UserMenu`)
- Import and render `<UserMenu />` in the header right side
- Conditionally render Shops nav link: only show if `session.user.role === 'ADMIN'`
- Add "Admin" nav link for ADMIN users: `<Link href="/admin/users">`

### 5.9 `src/app/page.tsx` (MODIFY)

```tsx
import { redirect } from 'next/navigation';
import { auth } from '@/auth';

export default async function Home() {
  const session = await auth();

  if (!session) redirect('/login');
  if (session.user?.role === 'PENDING') redirect('/pending');

  redirect('/products');
}
```

### 5.10 `src/messages/en/admin.json` (NEW)

```json
{
  "users": {
    "title": "User Management",
    "loading": "Loading users...",
    "name": "Name",
    "email": "Email",
    "role": "Role",
    "joined": "Joined",
    "actions": "Actions",
    "approve": "Approve",
    "promote": "Make Admin",
    "demote": "Remove Admin"
  }
}
```

### 5.11 `src/messages/ko/admin.json` (NEW)

```json
{
  "users": {
    "title": "사용자 관리",
    "loading": "사용자 로딩 중...",
    "name": "이름",
    "email": "이메일",
    "role": "역할",
    "joined": "가입일",
    "actions": "작업",
    "approve": "승인",
    "promote": "관리자 승격",
    "demote": "관리자 해제"
  }
}
```

### 5.12 i18n common.json additions

Add to `src/messages/en/common.json`:
```json
{
  "button": {
    "logout": "Sign Out"
  },
  "nav": {
    "admin": "Admin"
  }
}
```

Add to `src/messages/ko/common.json`:
```json
{
  "button": {
    "logout": "로그아웃"
  },
  "nav": {
    "admin": "관리자"
  }
}
```

---

## 6. Implementation Order

### Sprint 1 (Backend)
1. Install dependencies: `npm install next-auth@5 @auth/prisma-adapter bcryptjs && npm install -D @types/bcryptjs`
2. `prisma/schema.prisma` — Add auth models
3. Run migration: `npx prisma migrate dev --name add-auth`
4. `src/types/next-auth.d.ts` — TypeScript augmentation
5. `src/auth.ts` — NextAuth config
6. `src/app/api/auth/[...nextauth]/route.ts` — Route handler
7. `src/app/api/auth/signup/route.ts` — Signup API
8. `prisma/seed.ts` — Add admin seed
9. `.env.example` — Add auth env vars
10. Run seed: `npx prisma db seed`

### Sprint 2 (UI)
1. `src/messages/en/auth.json` + `src/messages/ko/auth.json`
2. `src/app/(auth)/layout.tsx`
3. `src/app/(auth)/login/page.tsx`
4. `src/app/(auth)/signup/page.tsx`
5. `src/app/(auth)/pending/page.tsx`

### Sprint 3 (Protection + Admin)
1. `src/lib/auth.ts` — API auth helper
2. `src/middleware.ts` — Route protection
3. Protect all existing API routes (add `requireAuth()` calls)
4. `src/app/api/admin/users/route.ts`
5. `src/app/api/admin/users/[id]/role/route.ts`
6. `src/messages/en/admin.json` + `src/messages/ko/admin.json`
7. common.json additions (logout, admin nav)
8. `src/components/UserMenu.tsx`
9. `src/app/(dashboard)/layout.tsx` — Add UserMenu + conditional nav
10. `src/app/(dashboard)/admin/users/page.tsx`
11. `src/app/page.tsx` — Update redirect logic

---

## 7. Success Criteria

- [ ] Google OAuth signup/login works
- [ ] Email signup/login works with password hashing
- [ ] New users default to PENDING role
- [ ] PENDING users see /pending page, cannot access dashboard
- [ ] Admin can approve PENDING → USER at /admin/users
- [ ] Admin can promote USER → ADMIN
- [ ] Admin can demote ADMIN → USER (not self)
- [ ] /shops accessible only to ADMIN
- [ ] /products, /inventory accessible to USER + ADMIN
- [ ] Unauthenticated users redirect to /login
- [ ] Header shows UserMenu with name/avatar and logout
- [ ] Shops nav hidden for non-admin users
- [ ] Admin nav shown only for ADMIN users
- [ ] peter.kim@sokimnewyork.com seeded as ADMIN
- [ ] All API routes protected with appropriate role checks
- [ ] `npm run build` passes with 0 errors
- [ ] i18n en/ko complete for auth + admin namespaces

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-02-09 | Initial design | Claude |
