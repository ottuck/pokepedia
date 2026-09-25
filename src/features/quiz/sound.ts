/**
 * Chiptune sound effects synthesized with the Web Audio API: no audio files, so nothing to
 * license or download. Each effect is a short list of notes played by one oscillator each.
 */

export type SoundName =
  | "encounter"
  | "item"
  | "wrong"
  | "correct"
  | "reward"
  | "shiny"
  | "faint"
  | "flee";

type Note = {
  /** Hz. */
  frequency: number;
  /** Seconds after the effect starts. */
  at: number;
  /** Seconds. */
  duration: number;
  wave?: OscillatorType;
  /** Peak volume, 0–1, before the master volume. */
  volume?: number;
  /** Slide to this frequency over the note (a "pew"). */
  slideTo?: number;
};

// Equal-tempered pitches used below (A4 = 440 Hz).
const C5 = 523.25;
const E5 = 659.25;
const G5 = 783.99;
const C6 = 1046.5;
const E6 = 1318.51;
const G6 = 1567.98;

const arpeggio = (frequencies: number[], step: number, wave: OscillatorType) =>
  frequencies.map((frequency, i) => ({
    frequency,
    at: i * step,
    duration: step * 1.4,
    wave,
  }));

const SOUNDS: Record<SoundName, Note[]> = {
  encounter: [
    { frequency: 220, at: 0, duration: 0.18, wave: "square", slideTo: 440 },
    { frequency: 440, at: 0.2, duration: 0.12, wave: "square" },
  ],
  item: arpeggio([G5, C6, E6], 0.06, "triangle"),
  wrong: [
    {
      frequency: 180,
      at: 0,
      duration: 0.28,
      wave: "square",
      slideTo: 90,
      volume: 0.8,
    },
  ],
  correct: arpeggio([C5, E5, G5, C6], 0.08, "square"),
  reward: [
    ...arpeggio([G5, C6], 0.09, "triangle"),
    { frequency: E6, at: 0.2, duration: 0.3, wave: "triangle" },
  ],
  shiny: [
    ...arpeggio([C6, E6, G6, C6 * 2], 0.07, "triangle"),
    { frequency: G6, at: 0.32, duration: 0.25, wave: "sine", volume: 0.6 },
    { frequency: C6 * 2, at: 0.42, duration: 0.35, wave: "sine", volume: 0.5 },
  ],
  faint: [
    { frequency: 392, at: 0, duration: 0.2, wave: "square" },
    { frequency: 330, at: 0.22, duration: 0.2, wave: "square" },
    { frequency: 262, at: 0.44, duration: 0.45, wave: "square", slideTo: 196 },
  ],
  flee: [
    { frequency: 300, at: 0, duration: 0.25, wave: "triangle", slideTo: 900 },
  ],
};

/** Master volume: effects stay quiet under speech or music the player may have on. */
const MASTER = 0.08;

export function playSound(context: AudioContext, name: SoundName) {
  const start = context.currentTime + 0.01;
  for (const note of SOUNDS[name]) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const at = start + note.at;
    const end = at + note.duration;
    const peak = MASTER * (note.volume ?? 1);

    oscillator.type = note.wave ?? "square";
    oscillator.frequency.setValueAtTime(note.frequency, at);
    if (note.slideTo) {
      oscillator.frequency.exponentialRampToValueAtTime(note.slideTo, end);
    }
    // A fast attack and a decay to near silence, so notes do not click.
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(peak, at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    oscillator.connect(gain).connect(context.destination);
    oscillator.start(at);
    oscillator.stop(end + 0.02);
  }
}
