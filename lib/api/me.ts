import { apiFetch, readApiError } from "@/lib/api/client";
import type { ApiMe } from "@/lib/api/types";

/** FIO — `full_name` yoki familiya, ism, otasining ismi */
export function formatMeFio(m: Pick<ApiMe, "full_name" | "first_name" | "last_name" | "middle_name" | "username">): string {
  const full = typeof m.full_name === "string" ? m.full_name.trim() : "";
  if (full) return full;
  const mid =
    typeof m.middle_name === "string" && m.middle_name.trim()
      ? ` ${m.middle_name.trim()}`
      : "";
  const triple = `${m.last_name ?? ""} ${m.first_name ?? ""}${mid}`
    .replace(/\s+/g, " ")
    .trim();
  if (triple) return triple;
  const pair = `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim();
  if (pair) return pair;
  return m.username;
}

/** Bo'lim nomi — turli backend maydonlari */
export function pickDepartmentLabel(m: ApiMe): string | null {
  const dn = m.department_name?.trim();
  if (dn) return dn;
  if (typeof m.department === "string" && m.department.trim()) {
    return m.department.trim();
  }
  if (
    m.department &&
    typeof m.department === "object" &&
    typeof m.department.name === "string" &&
    m.department.name.trim()
  ) {
    return m.department.name.trim();
  }
  return null;
}

export async function fetchMe(): Promise<ApiMe> {
  const res = await apiFetch("/api/me/", { method: "GET" });
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json() as Promise<ApiMe>;
}

export async function updateMe(body: Partial<{
  first_name: string;
  last_name: string;
  email: string;
}>): Promise<ApiMe> {
  const res = await apiFetch("/api/me/", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json() as Promise<ApiMe>;
}

export async function changePassword(
  old_password: string,
  new_password: string,
): Promise<void> {
  const res = await apiFetch("/api/me/password/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ old_password, new_password }),
  });
  if (!res.ok) throw new Error(await readApiError(res));
}
