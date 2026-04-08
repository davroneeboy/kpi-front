import { apiFetch, readApiError } from "@/lib/api/client";
import type { ApiAttemptDetail } from "@/lib/api/types";

/** POST /api/tests/<id>/attempts/ */
export async function startAttempt(testId: number): Promise<ApiAttemptDetail> {
  const res = await apiFetch(`/api/tests/${testId}/attempts/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json() as Promise<ApiAttemptDetail>;
}

/** GET /api/attempts/<id>/ */
export async function fetchAttemptDetail(id: number): Promise<ApiAttemptDetail> {
  const res = await apiFetch(`/api/attempts/${id}/`, { method: "GET" });
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json() as Promise<ApiAttemptDetail>;
}

/** POST /api/attempts/<id>/answer/ */
export async function submitAnswer(
  attemptId: number,
  question_id: number,
  option_id: number,
): Promise<ApiAttemptDetail | unknown> {
  const res = await apiFetch(`/api/attempts/${attemptId}/answer/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question_id, option_id }),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  const ct = res.headers.get("content-type");
  if (ct?.includes("application/json")) return res.json();
  return undefined;
}

export async function completeAttempt(attemptId: number): Promise<unknown> {
  const res = await apiFetch(`/api/attempts/${attemptId}/complete/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  const ct = res.headers.get("content-type");
  if (ct?.includes("application/json")) return res.json();
  return undefined;
}

export async function abandonAttempt(attemptId: number): Promise<unknown> {
  const res = await apiFetch(`/api/attempts/${attemptId}/abandon/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  const ct = res.headers.get("content-type");
  if (ct?.includes("application/json")) return res.json();
  return undefined;
}
