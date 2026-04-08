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

      const detailAny = detail as ApiTest;
      const daqiqa = pickMinutesFromTest(detailAny) ?? inlineDaqiqa;

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
        e instanceof Error ? e.message : "Urinishni boshlab bo‘lmadi.",
      );
    } finally {
      setStartingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Mavjud testlar
        </h2>
        <p className="mt-1 text-sm text-zinc-600">
          Test kartasini bosing — markazda oynacha ochiladi. Faqat
          <b> Boshlash </b>tugmasidan keyin urinish boshlanadi.
        </p>
      </div>

      {xato ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {xato}
        </p>
      ) : null}

      {tests === null ? (
        <p className="text-zinc-500">Yuklanmoqda…</p>
      ) : tests.length === 0 && !xato ? (
        <p className="text-zinc-600">Hozircha ko&apos;rsatish uchun test yo&apos;q.</p>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white shadow-sm">
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
                  className="group flex w-full flex-col gap-1 px-4 py-4 text-left transition-colors hover:bg-emerald-50/60 focus-visible:bg-emerald-50/60 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-emerald-600 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-zinc-900 group-hover:text-emerald-950">
                      {t.title}
                    </p>
                    {t.description ? (
                      <p className="mt-0.5 text-sm text-zinc-500">
                        {t.description}
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs font-medium text-emerald-700 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 sm:hidden">
                      Ochish →
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-sm text-zinc-700">
                    <div>
                      <p>
                        <span className="text-zinc-500">Boshlanishi: </span>
                        {startIso ? (
                          <time dateTime={startIso} className="font-medium">
                            {formatDdMmYyyy(startIso)}
                          </time>
                        ) : (
                          <span className="font-medium text-zinc-400">—</span>
                        )}
                      </p>
                      <p>
                        <span className="text-zinc-500">Tugashi: </span>
                        {endIso ? (
                          <time dateTime={endIso} className="font-medium">
                            {formatDdMmYyyy(endIso)}
                          </time>
                        ) : (
                          <span className="font-medium text-zinc-400">—</span>
                        )}
                      </p>
                    </div>
                    <span
                      className="hidden rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-900 sm:inline-block"
                      aria-hidden
                    >
                      Ochish
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
          className="fixed inset-0 z-40 flex items-center justify-center bg-zinc-950/40 p-4"
          onClick={() => setActiveTooltipId(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-emerald-200 bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-lg font-semibold text-emerald-900">Boshlash?</p>
            <p className="mt-1 text-sm text-zinc-600">
              Savollar:{" "}
              {metaById[activeTooltipId]?.savollar != null
                ? metaById[activeTooltipId].savollar
                : loadingMetaId === activeTooltipId
                  ? "yuklanmoqda…"
                  : "noma'lum"}
            </p>
            <p className="text-sm text-zinc-600">
              Vaqt:{" "}
              {metaById[activeTooltipId]?.daqiqa != null
                ? `${metaById[activeTooltipId].daqiqa} daqiqa`
                : loadingMetaId === activeTooltipId
                  ? "yuklanmoqda…"
                  : "noma'lum"}
            </p>
            {modalXato ? (
              <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-800">
                {modalXato}
              </p>
            ) : null}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTooltipId(null);
                  setModalXato(null);
                }}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={() => void modalBoshlash()}
                disabled={startingId === activeTooltipId}
                className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
              >
                {startingId === activeTooltipId ? "Boshlanmoqda…" : "Boshlash"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
