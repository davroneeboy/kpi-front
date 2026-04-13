---
name: next-react-app-router
description: Implement features using Next.js App Router with React and TypeScript — routes, server and client components, data fetching, error handling. Use when building pages in app/, layouts, loading/error boundaries, BFF proxies, Server Actions, or integrating with Django API.
---

# Next.js App Router + React + TypeScript

Реализует фичи на Next.js App Router с React и TypeScript — маршруты, серверные и клиентские компоненты, загрузка данных и обработка ошибок. Данные с персистентностью приходят с отдельного Django API.

## Маршрутизация

- Файлы в `app/` задают URL; `layout.tsx` — общая оболочка; `page.tsx` — страница сегмента.
- Динамика: `app/users/[id]/page.tsx`; параллельные и перехватывающие маршруты — только если задача это требует.

## Сервер vs клиент

- По умолчанию компоненты серверные: прямой `fetch`, доступ к секретам через env на сервере.
- Добавлять `"use client"` в первой строке файла, если нужны хуки состояния, браузерные API, подписки, интерактив без Server Actions.

## Данные

- Предпочитать загрузку в серверном компоненте и передачу сериализуемых пропсов вниз.
- **Бэкенд приложения — Django в отдельном репозитории**: мутации и чтение персистентных данных идут в его API (прямо или через Next Route Handler / Server Action как BFF при необходимости).
- Для мутаций — вызов Django API с валидацией входа на фронте (например Zod) и проверкой прав на стороне сервера Django; Next-слой не подменяет авторизацию, если ключи/сессия должны быть только на бэкенде.

## Ошибки и загрузка

- `error.tsx` в сегменте — граница ошибок для дочернего дерева.
- `loading.tsx` — UI ожидания для сегмента.
- Не полагаться только на try/catch вокруг всего дерева без `error.tsx` там, где нужен UX сбоя.

## TypeScript

- Типизировать `params` и `searchParams` в page (с учётом версии Next — sync vs Promise в типах).
- Общие типы сущностей вынести в `types/` или рядом с модулем API.

## Чеклист новой страницы

- [ ] Нужен ли `"use client"` — минимальный объём клиента
- [ ] Метаданные (`generateMetadata` или статический `metadata`) если важны SEO/шаринг
- [ ] Ошибки и пустые данные обработаны в UI

$ARGUMENTS
