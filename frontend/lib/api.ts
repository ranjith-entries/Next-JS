import { clearToken, getToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type Options = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
};

export async function api<T = void>(path: string, { method = "GET", body }: Options = {}): Promise<T> {
  const token = getToken();

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  // Token expired or edited: forget it and reload on the login page.
  // A full reload (not router.push) also wipes any data left in memory.
  if (res.status === 401 && token) {
    clearToken();
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/login";
    return new Promise<T>(() => {});
  }

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const message = Array.isArray(data?.message) ? data.message.join(", ") : data?.message;
    throw new Error(message ?? `Request failed (${res.status})`);
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return res.json();
}
