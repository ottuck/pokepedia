import { describe, expect, it } from "vitest";
import { nicknameSchema } from "./nickname";

describe("nicknameSchema", () => {
  it.each(["레드", "Ash Ketchum", "サトシ", "a".repeat(20)])(
    "accepts %j",
    (nickname) => {
      expect(nicknameSchema.safeParse(nickname).success).toBe(true);
    },
  );

  it.each(["", "a", "a".repeat(21), "red\nblue", "zero​width"])(
    "rejects %j",
    (nickname) => {
      expect(nicknameSchema.safeParse(nickname).success).toBe(false);
    },
  );
});
