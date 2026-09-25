"use client";

import { useEffect } from "react";
import { play } from "../sound-settings";
import { useQuizStore } from "../store";

/**
 * Plays an effect when the battle moves to a new phase. It listens to the store instead of
 * living inside each component, so animations and sound stay in step without coupling.
 */
export function QuizSounds() {
  useEffect(
    () =>
      useQuizStore.subscribe((state, previous) => {
        if (state.round?.hintUsed && !previous.round?.hintUsed) play("item");
        if (state.phase === previous.phase) return;

        switch (state.phase) {
          case "intro":
            play("encounter");
            break;
          case "hit":
            play(state.gameOver ? "faint" : "wrong");
            break;
          case "reveal":
            play("correct");
            break;
          case "reward":
            play(
              state.reward?.sticker.variant === "shiny" ? "shiny" : "reward",
            );
            break;
          case "gameover":
            // A faint already played its sound on the last hit.
            if (state.gameOver?.reason === "fled") play("flee");
            break;
        }
      }),
    [],
  );

  return null;
}
