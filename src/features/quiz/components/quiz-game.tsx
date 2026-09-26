"use client";

import { LazyMotion, MotionConfig } from "motion/react";
import { useEffect, useRef } from "react";
import { loadMotionFeatures } from "@/lib/motion";
import { useQuizStore } from "../store";
import { BattleStage } from "./battle-stage";
import { GameOver } from "./game-over";
import { Lobby } from "./lobby";
import { PokedexFrame } from "./pokedex-frame";
import { QuizSounds } from "./quiz-sounds";

const PHONE = "(max-width: 639px)";
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

export function QuizGame() {
  const phase = useQuizStore((s) => s.phase);
  const frame = useRef<HTMLDivElement>(null);
  const inBattle =
    phase !== "lobby" && phase !== "starting" && phase !== "gameover";

  // Phones: once the battle starts, bring the whole device into view and stop touches on it
  // from scrolling the page, so tapping commands never drags the screen around.
  useEffect(() => {
    if (!inBattle || !window.matchMedia?.(PHONE).matches) return;
    frame.current?.scrollIntoView({
      block: "start",
      behavior: window.matchMedia(REDUCED_MOTION).matches ? "auto" : "smooth",
    });
  }, [inBattle]);

  return (
    <LazyMotion features={loadMotionFeatures} strict>
      <MotionConfig reducedMotion="user">
        <QuizSounds />
        <PokedexFrame ref={frame} locked={inBattle}>
          {phase === "lobby" || phase === "starting" ? (
            <Lobby />
          ) : phase === "gameover" ? (
            <GameOver />
          ) : (
            <div className="relative">
              <BattleStage />
            </div>
          )}
        </PokedexFrame>
      </MotionConfig>
    </LazyMotion>
  );
}
