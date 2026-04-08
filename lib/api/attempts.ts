import { apiFetch, readApiError, unwrapList } from "@/lib/api/client";
import type { ApiAttempt } from "@/lib/api/types";

export async function fetchAttempts(
  params?: Record<string, string | undefined>,
): Promise<ApiAttempt[]> {
  const qs = new URLSearchParams();
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v != null && v !== "") qs.set(k, v);
    }
  }
  const path = qs.toString()
    ? `/api/attempts/?${qs.toString()}`
    : "/api/attempts/";
  const res = await apiFetch(path, { method: "GET" });
  if (!res.ok) throw new Error(await readApiError(res));
  const data: unknown = await res.json();
  return unwrapList<ApiAttempt>(data);
}
