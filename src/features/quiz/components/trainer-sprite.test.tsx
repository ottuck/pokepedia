import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  TRAINER_PALETTE,
  TRAINER_PIXELS,
  TrainerSprite,
} from "./trainer-sprite";

describe("TrainerSprite", () => {
  it("is a square pixel grid with every color in the palette", () => {
    const width = TRAINER_PIXELS[0].length;
    expect(TRAINER_PIXELS).toHaveLength(width);
    for (const row of TRAINER_PIXELS) {
      expect(row).toHaveLength(width);
      for (const pixel of row) {
        expect(pixel === "." || pixel in TRAINER_PALETTE).toBe(true);
      }
    }
  });

  it("renders as decorative crisp-edged SVG", () => {
    const { container } = render(<TrainerSprite />);
    const svg = container.querySelector("svg")!;

    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("shape-rendering", "crispEdges");
    expect(svg.querySelectorAll("rect").length).toBeGreaterThan(20);
  });
});
