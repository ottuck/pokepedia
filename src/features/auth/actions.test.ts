import { beforeEach, describe, expect, it, vi } from "vitest";
import { prepareGuestMerge } from "./actions";
import { hashMergeToken, MERGE_COOKIE } from "./guest-merge";

const state = vi.hoisted(() => ({
  claims: null as { sub: string; is_anonymous?: boolean } | null,
  rpcError: null as { message: string } | null,
  rpc: vi.fn(),
  setCookie: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getClaims: async () => ({
        data: state.claims ? { claims: state.claims } : null,
      }),
    },
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    rpc: async (...args: unknown[]) => {
      state.rpc(...args);
      return { error: state.rpcError };
    },
  }),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ set: state.setCookie }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  state.claims = null;
  state.rpcError = null;
});

describe("prepareGuestMerge", () => {
  it("issues a ticket for the session's guest and keeps the raw token in an httpOnly cookie", async () => {
    state.claims = { sub: "guest-1", is_anonymous: true };

    await expect(prepareGuestMerge()).resolves.toEqual({ ok: true });

    const [name, token, options] = state.setCookie.mock.calls[0];
    expect(name).toBe(MERGE_COOKIE);
    expect(options).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/auth/callback",
      maxAge: 600,
    });
    expect(state.rpc).toHaveBeenCalledWith("guest_merge_create_ticket", {
      p_from_user: "guest-1",
      p_token_hash: hashMergeToken(token),
      p_ttl_seconds: 600,
    });
  });

  it.each([
    ["no session", null],
    ["a Google account", { sub: "google-1", is_anonymous: false }],
  ])("refuses %s", async (_, claims) => {
    state.claims = claims;

    await expect(prepareGuestMerge()).resolves.toEqual({
      ok: false,
      code: "not_guest",
    });
    expect(state.rpc).not.toHaveBeenCalled();
    expect(state.setCookie).not.toHaveBeenCalled();
  });

  it("sets no cookie when the ticket could not be stored", async () => {
    state.claims = { sub: "guest-1", is_anonymous: true };
    state.rpcError = { message: "boom" };

    await expect(prepareGuestMerge()).resolves.toEqual({
      ok: false,
      code: "server_error",
    });
    expect(state.setCookie).not.toHaveBeenCalled();
  });
});
