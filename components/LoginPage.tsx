"use client";

import { useRouter } from "next/navigation";
import {
  FormEvent,
  useCallback,
  useEffect,
  useId,
  useState,
} from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { getApiOrigin } from "@/lib/api/config";
import { loginRequest } from "@/lib/api/public";
import { isClientAuthed, setSessionFromLogin } from "@/lib/auth-storage";

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className ?? ""}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export function LoginPage() {
  const router = useRouter();
  const formId = useId();
  const errId = `${formId}-xato`;

  const [login, setLogin] = useState("");
  const [parol, setParol] = useState("");
  const [parolOchiq, setParolOchiq] = useState(false);
  const [xato, setXato] = useState<string | null>(null);
  const [yuklanmoqda, setYuklanmoqda] = useState(false);

  const redirectAgarKirilgan = useCallback(() => {
    if (isClientAuthed()) router.replace("/testlar");
  }, [router]);

  useEffect(() => {
    redirectAgarKirilgan();
  }, [redirectAgarKirilgan]);

  async function yuborish(e: FormEvent) {
    e.preventDefault();
    setXato(null);

    if (!login.trim() || !parol.trim()) {
      setXato("Foydalanuvchi nomi va parolni to‘ldiring.");
      return;
    }

    if (!getApiOrigin()) {
      setXato(
        "Адрес бэкэнда не настроен. Укажите NEXT_PUBLIC_API_URL в файле .env.local в корне проекта (например: http://127.0.0.1:8000).",
      );
      return;
    }

    setYuklanmoqda(true);
    try {
      const data = await loginRequest(login.trim(), parol);
      setSessionFromLogin(data.access, data.refresh, data.user);
      router.replace("/testlar");
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Kirish amalga oshmadi. Login yoki parol noto‘g‘ri bo‘lishi mumkin.";
      setXato(msg);
    } finally {
      setYuklanmoqda(false);
    }
  }

  const inputBase =
    "w-full rounded-xl border bg-white px-3.5 py-2.5 text-[15px] text-zinc-900 shadow-sm transition outline-none placeholder:text-zinc-400 " +
    "focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/25 " +
    "disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:opacity-70";

  return (
    <div className="relative flex min-h-svh flex-col bg-zinc-100">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(16,185,129,0.22),transparent)]"
        aria-hidden
      />
      <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-10 sm:py-14">
        <div className="w-full max-w-[440px]">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex justify-center">
              <BrandLogo size="md" />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-800/90">
              Agrosanoatni rivojlantirish agentligi
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 sm:text-[1.65rem]">
              KPI testlash tizimi
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">
              Davom etish uchun tizimga kiring
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-xl shadow-zinc-200/50 sm:p-8">
            <form
              onSubmit={yuborish}
              className="space-y-5"
              noValidate
              aria-describedby={xato ? errId : undefined}
            >
              <div className="space-y-1.5">
                <label
                  htmlFor={`${formId}-login`}
                  className="block text-sm font-medium text-zinc-800"
                >
                  Foydalanuvchi nomi
                </label>
                <input
                  id={`${formId}-login`}
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  disabled={yuklanmoqda}
                  placeholder="login"
                  className={`${inputBase} border-zinc-200`}
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor={`${formId}-parol`}
                  className="block text-sm font-medium text-zinc-800"
                >
                  Parol
                </label>
                <div className="relative">
                  <input
                    id={`${formId}-parol`}
                    name="password"
                    type={parolOchiq ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={parol}
                    onChange={(e) => setParol(e.target.value)}
                    disabled={yuklanmoqda}
                    placeholder="••••••••"
                    className={`${inputBase} border-zinc-200 pr-12`}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setParolOchiq((v) => !v)}
                    disabled={yuklanmoqda}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 disabled:opacity-50"
                    aria-label={
                      parolOchiq ? "Parolni yashirish" : "Parolni ko‘rsatish"
                    }
                  >
                    {parolOchiq ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="h-5 w-5"
                        aria-hidden
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                        />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="h-5 w-5"
                        aria-hidden
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {xato ? (
                <div
                  id={errId}
                  role="alert"
                  className="flex gap-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-900"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="mt-0.5 h-5 w-5 shrink-0 text-red-600"
                    aria-hidden
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="min-w-0 leading-relaxed">{xato}</p>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={yuklanmoqda}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-900/15 transition hover:bg-emerald-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:pointer-events-none disabled:opacity-60"
              >
                {yuklanmoqda ? (
                  <>
                    <Spinner className="h-4 w-4 text-white" />
                    Kirilmoqda…
                  </>
                ) : (
                  "Tizimga kirish"
                )}
              </button>
            </form>

            {process.env.NODE_ENV === "development" ? (
              <p className="mt-6 border-t border-zinc-100 pt-4 text-center text-[11px] leading-relaxed text-zinc-400">
                Dev:{" "}
                <code className="rounded bg-zinc-100 px-1 py-0.5 text-zinc-600">
                  POST /api/auth/login/
                </code>
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
