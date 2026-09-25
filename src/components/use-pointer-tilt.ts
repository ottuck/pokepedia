"use client";

import { useEffect, useRef } from "react";
import { applyTilt, pointerTilt, REST, type Tilt } from "@/lib/pointer-tilt";

type Options = {
  /** Largest rotation in degrees at the element's edges. */
  maxDegrees: number;
  /** Also tilt while a finger drags across (the element should use `touch-action: pan-y`). */
  touch?: boolean;
};

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/**
 * Makes an element follow the pointer without re-rendering React: pointer events are folded
 * into one write per animation frame, as CSS custom properties (--rx, --ry, --px, --py,
 * --distance) plus `data-tilting` while engaged. All visuals live in CSS.
 *
 * Mouse: hover. Touch (opt-in): a horizontal drag tilts; a vertical swipe scrolls the page,
 * which cancels the pointer and lays the element flat again. Reduced motion: nothing moves.
 */
export function usePointerTilt<T extends HTMLElement>({
  maxDegrees,
  touch = false,
}: Options) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const motion = window.matchMedia?.(REDUCED_MOTION);
    if (motion?.matches) return;

    // At most one write per frame: pointer events arrive far more often than frames.
    let frame = 0;
    let pending = false;
    let next: Tilt = REST;
    const flush = () => {
      pending = false;
      applyTilt(element, next);
    };
    const schedule = (tilt: Tilt) => {
      next = tilt;
      if (pending) return;
      // Set before requesting: the flag must not depend on when the callback runs.
      pending = true;
      frame = requestAnimationFrame(flush);
    };

    const accepts = (event: PointerEvent) =>
      event.pointerType === "mouse" || event.pointerType === "pen" || touch;
    const move = (event: PointerEvent) => {
      if (!accepts(event)) return;
      element.dataset.tilting = "";
      schedule(
        pointerTilt(
          element.getBoundingClientRect(),
          event.clientX,
          event.clientY,
          maxDegrees,
        ),
      );
    };
    const rest = () => {
      delete element.dataset.tilting;
      schedule(REST);
    };

    element.addEventListener("pointermove", move);
    element.addEventListener("pointerdown", move);
    element.addEventListener("pointerleave", rest);
    element.addEventListener("pointercancel", rest);
    if (touch) element.addEventListener("pointerup", rest);
    return () => {
      cancelAnimationFrame(frame);
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerdown", move);
      element.removeEventListener("pointerleave", rest);
      element.removeEventListener("pointercancel", rest);
      element.removeEventListener("pointerup", rest);
    };
  }, [maxDegrees, touch]);

  return ref;
}
