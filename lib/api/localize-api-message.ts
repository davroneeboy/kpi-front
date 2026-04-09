/**
 * Django/API qaytargan matnlarni UI uchun o‘zbekchaga moslash.
 * Noma’lum matn o‘zgarmay qoladi.
 */
const DETAIL_MAP: Record<string, string> = {
  "Этот тест можно пройти только один раз. Повторное прохождение недоступно.":
    "Bu testni faqat bir marta topshirish mumkin. Qayta topshirish mumkin emas.",
};

export function localizeApiMessage(msg: string): string {
  const t = msg.trim();
  if (DETAIL_MAP[t]) return DETAIL_MAP[t];
  const withDot = t.endsWith(".") ? t : `${t}.`;
  const withoutDot = t.endsWith(".") ? t.slice(0, -1).trim() : t;
  return DETAIL_MAP[withDot] ?? DETAIL_MAP[withoutDot] ?? msg;
}
