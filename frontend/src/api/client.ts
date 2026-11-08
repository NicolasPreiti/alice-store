const TOKEN_KEY = "accessToken";

export interface ApiError {
  status: number;
  message: string | string[];
}

export function getToken(): string | null {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

function toApiError(status: number, body: unknown): ApiError {
  if (
    body &&
    typeof body === "object" &&
    "message" in body &&
    (typeof (body as { message: unknown }).message === "string" ||
      Array.isArray((body as { message: unknown }).message))
  ) {
    return { status, message: (body as { message: string | string[] }).message };
  }
  return { status, message: "Request failed" };
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const { token, ...rest } = init;
  const headers = new Headers(rest.headers);
  // Read the token at call time, never captured at module scope.
  const authToken = token ?? getToken();
  if (authToken) headers.set("Authorization", `Bearer ${authToken}`);
  if (rest.body !== undefined && !(rest.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`/api${path}`, { ...rest, headers });
  const text = await response.text();
  const body = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const err = toApiError(response.status, body);
    // The wrapper only clears; the caller/query layer owns navigation.
    if (response.status === 401) clearToken();
    throw err;
  }
  return body as T;
}
