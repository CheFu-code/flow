import { NextResponse, type NextRequest } from "next/server";

const COOKIE_NAME = "flow_access";

type AccessToken = {
  exp: number;
  keyId: string;
};

function base64UrlEncode(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return atob(padded);
}

async function signingSecret() {
  return (
    process.env.FLOW_ACCESS_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "flow-local-development-secret"
  );
}

async function sign(payload: string) {
  const secret = await signingSecret();
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );

  return base64UrlEncode(signature);
}

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;

  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return mismatch === 0;
}

async function hasFlowAccess(cookieValue?: string) {
  if (!cookieValue) return false;

  const [payload, signature] = cookieValue.split(".");
  if (!payload || !signature) return false;

  const expectedSignature = await sign(payload);
  if (!safeEqual(signature, expectedSignature)) return false;

  try {
    const token = JSON.parse(base64UrlDecode(payload)) as AccessToken;
    const now = Math.floor(Date.now() / 1000);

    return Boolean(token.keyId) && token.exp > now;
  } catch {
    return false;
  }
}

function withRequestId(response: NextResponse, request: NextRequest) {
  response.headers.set(
    "x-request-id",
    request.headers.get("x-request-id") || crypto.randomUUID(),
  );
  return response;
}

function isPublicPath(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/api/flow-access")
  );
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return withRequestId(NextResponse.next(), request);
  }

  const isAllowed = await hasFlowAccess(request.cookies.get(COOKIE_NAME)?.value);

  if (isAllowed) {
    return withRequestId(NextResponse.next(), request);
  }

  if (pathname.startsWith("/api/")) {
    return withRequestId(
      NextResponse.json(
        { error: "A registered Flow access key is required." },
        { status: 401 },
      ),
      request,
    );
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  loginUrl.searchParams.set("next", `${pathname}${search}`);

  return withRequestId(NextResponse.redirect(loginUrl), request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map|woff|woff2)).*)",
  ],
};
