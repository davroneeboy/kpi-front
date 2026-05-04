import type { LoginResponse } from "@/lib/api/types";
import { readApiError } from "@/lib/api/client";

export async function fetchHealth(): Promise<boolean> {
  try {
    const res = await fetch("/api/proxy/api/health/", {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) console.warn("[health] upstream returned", res.status);
    return res.ok;
  } catch (err) {
    console.warn("[health] fetch failed:", err);
    return false;
  }
}

export async function loginRequest(
  username: string,
  password: string,
): Promise<LoginResponse> {
  const res = await fetch("/api/proxy/api/auth/login/", {
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
