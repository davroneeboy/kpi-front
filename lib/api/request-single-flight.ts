/**
 * Bir vaqtning o'zida bir xil kalit uchun bitta HTTP so'rovi (parallel chaqiriqlarni birlashtirish).
 */
const inFlight = new Map<string, Promise<unknown>>();

export function singleFlight<T>(key: string, exec: () => Promise<T>): Promise<T> {
  const existing = inFlight.get(key);
  if (existing) return existing as Promise<T>;
  const promise = exec().finally(() => {
    inFlight.delete(key);
  });
  inFlight.set(key, promise);
  return promise;
}
