import { NextRequest, NextResponse } from 'next/server';
import { defaultLocale, locales, LOCALE_COOKIE, type Locale } from './i18n/config';

export function middleware(request: NextRequest) {
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;

  // If no cookie, try Accept-Language header
  if (!cookieLocale) {
    const acceptLanguage = request.headers.get('Accept-Language') || '';
    const preferredLocale: Locale = acceptLanguage.includes('ko') ? 'ko' : defaultLocale;

    // Set cookie for future requests
    const response = NextResponse.next();
    response.cookies.set(LOCALE_COOKIE, preferredLocale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: 'lax',
    });
    return response;
  }

  // Validate existing cookie value
  if (!locales.includes(cookieLocale as Locale)) {
    const response = NextResponse.next();
    response.cookies.set(LOCALE_COOKIE, defaultLocale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  // Match all routes except static files and API routes
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
