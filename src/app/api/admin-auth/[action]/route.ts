import { NextRequest, NextResponse } from "next/server";

const ALLOWED_ACTIONS = new Set(["login", "refresh", "logout"]);
const REFRESH_COOKIE_NAME = process.env.REFRESH_COOKIE_NAME ?? "jeni_refresh_token";

function getApiBaseUrl() {
  const baseUrl = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    throw new Error("API_BASE_URL or NEXT_PUBLIC_API_BASE_URL is not configured.");
  }

  return baseUrl.replace(/\/+$/, "");
}

function isSecureRequest(request: NextRequest) {
  return (
    request.nextUrl.protocol === "https:" ||
    request.headers.get("x-forwarded-proto") === "https" ||
    request.headers.get("x-forwarded-ssl") === "on"
  );
}

function getSetCookieHeaders(headers: Headers) {
  const maybeHeaders = headers as Headers & { getSetCookie?: () => string[] };
  const setCookies = maybeHeaders.getSetCookie?.();
  if (setCookies?.length) {
    return setCookies;
  }

  const setCookie = headers.get("set-cookie");
  return setCookie ? [setCookie] : [];
}

function getCookieAttribute(setCookie: string, attributeName: string) {
  const prefix = `${attributeName.toLowerCase()}=`;
  return setCookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.toLowerCase().startsWith(prefix));
}

function rewriteRefreshCookie(setCookie: string, request: NextRequest) {
  const [nameValue] = setCookie.split(";", 1);
  if (!nameValue?.startsWith(`${REFRESH_COOKIE_NAME}=`)) {
    return null;
  }

  const attributes = [
    nameValue,
    "Path=/api/admin-auth",
    "HttpOnly",
    "SameSite=Lax",
  ];
  const maxAge = getCookieAttribute(setCookie, "Max-Age");
  const expires = getCookieAttribute(setCookie, "Expires");

  if (maxAge) {
    attributes.push(maxAge);
  }
  if (expires) {
    attributes.push(expires);
  }
  if (isSecureRequest(request)) {
    attributes.push("Secure");
  }

  return attributes.join("; ");
}

function clearRefreshCookie(request: NextRequest) {
  return [
    `${REFRESH_COOKIE_NAME}=`,
    "Path=/api/admin-auth",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
    isSecureRequest(request) ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ action: string }> },
) {
  const { action } = await context.params;

  if (!ALLOWED_ACTIONS.has(action)) {
    return NextResponse.json({ message: "Unknown auth action." }, { status: 404 });
  }

  const body = action === "login" ? await request.text() : undefined;
  const headers = new Headers({
    Accept: "application/json",
  });
  const contentType = request.headers.get("content-type");
  const cookie = request.headers.get("cookie");

  if (contentType && body) {
    headers.set("Content-Type", contentType);
  }
  if (cookie) {
    headers.set("Cookie", cookie);
  }

  const backendResponse = await fetch(`${getApiBaseUrl()}/auth/${action}`, {
    method: "POST",
    headers,
    body,
    cache: "no-store",
    redirect: "manual",
  });
  const responseBody = await backendResponse.text();
  const response = new NextResponse(responseBody || null, {
    status: backendResponse.status,
    headers: {
      "Content-Type": backendResponse.headers.get("content-type") ?? "application/json",
    },
  });

  for (const setCookie of getSetCookieHeaders(backendResponse.headers)) {
    const rewrittenCookie = rewriteRefreshCookie(setCookie, request);
    if (rewrittenCookie) {
      response.headers.append("Set-Cookie", rewrittenCookie);
    }
  }

  if (action === "logout") {
    response.headers.append("Set-Cookie", clearRefreshCookie(request));
  }

  return response;
}
