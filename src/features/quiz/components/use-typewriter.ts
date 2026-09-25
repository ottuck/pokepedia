"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia?.(REDUCED_MOTION);
  query?.addEventListener?.("change", onChange);
  return () => query?.removeEventListener?.("change", onChange);
}

const prefersReducedMotion = () =>
  window.matchMedia?.(REDUCED_MOTION).matches ?? false;

/**
 * Game Boy style text: reveals `text` one character at a time. `finish()` shows the rest at
 * once (the A button while text is still printing). Reduced motion shows everything at once.
 */
export function useTypewriter(text: string, msPerChar = 28) {
  const reduced = useSyncExternalStore(
    subscribe,
    prefersReducedMotion,
    () => false,
  );
  const [count, setCount] = useState(0);
  // Restart whenever the text changes: keeping the last text in state compares it during
  // render (React's recommended alternative to resetting state in an effect).
  const [current, setCurrent] = useState(text);
  if (current !== text) {
    setCurrent(text);
    setCount(0);
  }

  const characters = Array.from(text);
  const done = reduced || count >= characters.length;

  useEffect(() => {
    if (done) return;
    const timer = setTimeout(() => setCount((n) => n + 1), msPerChar);
    return () => clearTimeout(timer);
  }, [count, done, msPerChar]);

  return {
    shown: done ? text : characters.slice(0, count).join(""),
    done,
    finish: () => setCount(characters.length),
  };
}
