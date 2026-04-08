import { apiUrl } from "@/lib/api/config";
import type { ApiErrorBody, TokenRefreshResponse } from "@/lib/api/types";
import {
  clearClientAuth,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "@/lib/auth-storage";

let refreshInFlight: Promise<boolean> | null = null;

async function postRefresh(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const res = await fetch(apiUrl("/api/auth/refresh/"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ refresh }),
      });
      if (!res.ok) return false;
      const data = (await res.json()) as TokenRefreshResponse;
      if (!data.access) return false;
      setTokens(data.access, data.refresh);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export type ApiFetchOptions = RequestInit & {
  /** default: true for mutating methods */
  auth?: boolean;
  /** ichki: qayta urinishdan oldin refresh qilinmasin */
  _skipRefresh?: boolean;
};

export async function apiFetch(
  path: string,
  options: ApiFetchOptions = {},
): Promise<Response> {
  const { auth = true, _skipRefresh, headers: initHeaders, ...rest } = options;
  const headers = new Headers(initHeaders);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");

  if (auth && !headers.has("Authorization")) {
    const access = getAccessToken();
    if (access) headers.set("Authorization", `Bearer ${access}`);
  }

  if (
    rest.body &&
    typeof rest.body === "string" &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  let res = await fetch(apiUrl(path), { ...rest, headers });

  if (res.status === 401 && auth && !_skipRefresh) {
    const ok = await postRefresh();
    if (ok) {
      const retryHeaders = new Headers(headers);
      const newAccess = getAccessToken();
      if (newAccess) retryHeaders.set("Authorization", `Bearer ${newAccess}`);
      res = await fetch(apiUrl(path), {
        ...rest,
        headers: retryHeaders,
      });
    } else {
      clearClientAuth();
    }
  }

  return res;
}

export async function readApiError(res: Response): Promise<string> {
  const text = await res.text();
  if (!text) return res.statusText || "Xatolik";
  try {
    const j = JSON.parse(text) as ApiErrorBody;
    if (typeof j.detail === "string") return j.detail;
    if (Array.isArray(j.non_field_errors) && j.non_field_errors[0]) {
      return String(j.non_field_errors[0]);
    }
    const firstKey = Object.keys(j).find(
      (k) => k !== "detail" && Array.isArray(j[k]),
    );
    if (firstKey) {
      const arr = j[firstKey] as unknown;
      if (Array.isArray(arr) && arr[0]) return String(arr[0]);
    }
    return text;
  } catch {
    return text;
  }
}

export function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (
    data &&
    typeof data === "object" &&
    "results" in data &&
    Array.isArray((data as { results: T[] }).results)
  ) {
    return (data as { results: T[] }).results;
  }
  return [];
}
