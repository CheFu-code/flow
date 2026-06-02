import { NextResponse, type NextRequest } from 'next/server';
import {
  createAccessToken,
  findRegisteredKey,
  FLOW_ACCESS_COOKIE,
  SESSION_TTL_SECONDS,
  sessionPayload,
  verifyAccessToken,
} from '@/lib/flow-access-store';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const token = await verifyAccessToken(
    request.cookies.get(FLOW_ACCESS_COOKIE)?.value,
  );

  return NextResponse.json(sessionPayload(token), {
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { code?: string };
  const matchedKey = await findRegisteredKey(body.code || '');

  if (!matchedKey) {
    return NextResponse.json(
      { error: 'That Flow key is not registered.' },
      { status: 401 },
    );
  }

  const issuedAt = Math.floor(Date.now() / 1000);
  const response = NextResponse.json(
    sessionPayload({
      exp: issuedAt + SESSION_TTL_SECONDS,
      iat: issuedAt,
      keyId: matchedKey.id,
      label: matchedKey.label,
    }),
  );

  response.cookies.set({
    httpOnly: true,
    maxAge: SESSION_TTL_SECONDS,
    name: FLOW_ACCESS_COOKIE,
    path: '/',
    sameSite: 'lax',
    secure: request.nextUrl.protocol === 'https:',
    value: createAccessToken(matchedKey),
  });

  return response;
}

export function DELETE() {
  const response = NextResponse.json({ granted: false });

  response.cookies.set({
    httpOnly: true,
    maxAge: 0,
    name: FLOW_ACCESS_COOKIE,
    path: '/',
    sameSite: 'lax',
    value: '',
  });

  return response;
}
