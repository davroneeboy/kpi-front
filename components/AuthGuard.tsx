"use client";

import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { isClientAuthed, subscribeAuth } from "@/lib/auth-storage";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const authed = useSyncExternalStore(
    subscribeAuth,
    () => isClientAuthed(),
    () => false,
  );

  useEffect(() => {
    if (!authed) {
      router.replace("/");
    }
  }, [authed, router]);

  if (!authed) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-zinc-500">
        Yuklanmoqda…
      </div>
    );
  }

  return <>{children}</>;
}
