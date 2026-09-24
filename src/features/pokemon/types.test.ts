import { describe, expect, it } from "vitest";
import { Constants } from "@/lib/supabase/database.types";
import { TYPE_COLORS } from "./types";

// WCAG 2.x relative luminance and contrast ratio.
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const channel = parseInt(hex.slice(i, i + 2), 16) / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

describe("TYPE_COLORS", () => {
  it("covers every type in the database enum", () => {
    expect(Object.keys(TYPE_COLORS).sort()).toEqual(
      [...Constants.public.Enums.pokemon_type].sort(),
    );
  });

  it.each(Object.entries(TYPE_COLORS))(
    "%s ink text is readable on its soft background (AA)",
    (_, { soft, ink }) => {
      expect(contrast(ink, soft)).toBeGreaterThanOrEqual(4.5);
    },
  );
});
