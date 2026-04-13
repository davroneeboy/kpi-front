<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Граница с Django (другой репозиторий)

- **Код Django в этом репозитории не пишем** — модели, миграции и бизнес-логика живут у бэкенд-разработчика.
- **Контракт**: эндпоинты, JSON-схемы, коды ошибок и авторизация согласуются явно (дока, OpenAPI/Swagger, примеры запросов). При расхождении — правка контракта на стороне Django или адаптер на фронте, а не «угадывание» полей.
- **Базовый URL API** — из переменных окружения (`NEXT_PUBLIC_API_URL` / серверный `API_URL` для секретов); не хардкодить прод-домены в коде.
- **Вызовы**: предпочитать серверный Next.js (`fetch` в RSC, Route Handler или Server Action как прокси), если нужны скрытые ключи или единый CORS; иначе — по согласованной схеме auth (cookie vs Bearer).
- **snake_case в JSON** типичен для Django — на фронте либо типы «как в API», либо один слой маппинга в camelCase для UI, но последовательно.

---

# Доменная модель — пользователи, прохождение тестов, история попыток

- **Источник правды**: хранение пользователей, попыток и ответов — на **Django** (другой репозиторий); здесь только типы, клиент API и UI.
- **Сущности**: пользователь (`userId`); тест/опрос (`testId`, метаданные); **попытка** (`attemptId` или составной ключ) — одно прохождение с временем старта/окончания, статусом (in_progress / completed / aborted).
- **История**: хранить события в хронологическом порядке; стабильные идентификаторы и UTC-время (`ISO 8601`) в данных, локаль — только в UI.
- **Идемпотентность**: повторная отправка ответа не должна портить историю — различать создание попытки, сохранение шага и финализацию.
- **Приватность**: история и ответы привязаны к пользователю; на клиент не отдавать лишние поля; проверять доступ на сервере (session/token), не только в UI.
- **UI**: списки истории — пагинация или виртуализация при росте данных; пустые и загрузочные состояния явно.

---

# apiFetch — единственный HTTP-клиент для API

- **Никогда не использовать голый `fetch()`** для обращений к Django API — только `apiFetch` из `@/lib/api/client`.
- **Ошибки**: всегда `if (!res.ok) throw new Error(await readApiError(res))` — `readApiError` парсит DRF-формат (`detail`, `non_field_errors`, поля), локализует сообщения.
- **Списки**: оборачивать в `unwrapList<T>(data)` — обрабатывает как plain array, так и DRF-пагинацию `{ count, results }`.
- **Дедупликация**: для параллельных GET одного ресурса использовать `singleFlight` из `@/lib/api/request-single-flight`.
- **Авто-рефреш**: встроен в `apiFetch` — при 401 автоматически рефрешит токен и повторяет запрос; не реализовывать эту логику снаружи.

```ts
// Правильно
const res = await apiFetch("/api/resource/", { method: "GET" });
if (!res.ok) throw new Error(await readApiError(res));
const items = unwrapList<ApiItem>(await res.json());

// Неправильно
const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/resource/`);
```

---

# Auth storage pattern

- **Хранилище**: JWT-токены только в `sessionStorage` через функции из `@/lib/auth-storage` (`getAccessToken`, `setTokens`, `clearClientAuth` и т.д.) — не `localStorage`, не `cookies` на клиенте, не контекст/стор.
- **Реактивность**: подписка на изменения авторизации — `subscribeAuth` (кастомные события `asba-auth-change`) + `useSyncExternalStore`. Не городить отдельный Context/Zustand для флага авторизации.
- **Защищённые маршруты**: оборачивать клиентское дерево в `<AuthGuard>` — он редиректит на `/` при выходе; не дублировать проверку в каждом компоненте.
- **Токен в запросах**: `apiFetch` добавляет `Authorization: Bearer` автоматически при `auth: true` (дефолт). Не пробрасывать токен вручную.
- **Выход**: только `clearClientAuth()` — очищает `sessionStorage` и испускает событие, все подписчики реагируют автоматически.

---

# Tailwind v4

- **Нет `tailwind.config.js`** — конфигурация CSS-first через `@theme` в `globals.css`.
- **Кастомные токены**: добавлять в блок `@theme inline { ... }` в `globals.css`, не в JS-конфиг.
- **Произвольные значения**: синтаксис тот же — `text-[15px]`, `gap-[3px]`, но предпочитать токены из `@theme`.
- **Плагины**: через `@plugin` в CSS, не через `plugins: []` в конфиге.
- **Не предлагать** `tailwind.config.js`, `theme.extend`, `safelist` или `purge` — это v3-паттерны.

---

# Next.js + React + TypeScript (применяется к *.ts, *.tsx)

- **App Router**: страницы в `app/`, серверные компоненты по умолчанию; `"use client"` только при состоянии, эффектах, браузерных API или обработчиках событий.
- **Типы**: явные пропсы компонентов (`type Props` / `interface`); избегать `any`; для данных с API — отдельные типы/DTO и сужение на границе (parse/validate).
- **Данные**: все персистентные операции через HTTP API Django. Предпочитать `fetch` на сервере Next, кэширование через `cache`/`revalidate`/`fetch` options по задаче.
- **Импорты**: алиасы из `tsconfig` если настроены; группировать внешние → внутренние → относительные.
- **Стили**: один подход на проект — не смешивать без необходимости.

---

# React UI — формы, списки, состояние загрузки и ошибок (применяется к *.tsx)

- Дробить на маленькие компоненты; тяжёлую логику выносить в хуки (`useUserTestHistory` и т.п.).
- **Состояние**: локальное — `useState`/`useReducer`; разделяемое по дереву — контекст с узким значением; серверное — React Query / SWR / Server Components по выбранному стеку.
- **Формы**: контролируемые поля или библиотека форм одна на проект; валидация — схема (например Zod) на границе submit.
- **Ошибки**: границы ошибок (`error.tsx` в App Router) + понятные сообщения пользователю; технические детали только в логах.

```tsx
// Скелетон и ошибка рядом с данными
if (error) return <ErrorBanner message={error.message} />;
if (!data) return <HistorySkeleton />;
return <HistoryList items={data} />;
```
