const TRANSIENT_STATUS = new Set([502, 503, 504]);

/**
 * `fetch` that retries reads on gateway errors and dropped connections. The build prerenders
 * hundreds of pages, each reading the catalog; one transient 502 from Supabase would otherwise
 * fail the whole deployment. Writes are never retried: they might have been applied.
 */
export function createRetryingFetch(
  baseFetch: typeof fetch = fetch,
  { retries = 3, delayMs = 300 } = {},
): typeof fetch {
  return async (input, init) => {
    const method = (
      init?.method ?? (input instanceof Request ? input.method : "GET")
    ).toUpperCase();
    if (method !== "GET" && method !== "HEAD") return baseFetch(input, init);

    for (let attempt = 0; ; attempt++) {
      const last = attempt === retries;
      try {
        const response = await baseFetch(input, init);
        if (last || !TRANSIENT_STATUS.has(response.status)) return response;
      } catch (error) {
        // An aborted request was cancelled on purpose; anything else is a network failure.
        if (last || init?.signal?.aborted) throw error;
      }
      await new Promise((resolve) =>
        setTimeout(resolve, delayMs * 2 ** attempt),
      );
    }
  };
}
