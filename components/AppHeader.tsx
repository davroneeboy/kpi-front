"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import {
  fetchMe,
  formatMeFio,
  pickDepartmentLabel,
} from "@/lib/api/me";
import type { ApiMe } from "@/lib/api/types";
import {
  clearClientAuth,
  getStoredUser,
  isClientAuthed,
  subscribeAuth,
} from "@/lib/auth-storage";

const nav = [
  { href: "/testlar", label: "Testlar" },
  { href: "/natijalar", label: "Natijalar" },
] as const;

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<ApiMe | null>(null);

  useEffect(() => {
    let cancelled = false;

    function loadProfile() {
      if (!isClientAuthed()) {
        setMe(null);
        return;
      }

      const stored = getStoredUser();
      if (stored) setMe({ ...stored } as ApiMe);

      void (async () => {
        try {
          const data = await fetchMe();
          if (!cancelled) setMe(data);
        } catch {
          if (!cancelled) {
            const u = getStoredUser();
            setMe(u ? ({ ...u } as ApiMe) : null);
          }
        }
      })();
    }

    loadProfile();
    const unsub = subscribeAuth(loadProfile);
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  function chiqish() {
    clearClientAuth();
    router.replace("/");
  }

  const departmentLabel = me ? pickDepartmentLabel(me) : null;

  return (
    <header className="border-b border-emerald-900/15 bg-emerald-950 text-emerald-50">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 sm:items-center">
          <Link
            href="/testlar"
            aria-label="Testlar sahifasiga o'tish"
            className="rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
          >
            <BrandLogo size="sm" className="mt-0.5 sm:mt-0" />
          </Link>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-300/90">
              Agrosanoatni rivojlantirish agentligi
            </p>
            <h1 className="text-lg font-semibold leading-tight text-white">
              KPI testlash tizimi
            </h1>
            {me ? (
              <div className="mt-1 space-y-0.5 text-sm">
                <p className="font-medium text-emerald-100">
                  {formatMeFio(me)}
                </p>
                {departmentLabel ? (
                  <p className="text-xs text-emerald-200/90">
                    {departmentLabel}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
        <nav className="flex flex-wrap items-center gap-2 sm:gap-3">
          {nav.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-emerald-700 text-white"
                    : "text-emerald-100 hover:bg-emerald-900/60"
                }`}
              >
                {label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={chiqish}
            className="rounded-lg border border-emerald-600/50 px-3 py-2 text-sm font-medium text-emerald-100 hover:bg-emerald-900/50"
          >
            Chiqish
          </button>
        </nav>
      </div>
    </header>
  );
}
