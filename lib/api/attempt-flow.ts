import { apiFetch, readApiError } from "@/lib/api/client";
import { singleFlight } from "@/lib/api/request-single-flight";
import type {
  ApiAttemptDetail,
  AttemptSessionEventPayload,
} from "@/lib/api/types";

/** POST /api/tests/<id>/attempts/ */
export async function startAttempt(testId: number): Promise<ApiAttemptDetail> {
  const res = await apiFetch(`/api/tests/${testId}/attempts/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return (await res.json()) as ApiAttemptDetail;
}

/** GET /api/attempts/<id>/ */
export function fetchAttemptDetail(id: number): Promise<ApiAttemptDetail> {
  return singleFlight(`GET /api/attempts/${id}/`, async () => {
    const res = await apiFetch(`/api/attempts/${id}/`, { method: "GET" });
    if (!res.ok) throw new Error(await readApiError(res));
    return (await res.json()) as ApiAttemptDetail;
  });
}

/** POST /api/attempts/<id>/answer/ */
export async function submitAnswer(
  attemptId: number,
  question_id: number,
  option_id: number,
): Promise<ApiAttemptDetail | undefined> {
  const res = await apiFetch(`/api/attempts/${attemptId}/answer/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question_id, option_id }),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  const ct = res.headers.get("content-type");
  if (ct?.includes("application/json")) return (await res.json()) as ApiAttemptDetail;
  return undefined;
}

export async function completeAttempt(attemptId: number): Promise<void> {
  const res = await apiFetch(`/api/attempts/${attemptId}/complete/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(await readApiError(res));
}

export async function abandonAttempt(attemptId: number): Promise<void> {
  const res = await apiFetch(`/api/attempts/${attemptId}/abandon/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(await readApiError(res));
}

/** POST /api/attempts/<id>/session-events/ — telemetriya; xatoliklarni yutish */
export async function postAttemptSessionEvent(
  attemptId: number,
  body: AttemptSessionEventPayload,
): Promise<void> {
  try {
    const res = await apiFetch(`/api/attempts/${attemptId}/session-events/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...body,
        client_timestamp:
          body.client_timestamp ?? new Date().toISOString(),
      }),
    });
    if (!res.ok) return;
  } catch {
    /* tarmoq / urinish tugagan */
  }
}
