---
name: protected-page
description: Scaffold a new protected page/section in app/(asosiy)/ — includes route segment, AuthGuard via layout, data fetching with apiFetch, and all UI states (loading, empty, error). Use when adding a new page that requires authentication.
---

# Новая защищённая страница

## Структура маршрутов

Все защищённые страницы живут под `app/(asosiy)/`. Route group `(asosiy)` не влияет на URL.

```
app/
  (asosiy)/
    layout.tsx          ← AuthGuard + AppHeader — уже есть, не трогать
    testlar/            ← пример существующего раздела
      page.tsx
      [id]/
        page.tsx
    <new-section>/      ← новый раздел
      page.tsx
      loading.tsx       ← опционально
      error.tsx         ← опционально
```

## Существующий `(asosiy)/layout.tsx`

```tsx
// Уже реализован — не дублировать AuthGuard в дочерних компонентах:
import { AppHeader } from "@/components/AppHeader";
import { AuthGuard } from "@/components/AuthGuard";

export default function AsosiyLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <AppHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </AuthGuard>
  );
}
```

`AuthGuard` редиректит на `/` при отсутствии токена в `sessionStorage`. Страницы внутри `(asosiy)/` автоматически защищены.

## Шаблон страницы (клиентская — данные в useEffect)

Использовать когда нужна интерактивность или данные зависят от клиентского состояния:

```tsx
"use client";

import { useEffect, useState } from "react";
import { apiFetch, readApiError, unwrapList } from "@/lib/api/client";
import type { ApiXxx } from "@/lib/api/types";

export default function NewSectionPage() {
  const [items, setItems] = useState<ApiXxx[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/resource/", { method: "GET" })
      .then(async (res) => {
        if (!res.ok) throw new Error(await readApiError(res));
        return unwrapList<ApiXxx>(await res.json());
      })
      .then((data) => { if (!cancelled) setItems(data); })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : "Xatolik"); });
    return () => { cancelled = true; };
  }, []);

  if (error) return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
      {error}
    </div>
  );
  if (!items) return <PageSkeleton />;
  if (items.length === 0) return <EmptyState />;
  return <ItemList items={items} />;
}
```

## Шаблон страницы (серверная — данные на сервере)

Использовать когда страница не требует клиентского состояния и данные не зависят от токена браузера. Внимание: `apiFetch` использует `sessionStorage` — только для клиента. Серверная загрузка требует явной передачи токена через cookie или серверную сессию.

```tsx
// app/(asosiy)/report/page.tsx — только если auth реализована через httpOnly cookie
export default async function ReportPage() {
  // Серверный fetch с cookie-сессией:
  // const data = await fetchServerSide("/api/report/");
  // Пока JWT в sessionStorage — предпочитать клиентскую загрузку выше
}
```

## `loading.tsx` — скелетон сегмента

```tsx
export default function Loading() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-xl bg-zinc-100" />
      ))}
    </div>
  );
}
```

## `error.tsx` — граница ошибок

```tsx
"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <p className="text-sm text-zinc-600">{error.message}</p>
      <button
        onClick={reset}
        className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
      >
        Qayta urinish
      </button>
    </div>
  );
}
```

## Чеклист

- [ ] Страница в `app/(asosiy)/` — `AuthGuard` наследуется из layout, не добавлять повторно
- [ ] `"use client"` если нужны `useState`/`useEffect`/обработчики; иначе убрать
- [ ] Обработаны все состояния: загрузка, пустой список, ошибка, данные
- [ ] Вызовы API только через `apiFetch` + `readApiError` + `unwrapList`
- [ ] `cancelled`-флаг в `useEffect` для предотвращения обновления размонтированного компонента
- [ ] Типы пропсов явные (`type Props = ...`)

$ARGUMENTS
