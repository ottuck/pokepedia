import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashMergeToken, newMergeToken, redeemGuestMerge } from "./guest-merge";

const calls: string[] = [];
const admin = {
  rpc: vi.fn(async (name: string) => {
    calls.push(name);
    return rpcResult;
  }),
  auth: {
    admin: {
      deleteUser: vi.fn(async () => {
        calls.push("deleteUser");
        return deleteResult;
      }),
    },
  },
};
let rpcResult: { data: string | null; error: { message: string } | null };
let deleteResult: { error: { message: string } | null };

beforeEach(() => {
  calls.length = 0;
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  rpcResult = { data: "guest-1", error: null };
  deleteResult = { error: null };
});

const redeem = () => redeemGuestMerge(admin as never, "raw-token", "google-1");

describe("merge tokens", () => {
  it("are random, and only their sha256 is stored", () => {
    const a = newMergeToken();
    const b = newMergeToken();

    expect(a.token).not.toBe(b.token);
    expect(a.token.length).toBeGreaterThanOrEqual(43); // 32 random bytes
    expect(a.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(a.hash).toBe(hashMergeToken(a.token));
    expect(a.hash).not.toContain(a.token);
  });
});

describe("redeemGuestMerge", () => {
  it("moves the record first and deletes the guest only afterwards", async () => {
    await expect(redeem()).resolves.toEqual({
      ok: true,
      mergedUserId: "guest-1",
    });

    expect(admin.rpc).toHaveBeenCalledWith("guest_merge_redeem", {
      p_token_hash: hashMergeToken("raw-token"),
      p_to_user: "google-1",
    });
    expect(admin.auth.admin.deleteUser).toHaveBeenCalledWith("guest-1");
    expect(calls).toEqual(["guest_merge_redeem", "deleteUser"]);
  });

  it("keeps the guest when the merge fails", async () => {
    rpcResult = { data: null, error: { message: "merge_ticket_invalid" } };

    await expect(redeem()).resolves.toEqual({
      ok: false,
      code: "merge_failed",
    });
    expect(admin.auth.admin.deleteUser).not.toHaveBeenCalled();
  });
});
