"use client";

import { useEffect, useState } from "react";
import { fetchAttempts } from "@/lib/api/attempts";
import {
  attemptScorePercent,
  attemptRawScore,
  getAttemptTestTitle,
  mapAttemptStatus,
  type UiAttemptStatus,
} from "@/lib/api/mappers";
import type { ApiAttempt } from "@/lib/api/types";
import { formatDdMmYyyyHhMm } from "@/lib/format-date";

function statusLabel(s: UiAttemptStatus): string {
  switch (s) {
    case "jarayonda": return "Jarayonda";
    case "yakunlangan": return "Yakunlangan";
    case "bekor": return "Bekor qilingan";
    default: return "Noma'lum";
  }
}

function statusClass(s: UiAttemptStatus): string {
  switch (s) {
    case "jarayonda": return "bg-sky-50 text-sky-800 ring-1 ring-inset ring-sky-200";
    case "yakunlangan": return "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200";
    case "bekor": return "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200";
    default: return "bg-zinc-100 text-zinc-600 ring-1 ring-inset ring-zinc-200";
  }
}

function scoreColorClass(pct: number): string {
  if (pct >= 80) return "text-emerald-700";
  if (pct >= 60) return "text-amber-700";
  return "text-red-700";
}

function TableSkeleton() {
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-zinc-100 bg-zinc-50/80">
          <tr>
            {["Test", "Foydalanuvchi", "Sana", "Ball", "%", "Holat"].map((h) => (
              <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-zinc-400">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {Array.from({ length: 5 }).map((_, i) => (
            <tr key={i}>
              <td className="px-4 py-3.5">
                <div className="h-3.5 w-40 animate-pulse rounded bg-zinc-100" style={{ animationDelay: `${i * 60}ms` }} />
              </td>
              <td className="px-4 py-3.5">
                <div className="h-3.5 w-28 animate-pulse rounded bg-zinc-100" style={{ animationDelay: `${i * 60 + 20}ms` }} />
              </td>
              <td className="px-4 py-3.5">
                <div className="h-3.5 w-32 animate-pulse rounded bg-zinc-100" style={{ animationDelay: `${i * 60 + 40}ms` }} />
              </td>
              <td className="px-4 py-3.5">
                <div className="h-3.5 w-12 animate-pulse rounded bg-zinc-100" style={{ animationDelay: `${i * 60}ms` }} />
              </td>
              <td className="px-4 py-3.5">
                <div className="h-3.5 w-10 animate-pulse rounded bg-zinc-100" style={{ animationDelay: `${i * 60}ms` }} />
              </td>
              <td className="px-4 py-3.5">
                <div className="h-5 w-24 animate-pulse rounded-md bg-zinc-100" style={{ animationDelay: `${i * 60}ms` }} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function NatijalarPage() {
  const [rows, setRows] = useState<ApiAttempt[] | null>(null);
  const [xato, setXato] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchAttempts();
        if (!cancelled) setRows(list);
      } catch (e) {
        if (!cancelled) {
          setXato(
            e instanceof Error
              ? e.message
              : "Natijalar tarixini yuklab bo'lmadi.",
          );
          setRows([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Shaxsiy kabinet
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">
            Natijalar tarixi
          </h2>
        </div>
        {rows !== null && rows.length > 0 && (
          <span className="shrink-0 rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-semibold tabular-nums text-zinc-500">
            {rows.length} ta urinish
          </span>
        )}
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

      {rows === null ? (
        <TableSkeleton />
      ) : rows.length === 0 && !xato ? (
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
                d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
              />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-zinc-800">Hozircha urinishlar yo&apos;q</p>
            <p className="mt-1 text-sm text-zinc-500">
              Testlar sahifasiga o&apos;tib, birinchi testingizni boshlang.
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-100 bg-zinc-50/80">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-zinc-500">
                  Test
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-zinc-500">
                  Foydalanuvchi
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-zinc-500">
                  Yakunlangan / boshlangan
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-zinc-500">
                  Ball
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-zinc-500">
                  Ball (%)
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-zinc-500">
                  Holat
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((r) => {
                const ui = mapAttemptStatus(r.status);
                const pct = attemptScorePercent(r);
                const rawScore = attemptRawScore(r);
                const finishedIso = r.finished_at ?? r.completed_at ?? null;
                const startedIso = r.started_at ?? null;
                return (
                  <tr
                    key={r.id}
                    className="transition-colors duration-100 hover:bg-zinc-50/70"
                  >
                    <td className="px-4 py-3.5 font-medium text-zinc-900">
                      {getAttemptTestTitle(r)}
                    </td>
                    <td className="px-4 py-3.5 text-zinc-600">
                      {(typeof r.full_name === "string" && r.full_name.trim()) ||
                        r.username ||
                        "—"}
                    </td>
                    <td className="px-4 py-3.5 text-zinc-600">
                      {finishedIso || startedIso ? (
                        <div className="flex flex-col gap-0.5">
                          {finishedIso ? (
                            <span>
                              <span className="text-zinc-400">Yakunlangan: </span>
                              <time className="tabular-nums" dateTime={finishedIso}>
                                {formatDdMmYyyyHhMm(finishedIso)}
                              </time>
                            </span>
                          ) : null}
                          {startedIso ? (
                            <span className="text-xs text-zinc-400">
                              <span>Boshlangan: </span>
                              <time className="tabular-nums" dateTime={startedIso}>
                                {formatDdMmYyyyHhMm(startedIso)}
                              </time>
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 tabular-nums text-zinc-700">
                      {rawScore ?? <span className="text-zinc-400">—</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      {ui === "jarayonda" || pct == null ? (
                        <span className="text-zinc-400">—</span>
                      ) : (
                        <span className={`tabular-nums font-semibold ${scoreColorClass(pct)}`}>
                          {pct}%
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${statusClass(ui)}`}
                      >
                        {statusLabel(ui)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
