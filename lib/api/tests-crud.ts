import { apiFetch, readApiError } from "@/lib/api/client";
import { singleFlight } from "@/lib/api/request-single-flight";
import type { ApiTestDetail, ApiTestUpsertPayload } from "@/lib/api/types";

/** GET /api/tests/<id>/ — kartochka; staff uchun variantlarda `is_correct` */
export function fetchTestDetail(testId: number): Promise<ApiTestDetail> {
  return singleFlight(`GET /api/tests/${testId}/`, async () => {
    const res = await apiFetch(`/api/tests/${testId}/`, { method: "GET" });
    if (!res.ok) throw new Error(await readApiError(res));
    return res.json() as ApiTestDetail;
  });
}

/** POST /api/tests/ — to'liq test + savollar + variantlar (`is_correct`) */
export async function createTest(
  body: ApiTestUpsertPayload,
): Promise<ApiTestDetail> {
  const err = validateTestUpsert(body);
  if (err) throw new Error(err);
  const res = await apiFetch("/api/tests/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json() as Promise<ApiTestDetail>;
}

/** PUT yoki PATCH /api/tests/<id>/ */
export async function updateTest(
  testId: number,
  body: ApiTestUpsertPayload,
  method: "PUT" | "PATCH" = "PATCH",
): Promise<ApiTestDetail> {
  const err = validateTestUpsert(body);
  if (err) throw new Error(err);
  const res = await apiFetch(`/api/tests/${testId}/`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json() as Promise<ApiTestDetail>;
}

/** DELETE /api/tests/<id>/ */
export async function deleteTest(testId: number): Promise<void> {
  const res = await apiFetch(`/api/tests/${testId}/`, { method: "DELETE" });
  if (!res.ok) throw new Error(await readApiError(res));
}

/**
 * Har savolda aynan bitta to'g'ri variant (is_correct: true) bo'lishi kerak.
 * Client-side tekshiruv; backend ham tasdiqlashi kerak.
 */
export function validateTestUpsert(body: ApiTestUpsertPayload): string | null {
  if (!body.title?.trim()) return "Test sarlavhasi bo'sh bo'lmasligi kerak.";
  if (!Array.isArray(body.questions) || body.questions.length === 0) {
    return "Kamida bitta savol kiriting.";
  }
  for (let i = 0; i < body.questions.length; i++) {
    const q = body.questions[i];
    const n = i + 1;
    if (!q.text?.trim()) return `${n}-savol matni bo'sh.`;
    if (!Array.isArray(q.options) || q.options.length < 2) {
      return `${n}-savolda kamida 2 ta variant bo'lishi kerak.`;
    }
    let correct = 0;
    for (const o of q.options) {
      if (!o.text?.trim()) return `${n}-savolda bo'sh variant bor.`;
      if (o.is_correct) correct += 1;
    }
    if (correct !== 1) {
      return `${n}-savolda aynan bitta to'g'ri variant belgilanishi kerak (hozir: ${correct}).`;
    }
  }
  return null;
}
