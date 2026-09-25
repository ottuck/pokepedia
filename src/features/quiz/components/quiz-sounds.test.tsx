import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useQuizStore } from "../store";
import { QuizSounds } from "./quiz-sounds";

const play = vi.hoisted(() => vi.fn());
vi.mock("../sound-settings", () => ({ play }));
vi.mock("../actions", () => ({}));

beforeEach(() => {
  play.mockClear();
  useQuizStore.getState().reset();
});

function to(state: Partial<ReturnType<typeof useQuizStore.getState>>) {
  act(() => useQuizStore.setState(state));
}

describe("QuizSounds", () => {
  it("plays the effect that matches each battle phase", () => {
    render(<QuizSounds />);

    to({ phase: "intro" });
    to({ phase: "hit" });
    to({ phase: "reveal" });
    to({
      phase: "reward",
      reward: {
        revealed: { id: 25, name: "피카츄", artworkUrl: "" },
        scoreGained: 100,
        sticker: { variant: "shiny", quantity: 1, isNew: true },
      },
    });

    expect(play.mock.calls.map(([name]) => name)).toEqual([
      "encounter",
      "wrong",
      "correct",
      "shiny",
    ]);
  });

  it("plays the faint jingle once when the last HP is lost", () => {
    render(<QuizSounds />);

    to({
      phase: "hit",
      gameOver: {
        reason: "fainted",
        revealed: { id: 25, name: "피카츄", artworkUrl: "" },
      },
    });
    to({ phase: "gameover" });

    expect(play.mock.calls.map(([name]) => name)).toEqual(["faint"]);
  });

  it("does not replay when the phase stays the same", () => {
    render(<QuizSounds />);

    to({ phase: "menu" });
    to({ phase: "menu", error: "conflict" });

    expect(play).not.toHaveBeenCalled();
  });
});
