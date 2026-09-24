import { describe, expect, it } from "vitest";
import { clearRate } from "./stats";

describe("clearRate", () => {
  it("is the share of answered rounds that were cleared", () => {
    expect(clearRate(3, 1)).toBe(0.75);
    expect(clearRate(2, 0)).toBe(1);
    expect(clearRate(0, 4)).toBe(0);
  });

  it("is null before any round was answered", () => {
    expect(clearRate(0, 0)).toBeNull();
  });
});
