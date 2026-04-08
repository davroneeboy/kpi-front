import type { ApiAttempt, ApiTest } from "@/lib/api/types";

/** Ro'yxatda ko'rsatish uchun sana (birinchi mavjud maydon) */
export function pickTestDateIso(test: ApiTest): string | null {
  const candidates = [
    test.conducted_at,
    test.conduct_starts_at,
    test.conduct_ends_at,
    test.starts_at,
    test.ends_at,
    test.created_at,
  ];
  for (const c of candidates) {
    if (c && String(c).trim()) return String(c);
  }
  return null;
}

export function getAttemptTestTitle(a: ApiAttempt): string {
  if (typeof a.test === "object" && a.test?.title) return a.test.title;
  if (a.test_title) return a.test_title;
  if (typeof a.test === "number") return `Test #${a.test}`;
  return "Test";
}

export type UiAttemptStatus = "jarayonda" | "yakunlangan" | "bekor" | "noma'lum";

export function mapAttemptStatus(status: string): UiAttemptStatus {
  const s = status.toLowerCase();
  if (s.includes("progress") || s === "in_progress" || s === "started")
    return "jarayonda";
  if (s.includes("complete") || s === "completed" || s === "done")
    return "yakunlangan";
  if (s.includes("timed_out") || s.includes("timeout") || s.includes("time_out"))
    return "bekor";
  if (s.includes("abandon") || s === "cancelled" || s === "canceled")
    return "bekor";
  return "noma'lum";
}

export function attemptScorePercent(a: ApiAttempt): number | null {
  if (a.score_earned != null && a.score_max != null) {
    const earned = Number(a.score_earned);
    const max = Number(a.score_max);
    if (!Number.isNaN(earned) && !Number.isNaN(max) && max > 0) {
      return Math.round((earned / max) * 100);
    }
  }
  if (a.percentage != null && !Number.isNaN(Number(a.percentage))) {
    return Math.round(Number(a.percentage));
  }
  if (a.score_percent != null && !Number.isNaN(Number(a.score_percent))) {
    return Math.round(Number(a.score_percent));
  }
  if (a.score != null && !Number.isNaN(Number(a.score))) {
    const n = Number(a.score);
    return n <= 1 ? Math.round(n * 100) : Math.round(n);
  }
  return null;
}

export function attemptRawScore(a: ApiAttempt): string | null {
  if (a.score_earned != null && a.score_max != null) {
    return `${a.score_earned}/${a.score_max}`;
  }
  return null;
}

export function pickAttemptFinishedIso(a: ApiAttempt): string | null {
  return a.finished_at ?? a.completed_at ?? a.started_at ?? null;
}
