/**
 * Pointer → tilt math shared by every "hold it to the light" surface (stickers, the detail
 * card). Pure so it can be tested without a browser.
 */
export type Tilt = {
  /** Rotation around the X axis, degrees. The edge under the pointer dips away. */
  rx: number;
  /** Rotation around the Y axis, degrees. */
  ry: number;
  /** Pointer position within the element, 0–1 on each axis (0.5 = center). */
  px: number;
  py: number;
  /** 0 at the center, 1 at a corner: drives how strong glare and foil get. */
  distance: number;
};

export const REST: Tilt = { rx: 0, ry: 0, px: 0.5, py: 0.5, distance: 0 };

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function pointerTilt(
  rect: { left: number; top: number; width: number; height: number },
  clientX: number,
  clientY: number,
  maxDegrees: number,
): Tilt {
  const px = clamp((clientX - rect.left) / rect.width, 0, 1);
  const py = clamp((clientY - rect.top) / rect.height, 0, 1);
  return {
    rx: (0.5 - py) * 2 * maxDegrees,
    ry: (px - 0.5) * 2 * maxDegrees,
    px,
    py,
    distance: clamp(Math.hypot(px - 0.5, py - 0.5) / Math.SQRT1_2, 0, 1),
  };
}

/** Writes a tilt as CSS custom properties; CSS turns them into transforms and light. */
export function applyTilt(element: HTMLElement, tilt: Tilt) {
  const style = element.style;
  style.setProperty("--rx", `${tilt.rx.toFixed(2)}deg`);
  style.setProperty("--ry", `${tilt.ry.toFixed(2)}deg`);
  style.setProperty("--px", `${(tilt.px * 100).toFixed(1)}%`);
  style.setProperty("--py", `${(tilt.py * 100).toFixed(1)}%`);
  style.setProperty("--distance", tilt.distance.toFixed(3));
  // Unitless -1…1 offsets from the center, for lengths (calc cannot divide deg by deg everywhere).
  style.setProperty("--tilt-x", ((tilt.px - 0.5) * 2).toFixed(3));
  style.setProperty("--tilt-y", ((tilt.py - 0.5) * 2).toFixed(3));
}
