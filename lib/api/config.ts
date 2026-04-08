/** Masofaviy API manbasi, oxirgi `/` siz. Masalan: http://127.0.0.1:8000 */
export function getApiOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim() ?? "";
  return raw.replace(/\/+$/, "");
}

export function apiUrl(apiPath: string): string {
  const origin = getApiOrigin();
  if (!origin) {
    throw new Error(
      "Адрес бэкэнда не настроен. Укажите NEXT_PUBLIC_API_URL в файле .env.local в корне проекта (например: http://127.0.0.1:8000).",
    );
  }
  const path = apiPath.startsWith("/") ? apiPath : `/${apiPath}`;
  return `${origin}${path}`;
}
