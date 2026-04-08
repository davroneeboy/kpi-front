"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  abandonAttempt,
  completeAttempt,
  fetchAttemptDetail,
  startAttempt,
  submitAnswer,
} from "@/lib/api/attempt-flow";
import { fetchTestDetail } from "@/lib/api/tests-crud";
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

export default function TestOtkazishPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params.id;
  const testId = Number(Array.isArray(rawId) ? rawId[0] : rawId);

  const [test, setTest] = useState<ApiTestDetail | null>(null);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  /** Server vaqtidan hisoblangan tugash vaqti (ms) */
  const [deadlineMs, setDeadlineMs] = useState<number | null>(null);
  /** Har soniyada qayta chizish uchun */
  const [vaqtTik, setVaqtTik] = useState(0);
  const deadlineRef = useRef<number | null>(null);
  deadlineRef.current = deadlineMs;

  const [timedOut, setTimedOut] = useState(false);
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [xato, setXato] = useState<string | null>(null);
  const [yakunlanganUrinishXatosi, setYakunlanganUrinishXatosi] =
    useState(false);
  /** savol id → tanlangan variant id */
  const [tanlangan, setTanlangan] = useState<Record<number, number>>({});
  /** vaqtincha tanlov (API ga hali yuborilmagan) */
  const [draftTanlov, setDraftTanlov] = useState<Record<number, number>>({});
  const [answeredIds, setAnsweredIds] = useState<number[]>([]);
  const [nextQuestion, setNextQuestion] = useState<ApiTestQuestionDetail | null>(null);
  const [currentQuestionId, setCurrentQuestionId] = useState<number | null>(null);
  const [questionsTotal, setQuestionsTotal] = useState<number | null>(null);
  const [questionsAnswered, setQuestionsAnswered] = useState<number | null>(null);
  const [yuborilmoqda, setYuborilmoqda] = useState<number | null>(null);
  const [yakunlanmoqda, setYakunlanmoqda] = useState(false);

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
    if (typeof d.questions_answered === "number") {
      setQuestionsAnswered(d.questions_answered);
    }
    if (Array.isArray(d.answered_question_ids)) {
      setAnsweredIds(d.answered_question_ids);
    }
    if (Array.isArray(d.responses)) {
      const map: Record<number, number> = {};
      for (const r of d.responses) {
        if (typeof r.question_id === "number" && typeof r.selected_option_id === "number") {
          map[r.question_id] = r.selected_option_id;
        }
      }
      if (Object.keys(map).length) setTanlangan((prev) => ({ ...prev, ...map }));
    }
    if (d.next_question) {
      setNextQuestion(d.next_question);
      setCurrentQuestionId((prev) => prev ?? d.next_question?.id ?? null);
    } else {
      setNextQuestion(null);
    }
  }, []);

  const syncAttemptMeta = useCallback(async (aid: number) => {
    try {
      const d = await fetchAttemptDetail(aid);
      applyAttemptSnapshot(d);
      const st = String(d.status ?? "").toLowerCase();
      if (
        st.includes("complete") ||
        st.includes("abandon") ||
        st === "done"
      ) {
        router.replace("/natijalar");
      }
    } catch {
      /* vaqt sinxroni ixtiyoriy */
    }
  }, [applyAttemptSnapshot, router]);

  /** Har soniyada qolgan vaqtni yangilash */
  useEffect(() => {
    if (deadlineMs == null || timedOut) return;
    const id = setInterval(() => {
      setVaqtTik((n) => n + 1);
      const dl = deadlineRef.current;
      if (dl != null && Date.now() >= dl) {
        setTimedOut(true);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [deadlineMs, timedOut]);

  useEffect(() => {
    if (!Number.isFinite(testId) || testId <= 0) {
      setXato("Noto‘g‘ri test identifikatori.");
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
            setAttemptId(att.id);
            applyAttemptSnapshot(att);
            await syncAttemptMeta(att.id);
          }
        }
      } catch (e) {
        if (!cancelled) {
          const msg =
            e instanceof Error
              ? e.message
              : "Testni yuklab yoki urinishni boshlab bo‘lmadi.";
          setXato(msg);
          if (isFinishedAttemptError(msg)) {
            setYakunlanganUrinishXatosi(true);
          }
        }
      } finally {
        if (!cancelled) setYuklanmoqda(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [testId, syncAttemptMeta, applyAttemptSnapshot]);

  async function boshlash() {
    if (!Number.isFinite(testId) || testId <= 0) return;
    setYuklanmoqda(true);
    setXato(null);
    try {
      const att = await startAttempt(testId);
      setAttemptId(att.id);
      applyAttemptSnapshot(att);
      await syncAttemptMeta(att.id);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Urinishni boshlab bo‘lmadi.";
      setXato(msg);
      if (isFinishedAttemptError(msg)) {
        setYakunlanganUrinishXatosi(true);
      }
    } finally {
      setYuklanmoqda(false);
    }
  }

  useEffect(() => {
    if (!attemptId || timedOut) return;
    const t = setInterval(() => {
      void syncAttemptMeta(attemptId);
    }, 15000);
    return () => clearInterval(t);
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
    if (nextQuestion) return nextQuestion;
    if (!savollar.length) return null;
    const answered = new Set(answeredIds);
    return savollar.find((q) => !answered.has(q.id)) ?? null;
  }, [currentQuestionId, nextQuestion, savollar, answeredIds]);

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
    if (joriyTanlov == null) {
      moveToNextQuestion();
      return;
    }
    if (isLastQuestion) {
      setDraftTanlov((prev) => ({ ...prev, [joriySavol.id]: joriyTanlov }));
      return;
    }
    if (tanlangan[joriySavol.id] === joriyTanlov) {
      moveToNextQuestion();
      return;
    }
    setYuborilmoqda(joriySavol.id);
    setXato(null);
    try {
      await submitAnswer(attemptId, joriySavol.id, joriyTanlov);
      setTanlangan((prev) => ({ ...prev, [joriySavol.id]: joriyTanlov }));
      setDraftTanlov((prev) => {
        const next = { ...prev };
        delete next[joriySavol.id];
        return next;
      });
      await syncAttemptMeta(attemptId);
      moveToNextQuestion();
    } catch (e) {
      setXato(e instanceof Error ? e.message : "Javobni saqlab bo‘lmadi.");
    } finally {
      setYuborilmoqda(null);
    }
  }

  async function yakunlash() {
    if (!attemptId || !barchaJavoblangan || timedOut) return;
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

      for (const p of pending) {
        await submitAnswer(attemptId, p.questionId, p.optionId);
      }
      await completeAttempt(attemptId);
      router.replace("/natijalar");
    } catch (e) {
      setXato(
        e instanceof Error ? e.message : "Testni yakunlab bo‘lmadi.",
      );
    } finally {
      setYakunlanmoqda(false);
    }
  }

  async function bekorQilish() {
    if (!attemptId) {
      router.push("/testlar");
      return;
    }
    try {
      await abandonAttempt(attemptId);
    } catch {
      /* baribir chiqamiz */
    }
    router.push("/testlar");
  }

  void vaqtTik;
  const qolganSoniya =
    deadlineMs == null
      ? null
      : Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000));

  if (!Number.isFinite(testId) || testId <= 0) {
    return (
      <div className="space-y-4">
        <p className="text-red-700">{xato ?? "Noto‘g‘ri manzil."}</p>
        <Link href="/testlar" className="text-emerald-800 underline">
          Testlar ro‘yxatiga
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/testlar"
            className="text-sm font-medium text-emerald-800 hover:text-emerald-900 hover:underline"
          >
            ← Testlar
          </Link>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
            {test?.title ?? (yuklanmoqda ? "Yuklanmoqda…" : "Test")}
          </h2>
          {test?.description ? (
            <p className="mt-1 text-sm text-zinc-600">{test.description}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {qolganSoniya != null && qolganSoniya > 0 && !timedOut ? (
            <span
              className="tabular-nums rounded-lg bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-900 ring-1 ring-amber-200"
              aria-live="polite"
              aria-atomic="true"
            >
              Qolgan vaqt: {Math.floor(qolganSoniya / 60)}:
              {String(qolganSoniya % 60).padStart(2, "0")}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => void bekorQilish()}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            Chiqish
          </button>
        </div>
      </div>

      {timedOut ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          Vaqt tugadi. Urinish yopilgan bo‘lishi mumkin — natijalar sahifasini
          tekshiring.
        </p>
      ) : null}

      {xato ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          <p>{xato}</p>
          {yakunlanganUrinishXatosi ? (
            <button
              type="button"
              onClick={() => router.push("/natijalar")}
              className="mt-2 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-900 hover:bg-red-100"
            >
              Natijalarni ochish
            </button>
          ) : null}
        </div>
      ) : null}

      {yuklanmoqda ? (
        <p className="text-zinc-500">Test tayyorlanmoqda…</p>
      ) : !test ? null : !attemptId ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-zinc-700">
            Testni boshlash uchun pastdagi tugmani bosing.
          </p>
          <button
            type="button"
            onClick={() => void boshlash()}
            className="mt-3 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-emerald-600"
          >
            Boshlash
          </button>
        </div>
      ) : savollar.length === 0 ? (
        <p className="text-zinc-600">Bu testda savollar yo‘q.</p>
      ) : (
        <>
          <div className="mb-2 text-sm text-zinc-600">
            Javoblangan: {questionsAnswered ?? answeredIds.length}
            {questionsTotal != null ? ` / ${questionsTotal}` : ""}
          </div>

          {joriySavol ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-3 flex flex-wrap gap-2">
                {savollar.map((q, idx) => {
                  const selected = draftTanlov[q.id] ?? tanlangan[q.id];
                  const active = joriySavol.id === q.id;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setCurrentQuestionId(q.id)}
                      className={`h-8 min-w-8 rounded-md px-2 text-xs font-semibold ${
                        active
                          ? "bg-emerald-700 text-white"
                          : selected != null
                            ? "bg-emerald-100 text-emerald-900"
                            : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
              <p className="font-medium text-zinc-900">{joriySavol.text}</p>
              <ul className="mt-3 space-y-2">
                {joriySavol.options.map((opt) => {
                  const tanlanganmi = joriyTanlov === opt.id;
                  const disabled =
                    timedOut || yuborilmoqda === joriySavol.id || !attemptId;
                  return (
                    <li key={opt.id}>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => variantTanlash(joriySavol.id, opt.id)}
                        className={`w-full rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                          tanlanganmi
                            ? "border-emerald-600 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-600"
                            : "border-zinc-200 hover:border-emerald-300 hover:bg-zinc-50"
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                      >
                        {opt.text}
                      </button>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => void keyingiSavol()}
                  disabled={
                    timedOut ||
                    !attemptId ||
                    yuborilmoqda === joriySavol.id
                  }
                  className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {yuborilmoqda === joriySavol.id
                    ? "Saqlanmoqda…"
                    : "Keyingi savol"}
                </button>
                <span className="text-xs text-zinc-500">
                  Bilmasangiz ham keyingi savolga o‘tishingiz mumkin.
                </span>
              </div>
            </div>
          ) : (
            <p className="text-zinc-600">
              Barcha savollar javoblangan. Testni yakunlang.
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={
                !barchaJavoblangan || timedOut || yakunlanmoqda || !attemptId
              }
              onClick={() => void yakunlash()}
              className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {yakunlanmoqda ? "Yakunlanmoqda…" : "Testni yakunlash"}
            </button>
            {!barchaJavoblangan ? (
              <p className="self-center text-sm text-zinc-500">
                Yakunlash uchun barcha savollarga javob tanlang.
              </p>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
