import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePointerTilt } from "./use-pointer-tilt";

function Surface({ touch = false }: { touch?: boolean }) {
  const ref = usePointerTilt<HTMLDivElement>({ maxDegrees: 10, touch });
  return <div ref={ref} data-testid="surface" />;
}

/** jsdom has no PointerEvent constructor or layout; fake both. */
function pointer(type: string, { x = 0, y = 0, pointerType = "mouse" } = {}) {
  const event = new MouseEvent(type, { clientX: x, clientY: y, bubbles: true });
  Object.defineProperty(event, "pointerType", { value: pointerType });
  return event;
}

function setup(touch?: boolean) {
  render(<Surface touch={touch} />);
  const surface = screen.getByTestId("surface");
  surface.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 100, height: 100 }) as DOMRect;
  return surface;
}

let reducedMotion = false;

beforeEach(() => {
  reducedMotion = false;
  // Run each animation frame immediately.
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    callback(0);
    return 1;
  });
  window.matchMedia = ((query: string) => ({
    matches: reducedMotion && query.includes("reduce"),
  })) as typeof window.matchMedia;
});

afterEach(() => vi.restoreAllMocks());

describe("usePointerTilt", () => {
  it("ignores touch unless asked, so finger scrolling never tilts a sticker", () => {
    const surface = setup();

    surface.dispatchEvent(
      pointer("pointermove", { x: 0, y: 0, pointerType: "touch" }),
    );

    expect(surface).not.toHaveAttribute("data-tilting");
  });

  it("does nothing at all when reduced motion is requested", () => {
    reducedMotion = true;
    const surface = setup();

    surface.dispatchEvent(pointer("pointermove", { x: 0, y: 0 }));

    expect(surface).not.toHaveAttribute("data-tilting");
    expect(surface.style.getPropertyValue("--rx")).toBe("");
  });
});
