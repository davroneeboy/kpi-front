---
name: api-module
description: Create or extend a lib/api/*.ts module following the project's established pattern — ApiXxx types in types.ts, apiFetch + readApiError + unwrapList, singleFlight for parallel GET dedup. Use when adding new API endpoints, resource fetchers, or mutation functions.
---

# Новый API-модуль (`lib/api/*.ts`)

## Структура файла

```
lib/api/
  types.ts          ← все ApiXxx типы — добавлять сюда
  client.ts         ← apiFetch, readApiError, unwrapList — не трогать
  request-single-flight.ts  ← singleFlight — не трогать
  config.ts         ← apiUrl() — не трогать
  <resource>.ts     ← новый модуль: только функции вызова API
```

## Типы → `types.ts`

Добавлять перед написанием функций. Именование: `Api` + PascalCase сущности.

```ts
// lib/api/types.ts — дописать:

/** GET /api/departments/ */
export type ApiDepartment = {
  id: number;
  name: string;
  created_at?: string | null;
};

/** POST /api/departments/ */
export type ApiDepartmentCreatePayload = {
  name: string;
};
```

Правила:
- `snake_case` поля — как в Django DRF ответе, без маппинга если нет UI-слоя
- Nullable поля — `field?: string | null`, не `field: string | undefined`
- Не дублировать поля уже существующих типов — расширять через `& { ... }` или наследовать

## Модуль → `lib/api/<resource>.ts`

```ts
import { apiFetch, readApiError, unwrapList } from "@/lib/api/client";
import { singleFlight } from "@/lib/api/request-single-flight";
import type { ApiDepartment, ApiDepartmentCreatePayload } from "@/lib/api/types";

/** GET /api/departments/ */
export function fetchDepartments(): Promise<ApiDepartment[]> {
  return singleFlight("GET /api/departments/", async () => {
    const res = await apiFetch("/api/departments/", { method: "GET" });
    if (!res.ok) throw new Error(await readApiError(res));
    return unwrapList<ApiDepartment>(await res.json());
  });
}

/** GET /api/departments/<id>/ */
export async function fetchDepartment(id: number): Promise<ApiDepartment> {
  const res = await apiFetch(`/api/departments/${id}/`, { method: "GET" });
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json() as Promise<ApiDepartment>;
}

/** POST /api/departments/ */
export async function createDepartment(
  payload: ApiDepartmentCreatePayload,
): Promise<ApiDepartment> {
  const res = await apiFetch("/api/departments/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json() as Promise<ApiDepartment>;
}

/** PATCH /api/departments/<id>/ */
export async function updateDepartment(
  id: number,
  payload: Partial<ApiDepartmentCreatePayload>,
): Promise<ApiDepartment> {
  const res = await apiFetch(`/api/departments/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json() as Promise<ApiDepartment>;
}

/** DELETE /api/departments/<id>/ */
export async function deleteDepartment(id: number): Promise<void> {
  const res = await apiFetch(`/api/departments/${id}/`, { method: "DELETE" });
  if (!res.ok) throw new Error(await readApiError(res));
}
```

## Правила

- `apiFetch` добавляет `Authorization: Bearer` и `Content-Type: application/json` автоматически — не дублировать, кроме случаев когда нужно явно переопределить
- `singleFlight` — только для GET, которые могут быть вызваны параллельно; для мутаций не нужен
- Ответ `204 No Content` — не вызывать `res.json()`, просто `return`
- Для необязательного JSON-ответа (как в `completeAttempt`): проверять `content-type` перед `res.json()`
- Телеметрия/fire-and-forget: глотать ошибки через `try/catch` как в `postAttemptSessionEvent`

## Чеклист

- [ ] Типы добавлены в `types.ts`, не в модуль
- [ ] Все пути начинаются с `/api/` (без домена — `apiUrl` в `apiFetch` добавит его)
- [ ] `if (!res.ok) throw new Error(await readApiError(res))` после каждого вызова
- [ ] GET-листы оборачиваются в `unwrapList` (DRF может вернуть `{ count, results }`)
- [ ] Параллельные GET используют `singleFlight`

$ARGUMENTS
