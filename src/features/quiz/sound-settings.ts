import { playSound, type SoundName } from "./sound";

const STORAGE_KEY = "quiz-sound";
const CHANGE_EVENT = "pokepedia:sound-change";

/** Kept in memory too, so the toggle works for this visit even when storage is blocked. */
let enabled: boolean | null = null;
let context: AudioContext | null = null;

/** Off unless the player turned it on: sound should never surprise anyone. */
export function isSoundOn(): boolean {
  if (enabled !== null) return enabled;
  try {
    enabled = localStorage.getItem(STORAGE_KEY) === "on";
  } catch {
    enabled = false;
  }
  return enabled;
}

export function setSoundOn(on: boolean) {
  enabled = on;
  try {
    if (on) localStorage.setItem(STORAGE_KEY, "on");
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Not remembered, but still applies to this visit.
  }
  // Turning sound on is a click, which lets the browser start audio.
  if (on) audioContext();
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeSound(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

function audioContext(): AudioContext | null {
  if (typeof AudioContext === "undefined") return null;
  context ??= new AudioContext();
  // Browsers start contexts suspended until the page has had a user gesture.
  if (context.state === "suspended") void context.resume();
  return context;
}

export function play(name: SoundName) {
  if (!isSoundOn()) return;
  const ctx = audioContext();
  if (ctx) playSound(ctx, name);
}
