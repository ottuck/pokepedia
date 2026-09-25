import { describe, expect, it } from "vitest";
import { applyTilt, pointerTilt, REST } from "./pointer-tilt";

const rect = { left: 100, top: 200, width: 200, height: 400 };

describe("pointerTilt", () => {
  it("is flat with the pointer at the center", () => {
    expect(pointerTilt(rect, 200, 400, 10)).toEqual({
      rx: 0,
      ry: 0,
      px: 0.5,
      py: 0.5,
      distance: 0,
    });
  });

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

describe("applyTilt", () => {
  it("writes CSS custom properties with units", () => {
    const element = document.createElement("div");
    applyTilt(element, pointerTilt(rect, 150, 300, 10));

    expect(element.style.getPropertyValue("--rx")).toBe("5.00deg");
    expect(element.style.getPropertyValue("--ry")).toBe("-5.00deg");
    expect(element.style.getPropertyValue("--px")).toBe("25.0%");
    expect(element.style.getPropertyValue("--py")).toBe("25.0%");
    expect(element.style.getPropertyValue("--tilt-x")).toBe("-0.500");
    expect(element.style.getPropertyValue("--tilt-y")).toBe("-0.500");

    applyTilt(element, REST);
    expect(element.style.getPropertyValue("--rx")).toBe("0.00deg");
    expect(element.style.getPropertyValue("--distance")).toBe("0.000");
  });
});
