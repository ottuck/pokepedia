import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const state = vi.hoisted(() => ({
  claims: null as { sub: string; is_anonymous?: boolean } | null,
  exchangeError: null as { code: string } | null,
  redeem: vi.fn(),
  deleteCookie: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      exchangeCodeForSession: async () => ({ error: state.exchangeError }),
      getClaims: async () => ({
        data: state.claims ? { claims: state.claims } : null,
      }),
    },
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/features/auth/guest-merge", async (original) => ({
  ...(await original<typeof import("@/features/auth/guest-merge")>()),
  redeemGuestMerge: state.redeem,
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ delete: state.deleteCookie }),
}));

function callback(query: string, mergeToken?: string) {
  const request = new NextRequest(
    `https://pokepedia.test/auth/callback?${query}`,
    mergeToken ? { headers: { cookie: `guest_merge=${mergeToken}` } } : {},
  );
  return GET(request);
}

const location = (response: Response) =>
  new URL(response.headers.get("location")!).pathname +
  new URL(response.headers.get("location")!).search;

beforeEach(() => {
  vi.clearAllMocks();
  state.claims = { sub: "google-1", is_anonymous: false };
  state.exchangeError = null;
  state.redeem.mockResolvedValue({ ok: true, mergedUserId: "guest-1" });
});

describe("auth callback", () => {
  it("merges into the account that just signed in and lands with ?merged=1", async () => {
    const response = await callback(
      "code=abc&next=/ko/collection",
      "raw-token",
    );

    expect(state.redeem).toHaveBeenCalledWith({}, "raw-token", "google-1");
    expect(location(response)).toBe("/ko/collection?merged=1");
    expect(state.deleteCookie).toHaveBeenCalledWith({
      name: "guest_merge",
      path: "/auth/callback",
    });
  });

  it("never merges into another guest", async () => {
    state.claims = { sub: "guest-2", is_anonymous: true };

    const response = await callback(
      "code=abc&next=/ja/collection",
      "raw-token",
    );

    expect(state.redeem).not.toHaveBeenCalled();
    expect(location(response)).toBe("/ja/auth/error?code=merge_failed");
  });

  it("drops the ticket when Google sign-in did not complete", async () => {
    const response = await callback(
      "error=access_denied&next=/en/collection",
      "raw-token",
    );

    expect(state.deleteCookie).toHaveBeenCalled();
    expect(state.redeem).not.toHaveBeenCalled();
    expect(location(response)).toBe("/en/auth/error?code=access_denied");
  });
});
