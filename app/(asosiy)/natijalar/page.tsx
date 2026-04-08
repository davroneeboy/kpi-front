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
    case "jarayonda":
      return "Jarayonda";
    case "yakunlangan":
      return "Yakunlangan";
    case "bekor":
      return "Bekor qilingan";
    default:
      return "Noma'lum";
  }
}

function statusClass(s: UiAttemptStatus): string {
  switch (s) {
    case "jarayonda":
      return "bg-sky-100 text-sky-900";
    case "yakunlangan":
      return "bg-emerald-100 text-emerald-900";
    case "bekor":
      return "bg-amber-100 text-amber-900";
    default:
      return "bg-zinc-100 text-zinc-800";
  }
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
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Natijalar tarixi
        </h2>
      </div>

      {xato ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {xato}
        </p>
      ) : null}

      {rows === null ? (
        <p className="text-zinc-500">Yuklanmoqda…</p>
      ) : rows.length === 0 && !xato ? (
        <p className="text-zinc-600">Hozircha urinishlar yo&apos;q.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
              <tr>
                <th className="px-4 py-3 font-medium">Test</th>
                <th className="px-4 py-3 font-medium">Foydalanuvchi</th>
                <th className="px-4 py-3 font-medium">Yakunlangan / boshlangan</th>
                <th className="px-4 py-3 font-medium">Ball</th>
                <th className="px-4 py-3 font-medium">Ball (%)</th>
                <th className="px-4 py-3 font-medium">Holat</th>
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
                  <tr key={r.id} className="text-zinc-800">
                    <td className="px-4 py-3 font-medium text-zinc-900">
                      {getAttemptTestTitle(r)}
                    </td>
                    <td className="px-4 py-3">
                      {(typeof r.full_name === "string" && r.full_name.trim()) ||
                        r.username ||
                        "—"}
                    </td>
                    <td className="px-4 py-3">
                      {finishedIso || startedIso ? (
                        <div className="flex flex-col gap-0.5">
                          {finishedIso ? (
                            <span>
                              Yakunlangan:{" "}
                              <time
                                className="tabular-nums"
                                dateTime={finishedIso}
                              >
                                {formatDdMmYyyyHhMm(finishedIso)}
                              </time>
                            </span>
                          ) : null}
                          {startedIso ? (
                            <span>
                              Boshlangan:{" "}
                              <time
                                className="tabular-nums"
                                dateTime={startedIso}
                              >
                                {formatDdMmYyyyHhMm(startedIso)}
                              </time>
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{rawScore ?? "—"}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {ui === "jarayonda" || pct == null ? "—" : `${pct}%`}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass(ui)}`}
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
