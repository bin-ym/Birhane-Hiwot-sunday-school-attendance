/**
 * Safe fetch wrapper that handles network errors, non-JSON responses,
 * and HTTP error status codes gracefully.
 *
 * Returns the parsed JSON on success, or `fallback` on any failure.
 */
export async function safeFetch<T = unknown>(
  url: string,
  fallback: T,
  options?: RequestInit,
): Promise<T> {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      console.warn(`[safeFetch] ${url} returned ${res.status}`);
      return fallback;
    }
    const text = await res.text();
    if (!text) return fallback;
    return JSON.parse(text) as T;
  } catch (err) {
    console.error(`[safeFetch] Failed to fetch ${url}:`, err);
    return fallback;
  }
}
