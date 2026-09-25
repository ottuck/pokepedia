import { describe, expect, it } from "vitest";
import { pointerTilt } from "./pointer-tilt";

const rect = { left: 100, top: 200, width: 200, height: 400 };

describe("pointerTilt", () => {
  it("reaches the maximum at the edges, the edge under the pointer dipping away", () => {
    const topLeft = pointerTilt(rect, 100, 200, 10);
    expect(topLeft).toMatchObject({ rx: 10, ry: -10, px: 0, py: 0 });
    expect(topLeft.distance).toBeCloseTo(1);

    const bottomRight = pointerTilt(rect, 300, 600, 10);
    expect(bottomRight).toMatchObject({ rx: -10, ry: 10, px: 1, py: 1 });
  });

  it("clamps pointers outside the element", () => {
    const outside = pointerTilt(rect, -500, 9999, 8);
    expect(outside).toMatchObject({ px: 0, py: 1, rx: -8, ry: -8 });
  });
});
