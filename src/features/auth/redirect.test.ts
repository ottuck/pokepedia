import { describe, expect, it } from "vitest";
import { safeNextPath } from "./redirect";

describe("safeNextPath", () => {
  it.each(["/", "/ko", "/ja/pokemon/25", "/ko?type=fire&sort=name"])(
    "keeps %s",
    (path) => {
      expect(safeNextPath(path)).toBe(path);
    },
  );

  it.each([
    null,
    "",
    "ko",
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/\t/evil.example",
  ])("falls back to / for %j", (next) => {
    expect(safeNextPath(next)).toBe("/");
  });

  it("never produces a URL that leaves the origin", () => {
    const origin = "https://pokepedia.example";
    for (const attempt of [
      "//evil.example/x",
      "/\\evil.example",
      "https://evil.example",
    ]) {
      expect(new URL(safeNextPath(attempt), origin).origin).toBe(origin);
    }
  });
});
