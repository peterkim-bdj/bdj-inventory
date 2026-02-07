import { NextResponse } from 'next/server';

interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export function apiError(
  code: string,
  message: string,
  status: number,
  details?: Record<string, unknown>
): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    { error: { code, message, details } },
    { status }
  );
}
