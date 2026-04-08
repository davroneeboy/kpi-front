import { apiFetch, readApiError, unwrapList } from "@/lib/api/client";
import type { ApiTest } from "@/lib/api/types";

export async function fetchTests(): Promise<ApiTest[]> {
  const res = await apiFetch("/api/tests/", { method: "GET" });
  if (!res.ok) throw new Error(await readApiError(res));
  const data: unknown = await res.json();
  return unwrapList<ApiTest>(data);
}
