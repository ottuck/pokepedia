"use client";

import { LazyMotion, MotionConfig } from "motion/react";
import { loadMotionFeatures } from "@/lib/motion";
import { useQuizStore } from "../store";
import { BattleStage } from "./battle-stage";
import { GameOver } from "./game-over";
import { Lobby } from "./lobby";
import { PokedexFrame } from "./pokedex-frame";

export function QuizGame() {
  const phase = useQuizStore((s) => s.phase);

  return (
    <LazyMotion features={loadMotionFeatures} strict>
      <MotionConfig reducedMotion="user">
        <PokedexFrame>
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
