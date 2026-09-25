import { beforeEach, describe, expect, it, vi } from "vitest";
import { setAvatar } from "./actions";

const refresh = vi.hoisted(() => vi.fn());
vi.mock("next/cache", () => ({ refresh }));

const me = "4b0c8a4e-9d0e-4b9f-8c2b-1a2b3c4d5e6f";

const db = vi.hoisted(() => ({
  claims: null as { sub: string; is_anonymous?: boolean } | null,
  previous: null as string | null,
  updateError: null as { message: string } | null,
  update: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getClaims: async () => ({
        data: db.claims ? { claims: db.claims } : null,
      }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { avatar_path: db.previous },
            error: null,
          }),
        }),
      }),
      update: (values: unknown) => ({
        eq: async (column: string, value: string) => {
          db.update(values, column, value);
          return { error: db.updateError };
        },
      }),
    }),
    storage: {
      from: (bucket: string) => ({
        remove: async (paths: string[]) => {
          db.remove(bucket, paths);
          return { error: null };
        },
      }),
    },
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  db.claims = { sub: me, is_anonymous: false };
  db.previous = null;
  db.updateError = null;
});

describe("setAvatar", () => {
  it("points the profile at a picture in the user's own folder", async () => {
    await expect(setAvatar(`${me}/1790300000000.webp`)).resolves.toEqual({
      ok: true,
    });

    expect(db.update).toHaveBeenCalledWith(
      { avatar_path: `${me}/1790300000000.webp` },
      "id",
      me,
    );
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("removes the previous picture after switching", async () => {
    db.previous = `${me}/1700000000000.webp`;

    await setAvatar(`${me}/1790300000000.webp`);

    expect(db.remove).toHaveBeenCalledWith("avatars", [
      `${me}/1700000000000.webp`,
    ]);
  });

  it("clears the picture with null and removes the file", async () => {
    db.previous = `${me}/1700000000000.webp`;

    await expect(setAvatar(null)).resolves.toEqual({ ok: true });

    expect(db.update).toHaveBeenCalledWith({ avatar_path: null }, "id", me);
    expect(db.remove).toHaveBeenCalled();
  });

  it("refuses guests", async () => {
    db.claims = { sub: me, is_anonymous: true };

    await expect(setAvatar(`${me}/1790300000000.webp`)).resolves.toEqual({
      ok: false,
      code: "google_only",
    });
    expect(db.update).not.toHaveBeenCalled();
  });

  it.each([
    "other-user/1790300000000.webp",
    `${me}/../x/1.webp`,
    42,
    undefined,
  ])("refuses the path %j", async (path) => {
    await expect(setAvatar(path)).resolves.toEqual({
      ok: false,
      code: "invalid_path",
    });
    expect(db.update).not.toHaveBeenCalled();
  });

  it("keeps the old file when saving fails", async () => {
    db.previous = `${me}/1700000000000.webp`;
    db.updateError = { message: "boom" };

    await expect(setAvatar(`${me}/1790300000000.webp`)).resolves.toEqual({
      ok: false,
      code: "server_error",
    });
    expect(db.remove).not.toHaveBeenCalled();
  });
});
