import { apiUrl, getApiOrigin } from "@/lib/api/config";
import type { LoginResponse } from "@/lib/api/types";
import { readApiError } from "@/lib/api/client";

export async function fetchHealth(): Promise<boolean> {
  const origin = getApiOrigin();
  if (!origin) return false;
  try {
    const res = await fetch(`${origin}/api/health/`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function loginRequest(
  username: string,
  password: string,
): Promise<LoginResponse> {
  const res = await fetch(apiUrl("/api/auth/login/"), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  return res.json() as Promise<LoginResponse>;
}
