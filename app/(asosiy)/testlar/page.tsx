"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { startAttempt } from "@/lib/api/attempt-flow";
import { fetchTestDetail } from "@/lib/api/tests-crud";
import { fetchTests } from "@/lib/api/tests";
import type { ApiTest } from "@/lib/api/types";
import { formatDdMmYyyy } from "@/lib/format-date";

type TooltipMeta = {
  savollar: number | null;
  daqiqa: number | null;
};

function pickMinutesFromTest(t: ApiTest): number | null {
  const minutes =
    t.time_limit_minutes ??
    t.duration_minutes ??
    (typeof t.time_limit_seconds === "number"
      ? Math.ceil(t.time_limit_seconds / 60)
      : null) ??
    (typeof t.duration_seconds === "number"
      ? Math.ceil(t.duration_seconds / 60)
      : null);
  return typeof minutes === "number" && Number.isFinite(minutes) ? minutes : null;
}

function pickConductStart(test: ApiTest): string | null {
  return test.conduct_starts_at ?? test.starts_at ?? test.conducted_at ?? null;
}

function pickConductEnd(test: ApiTest): string | null {
  return test.conduct_ends_at ?? test.ends_at ?? null;
}

function TestListSkeleton() {
  return (
    <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white shadow-sm">
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i} className="flex items-center gap-4 px-4 py-5">
          <div className="flex-1 space-y-2.5">
            <div
              className="h-4 w-2/3 animate-pulse rounded bg-zinc-100"
              style={{ animationDelay: `${i * 80}ms` }}
            />
            <div
              className="h-3 w-1/3 animate-pulse rounded bg-zinc-100"
              style={{ animationDelay: `${i * 80 + 30}ms` }}
            />
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <div className="hidden sm:block space-y-1.5">
              <div
                className="h-3 w-24 animate-pulse rounded bg-zinc-100"
                style={{ animationDelay: `${i * 80}ms` }}
              />
              <div
                className="h-3 w-20 animate-pulse rounded bg-zinc-100"
                style={{ animationDelay: `${i * 80 + 20}ms` }}
              />
            </div>
            <div
              className="hidden h-6 w-14 animate-pulse rounded-md bg-zinc-100 sm:block"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function TestlarPage() {
  const router = useRouter();
  const [tests, setTests] = useState<ApiTest[] | null>(null);
  const [xato, setXato] = useState<string | null>(null);
  const [activeTooltipId, setActiveTooltipId] = useState<number | null>(null);
  const [metaById, setMetaById] = useState<Record<number, TooltipMeta>>({});
  const [loadingMetaId, setLoadingMetaId] = useState<number | null>(null);
  const [startingId, setStartingId] = useState<number | null>(null);
  const [modalXato, setModalXato] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchTests();
        if (!cancelled) setTests(list);
      } catch (e) {
        if (!cancelled) {
          setXato(
            e instanceof Error
              ? e.message
              : "Testlar ro'yxatini yuklab bo'lmadi.",
          );
          setTests([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function ensureTooltipMeta(t: ApiTest) {
    if (metaById[t.id] || loadingMetaId === t.id) return;

    const inlineSavollar =
      typeof t.question_count === "number" ? t.question_count : null;
    const inlineDaqiqa = pickMinutesFromTest(t);

    if (inlineSavollar != null && inlineDaqiqa != null) {
      setMetaById((prev) => ({
        ...prev,
        [t.id]: { savollar: inlineSavollar, daqiqa: inlineDaqiqa },
      }));
      return;
    }

    setLoadingMetaId(t.id);
    try {
      const detail = await fetchTestDetail(t.id);
      const savollar = Array.isArray(detail.questions)
        ? detail.questions.length
        : inlineSavollar;
      const daqiqa = pickMinutesFromTest(detail) ?? inlineDaqiqa;
      setMetaById((prev) => ({
        ...prev,
        [t.id]: { savollar: savollar ?? null, daqiqa: daqiqa ?? null },
      }));
    } catch {
      setMetaById((prev) => ({
        ...prev,
        [t.id]: { savollar: inlineSavollar, daqiqa: inlineDaqiqa },
      }));
    } finally {
      setLoadingMetaId((current) => (current === t.id ? null : current));
    }
  }

  async function modalBoshlash() {
    if (activeTooltipId == null) return;
    setModalXato(null);
    setStartingId(activeTooltipId);
    try {
      const attempt = await startAttempt(activeTooltipId);
      sessionStorage.setItem(
        `attempt_bootstrap_${activeTooltipId}`,
        JSON.stringify(attempt),
      );
      setActiveTooltipId(null);
      router.push(`/testlar/${activeTooltipId}`);
    } catch (e) {
      setModalXato(
        e instanceof Error ? e.message : "Urinishni boshlab bo'lmadi.",
      );
    } finally {
      setStartingId(null);
    }
  }

  const activeTest = tests?.find((t) => t.id === activeTooltipId) ?? null;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
          Mavjud testlar
        </p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">
          Testlar ro&apos;yxati
        </h2>
        <p className="mt-1.5 text-sm text-zinc-500">
          Test kartasini bosing — ochilgan oynadan boshlang.
        </p>
      </div>

      {xato ? (
        <div
          role="alert"
          className="flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="mt-0.5 h-4 w-4 shrink-0 text-red-500"
            aria-hidden
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
          <p>{xato}</p>
        </div>
      ) : null}

      {tests === null ? (
        <TestListSkeleton />
      ) : tests.length === 0 && !xato ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-zinc-200 bg-white px-6 py-16 text-center shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-7 w-7 text-zinc-400"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-zinc-800">Hozircha testlar yo&apos;q</p>
            <p className="mt-1 text-sm text-zinc-500">
              Administrator yangi test qo&apos;shgach, bu yerda paydo bo&apos;ladi.
            </p>
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white shadow-sm">
          {tests.map((t) => {
            const startIso = pickConductStart(t);
            const endIso = pickConductEnd(t);
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTooltipId(t.id);
                    void ensureTooltipMeta(t);
                  }}
                  className="group flex w-full items-center gap-4 px-4 py-4 text-left transition-colors duration-150 hover:bg-emerald-50/50 focus-visible:bg-emerald-50/50 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-emerald-600 sm:py-4.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-zinc-900 transition-colors group-hover:text-emerald-900">
                      {t.title}
                    </p>
                    {t.description ? (
                      <p className="mt-0.5 truncate text-sm text-zinc-500">
                        {t.description}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 items-center gap-4">
                    <div className="hidden text-right text-xs text-zinc-500 sm:block">
                      <p>
                        <span>Boshlanishi: </span>
                        {startIso ? (
                          <time dateTime={startIso} className="font-medium text-zinc-700">
                            {formatDdMmYyyy(startIso)}
                          </time>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </p>
                      <p>
                        <span>Tugashi: </span>
                        {endIso ? (
                          <time dateTime={endIso} className="font-medium text-zinc-700">
                            {formatDdMmYyyy(endIso)}
                          </time>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </p>
                    </div>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-400 transition-colors duration-150 group-hover:bg-emerald-100 group-hover:text-emerald-700">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className="h-4 w-4"
                        aria-hidden
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {activeTooltipId != null ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-zinc-950/40 p-4 backdrop-blur-[2px]"
          onClick={() => { setActiveTooltipId(null); setModalXato(null); }}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl shadow-zinc-900/20"
            onClick={(e) => e.stopPropagation()}
          >
            {activeTest ? (
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-emerald-700">
                Test
              </p>
            ) : null}
            <h3 className="mt-1 text-lg font-bold tracking-tight text-zinc-900">
              {activeTest?.title ?? "Test"}
            </h3>

            <div className="mt-4 flex gap-4 rounded-xl bg-zinc-50 px-4 py-3 text-sm">
              <div className="flex-1">
                <p className="text-xs font-medium text-zinc-400">Savollar</p>
                <p className="mt-0.5 font-semibold text-zinc-800">
                  {metaById[activeTooltipId]?.savollar != null
                    ? metaById[activeTooltipId].savollar
                    : loadingMetaId === activeTooltipId
                      ? <span className="inline-block h-4 w-6 animate-pulse rounded bg-zinc-200" />
                      : <span className="text-zinc-400">—</span>}
                </p>
              </div>
              <div className="w-px bg-zinc-200" />
              <div className="flex-1">
                <p className="text-xs font-medium text-zinc-400">Vaqt</p>
                <p className="mt-0.5 font-semibold text-zinc-800">
                  {metaById[activeTooltipId]?.daqiqa != null
                    ? `${metaById[activeTooltipId].daqiqa} daq`
                    : loadingMetaId === activeTooltipId
                      ? <span className="inline-block h-4 w-10 animate-pulse rounded bg-zinc-200" />
                      : <span className="text-zinc-400">—</span>}
                </p>
              </div>
            </div>

            {modalXato ? (
              <div className="mt-3 flex gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" aria-hidden>
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                <p>{modalXato}</p>
              </div>
            ) : null}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => { setActiveTooltipId(null); setModalXato(null); }}
                className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={() => void modalBoshlash()}
                disabled={startingId === activeTooltipId}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-900/15 transition hover:bg-emerald-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:pointer-events-none disabled:opacity-60"
              >
                {startingId === activeTooltipId ? (
                  <>
                    <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden>
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Boshlanmoqda…
                  </>
                ) : (
                  "Boshlash"
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
