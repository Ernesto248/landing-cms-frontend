import type { ApiErrorResponse } from "@/lib/api/types";

export type JsonInit = Omit<RequestInit, "body"> & {
  body?: BodyInit | object | null;
};

export class ApiError extends Error {
  status: number;
  payload: ApiErrorResponse | null;

  constructor(message: string, status: number, payload: ApiErrorResponse | null = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

function getApiBaseUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured.");
  }

  return baseUrl.replace(/\/+$/, "");
}

function buildApiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
}

function buildHeaders(headersInit?: HeadersInit) {
  const headers = new Headers(headersInit);

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  return headers;
}

async function parseApiError(response: Response) {
  try {
    const payload = (await response.json()) as ApiErrorResponse;
    return new ApiError(payload.message || response.statusText, response.status, payload);
  } catch {
    return new ApiError(response.statusText || "Request failed", response.status, null);
  }
}

export async function apiFetch<T>(path: string, init: JsonInit = {}) {
  const headers = buildHeaders(init.headers);
  const requestInit: RequestInit = {
    method: init.method,
    headers,
    cache: init.cache,
    credentials: init.credentials,
    integrity: init.integrity,
    keepalive: init.keepalive,
    mode: init.mode,
    priority: init.priority,
    redirect: init.redirect,
    referrer: init.referrer,
    referrerPolicy: init.referrerPolicy,
    signal: init.signal,
  };

  if (init.body instanceof FormData) {
    requestInit.body = init.body;
  } else if (init.body && typeof init.body === "object") {
    headers.set("Content-Type", "application/json");
    requestInit.body = JSON.stringify(init.body);
  }

  const response = await fetch(buildApiUrl(path), requestInit);

  if (!response.ok) {
    throw await parseApiError(response);
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

export async function safeApiFetch<T>(path: string, init: JsonInit = {}) {
  try {
    return await apiFetch<T>(path, init);
  } catch {
    return null;
  }
}
