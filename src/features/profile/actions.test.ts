import { beforeEach, describe, expect, it, vi } from "vitest";
import { renameMe } from "./actions";

const refresh = vi.hoisted(() => vi.fn());
vi.mock("next/cache", () => ({ refresh }));

const db = vi.hoisted(() => ({
  userId: "user-1" as string | null,
  result: { data: { nickname: "레드" }, error: null } as {
    data: { nickname: string } | null;
    error: { message: string } | null;
  },
  update: vi.fn(),
  eq: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getClaims: async () => ({
        data: db.userId ? { claims: { sub: db.userId } } : null,
      }),
    },
    from: () => ({
      update: (values: unknown) => {
        db.update(values);
        return {
          eq: (column: string, value: string) => {
            db.eq(column, value);
            return {
              select: () => ({ maybeSingle: async () => db.result }),
            };
          },
        };
      },
    }),
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  db.userId = "user-1";
  db.result = { data: { nickname: "레드" }, error: null };
});

describe("renameMe", () => {
  it("renames the session's own profile with the trimmed nickname", async () => {
    await expect(renameMe("  레드  ")).resolves.toEqual({
      ok: true,
      nickname: "레드",
    });

    expect(db.update).toHaveBeenCalledWith({ nickname: "레드" });
    expect(db.eq).toHaveBeenCalledWith("id", "user-1");
    expect(refresh).toHaveBeenCalledOnce();
  });

  it.each([undefined, 42, "a", "a".repeat(21)])(
    "rejects %j before touching the database",
    async (input) => {
      await expect(renameMe(input)).resolves.toEqual({
        ok: false,
        code: "invalid_nickname",
      });
      expect(db.update).not.toHaveBeenCalled();
    },
  );

  it("needs a session", async () => {
    db.userId = null;

    await expect(renameMe("레드")).resolves.toEqual({
      ok: false,
      code: "not_signed_in",
    });
    expect(db.update).not.toHaveBeenCalled();
  });
});
