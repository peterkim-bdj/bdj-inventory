import { NextResponse, type NextRequest } from 'next/server';
import { defaultLocale, locales, LOCALE_COOKIE, type Locale } from './i18n/config';
import { jwtDecrypt } from 'jose';
import { hkdf } from '@panva/hkdf';

const publicPaths = ['/login', '/signup'];
const pendingPaths = ['/pending'];
const adminOnlyPaths = ['/shops', '/admin'];

/**
 * Derive the encryption key the same way NextAuth v5 does.
 * NextAuth uses HKDF with the cookie name as both salt and part of the info string.
 */
async function getDerivedEncryptionKey(secret: string, salt: string) {
  return await hkdf('sha256', secret, salt, `Auth.js Generated Encryption Key (${salt})`, 64);
}

async function getSessionFromCookie(req: NextRequest) {
  const secureCookie = req.cookies.get('__Secure-authjs.session-token');
  const plainCookie = req.cookies.get('authjs.session-token');

  const cookieName = secureCookie ? '__Secure-authjs.session-token' : 'authjs.session-token';
  const sessionToken = secureCookie?.value ?? plainCookie?.value;

  if (!sessionToken) return null;

  try {
    const secret = process.env.AUTH_SECRET;
    if (!secret) return null;

    const key = await getDerivedEncryptionKey(secret, cookieName);
    const { payload } = await jwtDecrypt(sessionToken, new Uint8Array(key), {
      clockTolerance: 15,
    });
    return payload as { sub?: string; role?: string; exp?: number };
  } catch {
    return null;
  }
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ---- i18n cookie logic ----
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

  const session = await getSessionFromCookie(req);

  // Guest: only allow public paths
  if (!session) {
    if (isPublicPath) return localeResponse ?? NextResponse.next();
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const role = session.role;

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
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
