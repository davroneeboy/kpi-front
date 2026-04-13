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

function UserAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-700/60 text-xs font-bold text-white ring-1 ring-white/20">
      {initials || "?"}
    </span>
  );
}

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

  const fio = me ? formatMeFio(me) : null;
  const departmentLabel = me ? pickDepartmentLabel(me) : null;

  return (
    <header className="border-b border-white/5 bg-emerald-950">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex h-14 items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/testlar"
              aria-label="Testlar sahifasiga o'tish"
              className="shrink-0 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
            >
              <BrandLogo size="sm" />
            </Link>
            <div className="min-w-0">
              <p className="hidden text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-400/80 sm:block">
                Agrosanoatni rivojlantirish agentligi
              </p>
              <p className="text-sm font-semibold leading-tight text-white">
                KPI testlash tizimi
              </p>
            </div>
          </div>

          {/* Nav + user */}
          <div className="flex items-center gap-1 sm:gap-2">
            <nav className="flex items-center gap-0.5">
              {nav.map(({ href, label }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-150 ${
                      active
                        ? "bg-white/10 text-white"
                        : "text-emerald-200/80 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>

            <div className="mx-1 h-5 w-px bg-white/10" aria-hidden />

            {fio ? (
              <div className="flex items-center gap-2">
                <UserAvatar name={fio} />
                <div className="hidden min-w-0 lg:block">
                  <p className="max-w-[160px] truncate text-xs font-medium text-white">
                    {fio}
                  </p>
                  {departmentLabel ? (
                    <p className="max-w-[160px] truncate text-[10px] text-emerald-300/70">
                      {departmentLabel}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            <button
              type="button"
              onClick={chiqish}
              className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-emerald-200/70 transition-colors duration-150 hover:bg-white/5 hover:text-white"
            >
              Chiqish
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
