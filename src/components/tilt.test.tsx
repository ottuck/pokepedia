import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Tilt } from "./tilt";

let reducedMotion = false;

beforeEach(() => {
  reducedMotion = false;
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    callback(0);
    return 1;
  });
  window.matchMedia = ((query: string) => ({
    matches: reducedMotion && query.includes("reduce"),
  })) as typeof window.matchMedia;
});

afterEach(() => vi.restoreAllMocks());

function renderTilt() {
  const { container } = render(
    <Tilt className="rounded-2xl">
      <button type="button">피카츄</button>
    </Tilt>,
  );
  const surface = container.firstElementChild as HTMLElement;
  surface.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 100, height: 100 }) as DOMRect;
  return surface;
}

function mouseMove(target: HTMLElement) {
  const event = new MouseEvent("pointermove", { clientX: 0, clientY: 0 });
  Object.defineProperty(event, "pointerType", { value: "mouse" });
  target.dispatchEvent(event);
}

describe("Tilt", () => {
  it("wraps the sticker, adds a decorative glare layer and tilts toward the mouse", () => {
    const surface = renderTilt();

    expect(screen.getByRole("button", { name: "피카츄" })).toBeInTheDocument();
    expect(surface.querySelector("[aria-hidden]")).toBeInTheDocument();

    mouseMove(surface);
    expect(surface).toHaveAttribute("data-tilting");
    expect(surface.style.getPropertyValue("--rx")).toBe("10.00deg");
  });

  it("stays flat when reduced motion is requested", () => {
    reducedMotion = true;
    const surface = renderTilt();

    mouseMove(surface);

    expect(surface).not.toHaveAttribute("data-tilting");
    expect(surface.style.getPropertyValue("--rx")).toBe("");
  });
});
