"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  completeAttempt,
  fetchAttemptDetail,
  startAttempt,
  submitAnswer,
} from "@/lib/api/attempt-flow";
import { fetchTestDetail } from "@/lib/api/tests-crud";
import { useAttemptSessionEvents } from "@/lib/hooks/useAttemptSessionEvents";
import type { ApiAttemptDetail, ApiTestDetail, ApiTestQuestionDetail } from "@/lib/api/types";

function isFinishedAttemptError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("заверш") ||
    m.includes("completed") ||
    m.includes("already") ||
    m.includes("attempt")
  );
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className ?? ""}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

function QuestionSkeleton() {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-wrap gap-1.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-8 w-8 animate-pulse rounded-lg bg-zinc-100"
            style={{ animationDelay: `${i * 40}ms` }}
          />
        ))}
      </div>
      <div className="space-y-2">
        <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-100" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-zinc-100" style={{ animationDelay: "80ms" }} />
      </div>
      <div className="mt-5 space-y-2.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-12 animate-pulse rounded-xl bg-zinc-100"
            style={{ animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>
      <div className="mt-5 h-10 w-36 animate-pulse rounded-xl bg-zinc-100" />
    </div>
  );
}

export default function TestOtkazishPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params.id;
  const testId = Number(Array.isArray(rawId) ? rawId[0] : rawId);

  const [test, setTest] = useState<ApiTestDetail | null>(null);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [deadlineMs, setDeadlineMs] = useState<number | null>(null);
  const [, setVaqtTik] = useState(0);
  const deadlineRef = useRef<number | null>(null);
  deadlineRef.current = deadlineMs;

  const [timedOut, setTimedOut] = useState(false);
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [xato, setXato] = useState<string | null>(null);
  const [yakunlanganUrinishXatosi, setYakunlanganUrinishXatosi] = useState(false);
  const [tanlangan, setTanlangan] = useState<Record<number, number>>({});
  const [draftTanlov, setDraftTanlov] = useState<Record<number, number>>({});
  const [answeredIds, setAnsweredIds] = useState<number[]>([]);
  const [currentQuestionId, setCurrentQuestionId] = useState<number | null>(null);
  const [questionsTotal, setQuestionsTotal] = useState<number | null>(null);
  const [questionsAnswered, setQuestionsAnswered] = useState<number | null>(null);
  const [yuborilmoqda, setYuborilmoqda] = useState<number | null>(null);
  const [yakunlanmoqda, setYakunlanmoqda] = useState(false);
  const [chiqishModal, setChiqishModal] = useState(false);
  const [terminated, setTerminated] = useState(false);
  const skipFirstSyncRef = useRef(false);

  const { notification, dismissNotification } = useAttemptSessionEvents(attemptId, {
    active: Boolean(attemptId) && !timedOut && !yakunlanmoqda && !terminated,
    onTerminated: () => setTerminated(true),
    onPageVisible: () => { if (attemptId) void syncAttemptMeta(attemptId); },
  });

  const savollar = useMemo(() => {
    if (!test?.questions?.length) return [];
    return [...test.questions].sort(
      (a, b) => (a.order ?? a.id) - (b.order ?? b.id),
    );
  }, [test]);

  const applyAttemptSnapshot = useCallback((d: ApiAttemptDetail) => {
    if (typeof d.seconds_remaining === "number") {
      const sec = d.seconds_remaining;
      if (sec <= 0) {
        setDeadlineMs(null);
        setTimedOut(true);
      } else {
        setDeadlineMs(Date.now() + sec * 1000);
      }
    }
    if (typeof d.questions_total === "number") setQuestionsTotal(d.questions_total);
    if (typeof d.questions_answered === "number") setQuestionsAnswered(d.questions_answered);
    if (Array.isArray(d.answered_question_ids)) setAnsweredIds(d.answered_question_ids);
    if (Array.isArray(d.responses)) {
      const map: Record<number, number> = {};
      for (const r of d.responses) {
        if (typeof r.question_id === "number" && typeof r.selected_option_id === "number") {
          map[r.question_id] = r.selected_option_id;
        }
      }
      if (Object.keys(map).length) setTanlangan((prev) => ({ ...prev, ...map }));
    }
  }, []);

  const syncAttemptMeta = useCallback(async (aid: number) => {
    try {
      const d = await fetchAttemptDetail(aid);
      applyAttemptSnapshot(d);
      const st = String(d.status ?? "").toLowerCase();
      console.log("[syncAttemptMeta] status:", d.status);
      if (st.includes("terminat")) {
        setTerminated(true);
        return;
      }
      if (st.includes("complete") || st.includes("abandon") || st === "done") {
        router.replace("/natijalar");
      }
    } catch (e) {
      console.log("[syncAttemptMeta] error:", e);
    }
  }, [applyAttemptSnapshot, router]);

  useEffect(() => {
    if (deadlineMs == null || timedOut) return;
    const id = setInterval(() => {
      setVaqtTik((n) => n + 1);
      const dl = deadlineRef.current;
      if (dl != null && Date.now() >= dl) setTimedOut(true);
    }, 1000);
    return () => clearInterval(id);
  }, [deadlineMs, timedOut]);

  useEffect(() => {
    if (!Number.isFinite(testId) || testId <= 0) {
      setXato("Noto'g'ri test identifikatori.");
      setYuklanmoqda(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setYuklanmoqda(true);
      setXato(null);
      setYakunlanganUrinishXatosi(false);
      try {
        const t = await fetchTestDetail(testId);
        if (cancelled) return;
        setTest(t);
        const raw = sessionStorage.getItem(`attempt_bootstrap_${testId}`);
        if (raw) {
          sessionStorage.removeItem(`attempt_bootstrap_${testId}`);
          const att = JSON.parse(raw) as ApiAttemptDetail;
          if (att?.id) {
            skipFirstSyncRef.current = true;
            setAttemptId(att.id);
            applyAttemptSnapshot(att);
          }
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : "Testni yuklab yoki urinishni boshlab bo'lmadi.";
          setXato(msg);
          if (isFinishedAttemptError(msg)) setYakunlanganUrinishXatosi(true);
        }
      } finally {
        if (!cancelled) setYuklanmoqda(false);
      }
    })();
    return () => { cancelled = true; };
  }, [testId, syncAttemptMeta, applyAttemptSnapshot]);

  async function boshlash() {
    if (!Number.isFinite(testId) || testId <= 0) return;
    setYuklanmoqda(true);
    setXato(null);
    try {
      const att = await startAttempt(testId);
      skipFirstSyncRef.current = true;
      setAttemptId(att.id);
      applyAttemptSnapshot(att);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Urinishni boshlab bo'lmadi.";
      setXato(msg);
      if (isFinishedAttemptError(msg)) setYakunlanganUrinishXatosi(true);
    } finally {
      setYuklanmoqda(false);
    }
  }

  useEffect(() => {
    if (!attemptId || timedOut) return;
    let cancelled = false;
    const run = () => { if (!cancelled) void syncAttemptMeta(attemptId); };
    if (skipFirstSyncRef.current) {
      skipFirstSyncRef.current = false;
    } else {
      run();
    }
    const t = setInterval(run, 15000);
    return () => { cancelled = true; clearInterval(t); };
  }, [attemptId, timedOut, syncAttemptMeta]);

  function variantTanlash(savolId: number, variantId: number) {
    if (timedOut || yuklanmoqda) return;
    setDraftTanlov((prev) => ({ ...prev, [savolId]: variantId }));
  }

  const savolIds = savollar.map((q) => q.id);

  const joriySavol = useMemo(() => {
    if (currentQuestionId != null) {
      const byId = savollar.find((q) => q.id === currentQuestionId);
      if (byId) return byId;
    }
    return savollar[0] ?? null;
  }, [currentQuestionId, savollar]);

  const joriyTanlov =
    joriySavol == null
      ? null
      : draftTanlov[joriySavol.id] ?? tanlangan[joriySavol.id] ?? null;

  const isLastQuestion =
    joriySavol != null &&
    (questionsTotal != null && questionsAnswered != null
      ? questionsAnswered + 1 >= questionsTotal
      : answeredIds.length + 1 >= savollar.length);

  const barchaJavoblangan =
    savollar.length > 0 &&
    savollar.every((q) => (draftTanlov[q.id] ?? tanlangan[q.id]) != null);

  function moveToNextQuestion() {
    if (!joriySavol || !savolIds.length) return;
    const idx = savolIds.indexOf(joriySavol.id);
    if (idx < 0 || idx === savolIds.length - 1) return;
    setCurrentQuestionId(savolIds[idx + 1]);
  }

  async function keyingiSavol() {
    if (!attemptId || !joriySavol || timedOut) return;
    if (joriyTanlov == null) { moveToNextQuestion(); return; }
    if (isLastQuestion) {
      setDraftTanlov((prev) => ({ ...prev, [joriySavol.id]: joriyTanlov }));
      return;
    }
    if (tanlangan[joriySavol.id] === joriyTanlov) { moveToNextQuestion(); return; }
    setYuborilmoqda(joriySavol.id);
    setXato(null);
    try {
      await submitAnswer(attemptId, joriySavol.id, joriyTanlov);
      setTanlangan((prev) => ({ ...prev, [joriySavol.id]: joriyTanlov }));
      setDraftTanlov((prev) => { const next = { ...prev }; delete next[joriySavol.id]; return next; });
      await syncAttemptMeta(attemptId);
      moveToNextQuestion();
    } catch (e) {
      setXato(e instanceof Error ? e.message : "Javobni saqlab bo'lmadi.");
    } finally {
      setYuborilmoqda(null);
    }
  }

  async function yakunlashHozirgiJavoblarBilan(variant: "barcha" | "istalgan") {
    if (!attemptId || timedOut) return;
    if (variant === "barcha" && !barchaJavoblangan) return;
    setYakunlanmoqda(true);
    setXato(null);
    try {
      const pending = savollar
        .map((q) => {
          const selected = draftTanlov[q.id] ?? tanlangan[q.id];
          if (selected == null) return null;
          if (tanlangan[q.id] === selected) return null;
          return { questionId: q.id, optionId: selected };
        })
        .filter((v): v is { questionId: number; optionId: number } => v != null);
      for (const p of pending) await submitAnswer(attemptId, p.questionId, p.optionId);
      await completeAttempt(attemptId);
      setChiqishModal(false);
      router.replace("/natijalar");
    } catch (e) {
      setXato(e instanceof Error ? e.message : "Testni yakunlab bo'lmadi.");
    } finally {
      setYakunlanmoqda(false);
    }
  }

  async function yakunlash() {
    await yakunlashHozirgiJavoblarBilan("barcha");
  }

  function chiqishniBoshlash() {
    if (!attemptId) { router.push("/testlar"); return; }
    if (timedOut) { router.replace("/natijalar"); return; }
    setChiqishModal(true);
  }

  const qolganSoniya =
    deadlineMs == null ? null : Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000));

  const timerUrgency =
    qolganSoniya == null ? null
    : qolganSoniya < 60 ? "critical"
    : qolganSoniya < 300 ? "warning"
    : "ok";

  const timerClasses: Record<"ok" | "warning" | "critical", string> = {
    ok: "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200",
    warning: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
    critical: "bg-red-50 text-red-700 ring-1 ring-red-200 animate-pulse",
  };

  const answeredCount = questionsAnswered ?? answeredIds.length;
  const totalCount = questionsTotal ?? savollar.length;
  const progressPct = totalCount > 0 ? Math.min(100, Math.round((answeredCount / totalCount) * 100)) : 0;

  if (!Number.isFinite(testId) || testId <= 0) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4">
        <p className="text-sm text-red-800">{xato ?? "Noto'g'ri manzil."}</p>
        <Link href="/testlar" className="mt-2 inline-block text-sm font-medium text-emerald-800 hover:underline">
          ← Testlar ro&apos;yxatiga qaytish
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ─── Header ─── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/testlar"
            className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 transition hover:text-emerald-900"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
              <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
            </svg>
            Testlar
          </Link>
          <h2 className="mt-1.5 text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">
            {yuklanmoqda && !test ? (
              <span className="inline-block h-7 w-56 animate-pulse rounded-lg bg-zinc-200" aria-hidden />
            ) : (
              test?.title ?? "Test"
            )}
          </h2>
          {test?.description ? (
            <p className="mt-1 text-sm leading-relaxed text-zinc-500">{test.description}</p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {qolganSoniya != null && qolganSoniya > 0 && !timedOut ? (
            <span
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold tabular-nums transition-colors duration-700 ${timerClasses[timerUrgency!]}`}
              aria-live="polite"
              aria-atomic="true"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 shrink-0" aria-hidden>
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" />
              </svg>
              {Math.floor(qolganSoniya / 60)}:{String(qolganSoniya % 60).padStart(2, "0")}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => chiqishniBoshlash()}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-600 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900"
          >
            Chiqish
          </button>
        </div>
      </div>

      {/* ─── Progress bar ─── */}
      {attemptId && totalCount > 0 && !yuklanmoqda ? (
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-medium text-zinc-500">Bajarildi</span>
            <span className="tabular-nums font-semibold text-zinc-700">
              {answeredCount} / {totalCount}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-[width] duration-500 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      ) : null}

      {/* ─── Warning banner ─── */}
      {attemptId && !timedOut && !yakunlanmoqda ? (
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden>
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          <p className="text-amber-900">
            <span className="font-semibold">Diqqat:</span>{" "}
            test davomida boshqa yorliqqa yoki ilovaga o&apos;tish natijangizga ta&apos;sir qiladi.
          </p>
        </div>
      ) : null}

      {/* ─── Timed out ─── */}
      {timedOut ? (
        <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0 text-red-500" aria-hidden>
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" />
          </svg>
          <p className="text-red-900">
            Vaqt tugadi. Urinish yopilgan bo&apos;lishi mumkin — natijalar sahifasini tekshiring.
          </p>
        </div>
      ) : null}

      {/* ─── Error ─── */}
      {xato ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          <p>{xato}</p>
          {yakunlanganUrinishXatosi ? (
            <button
              type="button"
              onClick={() => router.push("/natijalar")}
              className="mt-2 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-900 transition hover:bg-red-50"
            >
              Natijalarni ochish
            </button>
          ) : null}
        </div>
      ) : null}

      {/* ─── Main content ─── */}
      {yuklanmoqda ? (
        <QuestionSkeleton />
      ) : !test ? null : !attemptId ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7 text-emerald-700" aria-hidden>
              <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-zinc-900">Testni boshlashga tayyormisiz?</h3>
          <p className="mt-1.5 text-sm text-zinc-500">
            &quot;Boshlash&quot; tugmasini bossangiz, vaqt hisobi boshlanadi.
          </p>
          <button
            type="button"
            onClick={() => void boshlash()}
            className="mt-6 rounded-xl bg-emerald-700 px-8 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-900/15 transition hover:bg-emerald-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          >
            Boshlash
          </button>
        </div>
      ) : savollar.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white px-6 py-10 text-center shadow-sm">
          <p className="text-sm text-zinc-500">Bu testda savollar yo&apos;q.</p>
        </div>
      ) : (
        <>
          {joriySavol ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
              {/* Question nav */}
              <div className="mb-5 flex flex-wrap gap-1.5">
                {savollar.map((q, idx) => {
                  const selected = draftTanlov[q.id] ?? tanlangan[q.id];
                  const active = joriySavol.id === q.id;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setCurrentQuestionId(q.id)}
                      aria-label={`${idx + 1}-savol${selected != null ? " (javoblangan)" : ""}`}
                      aria-pressed={active}
                      className={`relative h-8 min-w-[2rem] rounded-lg px-2 text-xs font-semibold transition-all duration-150 ${
                        active
                          ? "bg-emerald-700 text-white shadow-sm"
                          : selected != null
                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                            : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900"
                      }`}
                    >
                      {idx + 1}
                      {selected != null && !active ? (
                        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-1 ring-white" aria-hidden />
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {/* Question text */}
              <p className="text-[15px] font-medium leading-relaxed text-zinc-900">
                {joriySavol.text}
              </p>

              {/* Options */}
              <ul className="mt-4 space-y-2">
                {joriySavol.options.map((opt) => {
                  const tanlanganmi = joriyTanlov === opt.id;
                  const disabled = timedOut || yuborilmoqda === joriySavol.id || !attemptId;
                  return (
                    <li key={opt.id}>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => variantTanlash(joriySavol.id, opt.id)}
                        className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all duration-150 ${
                          tanlanganmi
                            ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500/40"
                            : "border-zinc-200 hover:border-emerald-300 hover:bg-zinc-50"
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                      >
                        <span
                          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-150 ${
                            tanlanganmi ? "border-emerald-600 bg-emerald-600" : "border-zinc-300"
                          }`}
                          aria-hidden
                        >
                          {tanlanganmi ? (
                            <span className="h-1.5 w-1.5 rounded-full bg-white" />
                          ) : null}
                        </span>
                        <span className={tanlanganmi ? "font-medium text-emerald-950" : "text-zinc-700"}>
                          {opt.text}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              {/* Next question */}
              <div className="mt-5 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => void keyingiSavol()}
                  disabled={timedOut || !attemptId || yuborilmoqda === joriySavol.id}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-900/15 transition hover:bg-emerald-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {yuborilmoqda === joriySavol.id ? (
                    <>
                      <Spinner className="h-3.5 w-3.5 text-white" />
                      Saqlanmoqda…
                    </>
                  ) : (
                    "Keyingi savol"
                  )}
                </button>
                <span className="text-xs text-zinc-400">
                  Javobsiz ham davom etishingiz mumkin
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-900">
              Barcha savollar javoblangan — testni yakunlang.
            </div>
          )}

          {/* Submit section */}
          <div className="rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-zinc-800">Testni yakunlash</p>
                {!barchaJavoblangan ? (
                  <p className="mt-0.5 text-xs text-zinc-400">
                    Barcha {totalCount} ta savolga javob tanlang
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs font-medium text-emerald-700">
                    Barcha savollar javoblangan — yakunlashga tayyor
                  </p>
                )}
              </div>
              <button
                type="button"
                disabled={!barchaJavoblangan || timedOut || yakunlanmoqda || !attemptId}
                onClick={() => void yakunlash()}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-900/15 transition hover:bg-emerald-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {yakunlanmoqda ? (
                  <>
                    <Spinner className="h-3.5 w-3.5 text-white" />
                    Yakunlanmoqda…
                  </>
                ) : (
                  "Testni yakunlash"
                )}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ─── Notification modal ─── */}
      {notification ? (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4 backdrop-blur-[2px]"
          onClick={dismissNotification}
        >
          <div
            className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-amber-200 bg-white px-6 py-7 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 text-amber-500" aria-hidden>
                <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.598 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-base font-semibold text-zinc-900">
                {notification.eventType === "page_visible"
                  ? "Boshqa yorliqqa o'tildi"
                  : "Boshqa ilova ochildi"}
              </p>
              <p className="mt-1.5 text-sm text-zinc-500">{notification.message}</p>
            </div>
            <button
              type="button"
              onClick={dismissNotification}
              className="w-full rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
            >
              Tushunarli
            </button>
          </div>
        </div>
      ) : null}

      {/* ─── Terminated modal ─── */}
      {terminated ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-[2px]"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="terminated-title"
        >
          <div className="flex w-full max-w-sm flex-col items-center gap-5 rounded-2xl border border-red-100 bg-white px-6 py-8 text-center shadow-2xl">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8 text-red-500" aria-hidden>
                <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p id="terminated-title" className="text-xl font-bold tracking-tight text-zinc-900">
                Test to&apos;xtatildi
              </p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                Boshqa yorliq yoki ilova ochilganligi sababli urinish avtomatik yakunlandi.
                Ball hisoblanmaydi.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.replace("/natijalar")}
              className="w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-700"
            >
              Natijalarni ko&apos;rish
            </button>
          </div>
        </div>
      ) : null}

      {/* ─── Exit modal ─── */}
      {chiqishModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="chiqish-modal-title"
          onClick={() => !yakunlanmoqda && setChiqishModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="chiqish-modal-title" className="text-lg font-semibold text-zinc-900">
              Testni yakunlash
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-500">
              Chiqish testni hozirgi holatda yakunlaydi: saqlangan javoblar yuboriladi.
              Javob berilmagan savollar bo&apos;sh qolishi mumkin.
            </p>
            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                disabled={yakunlanmoqda}
                onClick={() => setChiqishModal(false)}
                className="flex-1 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                disabled={yakunlanmoqda || timedOut}
                onClick={() => void yakunlashHozirgiJavoblarBilan("istalgan")}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-900/15 transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {yakunlanmoqda ? (
                  <>
                    <Spinner className="h-3.5 w-3.5 text-white" />
                    Yakunlanmoqda…
                  </>
                ) : (
                  "Ha, yakunlash"
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
