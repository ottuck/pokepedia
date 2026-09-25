import { describe, expect, it, vi } from "vitest";
import { playSound, SOUNDS } from "./sound";

function fakeContext() {
  const oscillators: Array<{ type: string; start: number; stop: number }> = [];
  const param = () => ({
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  });
  const context = {
    currentTime: 10,
    destination: {},
    createOscillator: () => {
      const record = { type: "", start: 0, stop: 0 };
      oscillators.push(record);
      const node = {
        frequency: param(),
        set type(value: string) {
          record.type = value;
        },
        connect: (target: unknown) => target,
        start: (at: number) => (record.start = at),
        stop: (at: number) => (record.stop = at),
      };
      return node;
    },
    createGain: () => ({
      gain: param(),
      connect: (target: unknown) => target,
    }),
  };
  return { context: context as unknown as AudioContext, oscillators };
}

describe("SOUNDS", () => {
  it.each(Object.entries(SOUNDS))("%s is short and well-formed", (_, notes) => {
    expect(notes.length).toBeGreaterThan(0);
    for (const note of notes) {
      expect(note.frequency).toBeGreaterThan(20);
      expect(note.duration).toBeGreaterThan(0);
      expect(note.at + note.duration).toBeLessThan(1.5);
    }
  });
});

describe("playSound", () => {
  it("schedules one oscillator per note, starting now and stopping after it", () => {
    const { context, oscillators } = fakeContext();

    playSound(context, "correct");

    expect(oscillators).toHaveLength(SOUNDS.correct.length);
    for (const oscillator of oscillators) {
      expect(oscillator.start).toBeGreaterThanOrEqual(10);
      expect(oscillator.stop).toBeGreaterThan(oscillator.start);
      expect(oscillator.type).toBe("square");
    }
  });
});
