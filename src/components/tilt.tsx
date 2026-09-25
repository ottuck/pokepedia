"use client";

import type { ReactNode } from "react";
import { usePointerTilt } from "./use-pointer-tilt";

type Props = {
  children: ReactNode;
  /** Holographic sheen for shiny stickers instead of a plain white glare. */
  holo?: boolean;
  /** Largest rotation in degrees at the card's edges. */
  max?: number;
  className?: string;
};

// Light that follows the pointer, fed by the CSS variables usePointerTilt writes.
const GLARE =
  "radial-gradient(circle at var(--px, 50%) var(--py, 50%), rgb(255 255 255 / 0.45), transparent 55%)";
const SHEEN =
  "linear-gradient(115deg, transparent 20%, rgb(255 120 200 / 0.35) calc(var(--px, 50%) - 10%), rgb(120 220 255 / 0.35) var(--px, 50%), rgb(255 240 120 / 0.35) calc(var(--px, 50%) + 10%), transparent 80%)";

/**
 * A sticker that tilts toward the mouse with a light glare, like holding a card to the light.
 * Shares usePointerTilt with the detail page card: the pointer only writes CSS variables, so
 * moving the mouse never re-renders React. Mouse only (touch scrolls the grid instead), and
 * flat when reduced motion is requested.
 */
export function Tilt({ children, holo = false, max = 10, className }: Props) {
  const ref = usePointerTilt<HTMLDivElement>({ maxDegrees: max });

  return (
    <div
      ref={ref}
      className={`group/tilt relative [transform:perspective(600px)_rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))] transition-transform duration-500 ease-out data-tilting:duration-75 ${className ?? ""}`}
    >
      {children}
      <div
        aria-hidden
        style={{ backgroundImage: holo ? SHEEN : GLARE }}
        className={`pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-200 group-data-tilting/tilt:opacity-100 motion-reduce:hidden ${holo ? "mix-blend-color-dodge" : "mix-blend-soft-light"}`}
      />
    </div>
  );
}
