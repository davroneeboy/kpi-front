"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const KEY = "active_attempt";

export type ActiveAttempt = {
  attemptId: number;
  testId: number;
};

export function setActiveAttempt(data: ActiveAttempt) {
  sessionStorage.setItem(KEY, JSON.stringify(data));
}

export function clearActiveAttempt() {
  sessionStorage.removeItem(KEY);
}

export function getActiveAttempt(): ActiveAttempt | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as unknown;
    if (
      data !== null &&
      typeof data === "object" &&
      typeof (data as Record<string, unknown>).attemptId === "number" &&
      typeof (data as Record<string, unknown>).testId === "number"
    ) {
      return data as ActiveAttempt;
    }
    return null;
  } catch {
    return null;
  }
}

/** Вставить в layout: если есть активная попытка и пользователь не на странице теста — редирект. */
export function ActiveAttemptGuard() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const active = getActiveAttempt();
    if (!active) return;

    const testPath = `/testlar/${active.testId}`;
    if (pathname.startsWith(testPath)) return; // уже на своём тесте

    // Юзер открыл другой тест вручную — не мешаем, сбрасываем активную попытку
    const isOtherTest = /^\/testlar\/\d+/.test(pathname) && !pathname.startsWith(testPath);
    if (isOtherTest) {
      clearActiveAttempt();
      return;
    }

    router.replace(testPath);
  }, [pathname, router]);

  return null;
}
