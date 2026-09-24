import type { Transition } from "motion/react";

/** Shared spring presets, so motion feels consistent across the app. */
export const spring = {
  /** Immediate UI feedback: presses, toggles. */
  snappy: { type: "spring", stiffness: 520, damping: 34 },
  /** Celebratory pops: rewards, combos. */
  bouncy: { type: "spring", stiffness: 420, damping: 16 },
  /** Layout changes: reordering and filtering grids. */
  gentle: { type: "spring", stiffness: 280, damping: 32 },
} satisfies Record<string, Transition>;

/** Loaded lazily by <LazyMotion> so the animation engine is not in the initial bundle. */
export const loadMotionFeatures = () =>
  import("./motion-features").then((mod) => mod.default);
