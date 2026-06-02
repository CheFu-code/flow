import { NextResponse, type NextRequest } from 'next/server';
import {
  createAccessToken,
  FLOW_ACCESS_COOKIE,
  registerFlowKey,
  SESSION_TTL_SECONDS,
  sessionPayload,
} from '@/lib/flow-access-store';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    accessKey?: string;
    label?: string;
    registrationCode?: string;
  };

  try {
    const registeredKey = await registerFlowKey({
      accessKey: body.accessKey || '',
      label: body.label || '',
      registrationCode: body.registrationCode || '',
    });
    const issuedAt = Math.floor(Date.now() / 1000);
    const response = NextResponse.json({
      ...sessionPayload({
        exp: issuedAt + SESSION_TTL_SECONDS,
        iat: issuedAt,
        keyId: registeredKey.id,
        label: registeredKey.label,
      }),
      keyId: registeredKey.id,
      keyLabel: registeredKey.label,
    });

    response.cookies.set({
      httpOnly: true,
      maxAge: SESSION_TTL_SECONDS,
      name: FLOW_ACCESS_COOKIE,
      path: '/',
      sameSite: 'lax',
      secure: request.nextUrl.protocol === 'https:',
      value: createAccessToken(registeredKey),
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Flow key registration failed.',
      },
      { status: 400 },
    );
  }
}
