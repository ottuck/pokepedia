import { render, screen } from "@testing-library/react";
import { domMax, LazyMotion, MotionConfig } from "motion/react";
import { describe, expect, it } from "vitest";
import { Tilt } from "./tilt";

function renderTilt(reducedMotion: "always" | "never") {
  return render(
    <LazyMotion features={domMax} strict>
      <MotionConfig reducedMotion={reducedMotion}>
        <Tilt className="rounded-2xl">
          <button type="button">피카츄</button>
        </Tilt>
      </MotionConfig>
    </LazyMotion>,
  );
}

describe("Tilt", () => {
  it("wraps the sticker and adds a decorative glare layer", () => {
    const { container } = renderTilt("never");

    expect(screen.getByRole("button", { name: "피카츄" })).toBeInTheDocument();
    expect(container.querySelector("[aria-hidden]")).toBeInTheDocument();
  });

  it("stays flat, with no glare, when reduced motion is requested", () => {
    const { container } = renderTilt("always");

    expect(screen.getByRole("button", { name: "피카츄" })).toBeInTheDocument();
    expect(container.querySelector("[aria-hidden]")).not.toBeInTheDocument();
    expect(container.firstElementChild).not.toHaveStyle({
      transform: expect.stringContaining("rotate"),
    });
  });
});
