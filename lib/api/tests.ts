import { apiFetch, readApiError, unwrapList } from "@/lib/api/client";
import { singleFlight } from "@/lib/api/request-single-flight";
import type { ApiTest } from "@/lib/api/types";

const TESTS_CACHE_TTL_MS = 15_000;
let testsCache: { value: ApiTest[]; expiresAt: number } | null = null;

export function fetchTests(): Promise<ApiTest[]> {
  if (testsCache && testsCache.expiresAt > Date.now()) {
    return Promise.resolve(testsCache.value);
  }
  return singleFlight("GET /api/tests/", async () => {
    const res = await apiFetch("/api/tests/", { method: "GET" });
    if (!res.ok) throw new Error(await readApiError(res));
    const data: unknown = await res.json();
    const list = unwrapList<ApiTest>(data);
    testsCache = { value: list, expiresAt: Date.now() + TESTS_CACHE_TTL_MS };
    return list;
  });
}
