import { describe, expect, it } from "vitest";
import { nicknameSchema } from "./nickname";

describe("nicknameSchema", () => {
  it.each(["레드", "Ash Ketchum", "サトシ", "a".repeat(20)])(
    "accepts %j",
    (nickname) => {
      expect(nicknameSchema.safeParse(nickname).success).toBe(true);
    },
  );

  it("trims surrounding spaces before checking the length", () => {
    expect(nicknameSchema.parse("  레드  ")).toBe("레드");
    expect(nicknameSchema.safeParse("  a  ").success).toBe(false);
  });

  it.each(["", "a", "a".repeat(21), "red\nblue", "zero​width"])(
    "rejects %j",
    (nickname) => {
      expect(nicknameSchema.safeParse(nickname).success).toBe(false);
    },
  );
});
