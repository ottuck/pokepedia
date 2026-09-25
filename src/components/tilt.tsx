"use client";

import {
  m,
  useMotionTemplate,
  useMotionValue,
  useReducedMotionConfig,
  useSpring,
  useTransform,
} from "motion/react";
import type { PointerEvent, ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Holographic sheen for shiny stickers instead of a plain white glare. */
  holo?: boolean;
  /** Largest rotation in degrees at the card's edges. */
  max?: number;
  className?: string;
};

const settle = { stiffness: 300, damping: 24 };

/**
 * A sticker that tilts toward the mouse with a light glare, like holding a card to the light.
 * Pointer position lives in motion values, so moving the mouse never re-renders React.
 * Mouse only (touch scrolls the grid instead), and flat when reduced motion is requested.
 * Must render inside <LazyMotion> (uses `m`).
 */
export function Tilt({ children, holo = false, max = 10, className }: Props) {
  // Follows <MotionConfig reducedMotion="user">, i.e. the OS setting unless a parent overrides it.
  const reduceMotion = useReducedMotionConfig();
  // Pointer position within the card, 0–1 on each axis; 0.5 is the resting center.
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(y, [0, 1], [max, -max]), settle);
  const rotateY = useSpring(useTransform(x, [0, 1], [-max, max]), settle);
  const glareX = useTransform(x, (v) => `${v * 100}%`);
  const glareY = useTransform(y, (v) => `${v * 100}%`);
  const glare = useMotionTemplate`radial-gradient(circle at ${glareX} ${glareY}, rgb(255 255 255 / 0.45), transparent 55%)`;
  const sheen = useMotionTemplate`linear-gradient(115deg, transparent 20%, rgb(255 120 200 / 0.35) calc(${glareX} - 10%), rgb(120 220 255 / 0.35) ${glareX}, rgb(255 240 120 / 0.35) calc(${glareX} + 10%), transparent 80%)`;

  if (reduceMotion) return <div className={className}>{children}</div>;

  function track(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    x.set((event.clientX - rect.left) / rect.width);
    y.set((event.clientY - rect.top) / rect.height);
  }

  function reset() {
    x.set(0.5);
    y.set(0.5);
  }

  return (
    <m.div
      onPointerMove={track}
      onPointerLeave={reset}
      style={{ rotateX, rotateY, transformPerspective: 600 }}
      className={`group/tilt relative ${className ?? ""}`}
    >
      {children}
      <m.div
        aria-hidden
        style={{ backgroundImage: holo ? sheen : glare }}
        className={`pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-200 group-hover/tilt:opacity-100 ${holo ? "mix-blend-color-dodge" : "mix-blend-soft-light"}`}
      />
    </m.div>
  );
}
