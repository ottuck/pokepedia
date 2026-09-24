import { describe, expect, it, vi } from "vitest";
import { createRetryingFetch } from "./retrying-fetch";

const response = (status: number) => new Response(null, { status });

describe("createRetryingFetch", () => {
  it("retries a read through transient gateway errors", async () => {
    const base = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response(502))
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(response(200));

    const result = await createRetryingFetch(base, { delayMs: 0 })("https://x");

    expect(result.status).toBe(200);
    expect(base).toHaveBeenCalledTimes(3);
  });

  it("gives up after the last retry with the final response", async () => {
    const base = vi.fn<typeof fetch>().mockResolvedValue(response(503));

    const result = await createRetryingFetch(base, { retries: 2, delayMs: 0 })(
      "https://x",
    );

    expect(result.status).toBe(503);
    expect(base).toHaveBeenCalledTimes(3);
  });

  it("does not retry client errors or writes", async () => {
    const base = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response(404))
      .mockResolvedValueOnce(response(502));
    const retrying = createRetryingFetch(base, { delayMs: 0 });

    expect((await retrying("https://x")).status).toBe(404);
    expect((await retrying("https://x", { method: "POST" })).status).toBe(502);
    expect(base).toHaveBeenCalledTimes(2);
  });

  it("does not retry a request that was aborted on purpose", async () => {
    const controller = new AbortController();
    controller.abort();
    const base = vi.fn<typeof fetch>().mockRejectedValue(new Error("aborted"));

    await expect(
      createRetryingFetch(base, { delayMs: 0 })("https://x", {
        signal: controller.signal,
      }),
    ).rejects.toThrow("aborted");
    expect(base).toHaveBeenCalledOnce();
  });
});
