"use client";

import { AnimatePresence, m, useReducedMotion } from "motion/react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { spring } from "@/lib/motion";
import { RULES, shinyChance } from "../rules";
import { useQuizStore, type QuizPhase } from "../store";
import { ErrorNotice } from "./error-notice";
import { RewardCard } from "./reward-card";

// How long each automatic phase holds before advancing (ms). Kept short: players felt every
// click wait over a second. The menu also works during intro and hit (see BattleMenu), so
// these are the longest a player can be made to wait, not the usual. Reduced motion drops
// the waits that exist only for animation.
const PHASE_DURATION: Partial<Record<QuizPhase, number>> = {
  intro: 700,
  hit: 600,
  reveal: 1100,
};
const REDUCED_DURATION: Partial<Record<QuizPhase, number>> = {
  intro: 400,
  hit: 500,
  reveal: 700,
};

export function BattleStage() {
  const phase = useQuizStore((s) => s.phase);
  const advance = useQuizStore((s) => s.advance);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const duration = (reduceMotion ? REDUCED_DURATION : PHASE_DURATION)[phase];
    if (duration === undefined) return;
    const timer = setTimeout(advance, duration);
    return () => clearTimeout(timer);
  }, [phase, advance, reduceMotion]);

  return (
    <div className="flex flex-col">
      <Hud />
      <div className="relative grid min-h-72 grid-cols-[1fr_auto] items-center gap-2 px-4 py-4 sm:min-h-80 sm:px-8">
        <div className="flex h-full flex-col justify-between gap-4 py-2">
          <EnemyPanel />
          <PlayerPanel />
        </div>
        <PokemonStage />
      </div>
      <div className="grid gap-3 border-t-4 border-ink/15 bg-card/60 p-3 sm:grid-cols-[1fr_16rem] sm:p-4">
        <MessageBox />
        <BattleMenu />
      </div>
      <AnimatePresence>{phase === "reward" && <RewardCard />}</AnimatePresence>
    </div>
  );
}

function Hud() {
  const t = useTranslations("quiz.hud");
  const run = useQuizStore((s) => s.run);
  const round = useQuizStore((s) => s.round);
  if (!run || !round) return null;

  // What a clear right now would give: next combo, current hint state.
  const chance = Math.round(shinyChance(run.combo + 1, round.hintUsed) * 100);

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 bg-charcoal/85 px-4 py-2 text-sm font-bold text-white sm:px-8">
      <span>
        {t("score")}{" "}
        <m.span
          key={run.score}
          initial={{ scale: 1.4 }}
          animate={{ scale: 1 }}
          className="inline-block tabular-nums"
        >
          {run.score.toLocaleString()}
        </m.span>
      </span>
      <span className={run.combo >= 5 ? "text-volt" : undefined}>
        {t("combo")}{" "}
        <m.span
          key={run.combo}
          initial={{ scale: run.combo > 0 ? 1.8 : 1 }}
          animate={{ scale: 1 }}
          transition={spring.bouncy}
          className="inline-block tabular-nums"
        >
          ×{run.combo}
        </m.span>
      </span>
      <span className="font-normal text-white/80">
        {t("shinyChance", { percent: chance })}
      </span>
      <span className="font-normal text-white/80">
        {t("skips")} {run.skipsLeft}/{RULES.skipsPerRun}
      </span>
      <span className="font-normal text-white/80">
        {t("round", { seq: round.seq })}
      </span>
    </div>
  );
}

function EnemyPanel() {
  const t = useTranslations("quiz");
  const round = useQuizStore((s) => s.round);
  const phase = useQuizStore((s) => s.phase);
  const reward = useQuizStore((s) => s.reward);
  const gameOver = useQuizStore((s) => s.gameOver);
  if (!round) return null;

  const revealedName =
    phase === "reveal" || phase === "reward"
      ? reward?.revealed.name
      : phase === "hit" && gameOver
        ? gameOver.revealed.name
        : null;

  return (
    <div className="max-w-64 rounded-2xl rounded-bl-none border-4 border-ink/80 bg-card px-4 py-2 shadow">
      <p
        aria-live="polite"
        className="text-xl font-black tracking-widest tabular-nums"
      >
        {revealedName ?? round.hint ?? round.mask}
      </p>
      {round.hint && !revealedName && (
        <p className="text-xs font-semibold text-muted">{t("hint")}</p>
      )}
    </div>
  );
}

function PlayerPanel() {
  const t = useTranslations("quiz.hud");
  const round = useQuizStore((s) => s.round);
  const phase = useQuizStore((s) => s.phase);
  if (!round) return null;

  return (
    <m.div
      // Hit: the trainer's panel shakes (legacy counter-attack).
      animate={phase === "hit" ? { x: [0, -12, 12, -8, 8, 0] } : { x: 0 }}
      transition={{ duration: 0.5 }}
      className="w-fit rounded-2xl rounded-tr-none border-4 border-ink/80 bg-card px-4 py-2 shadow"
    >
      <p className="sr-only">{t("hp", { hp: round.hp })}</p>
      <div aria-hidden className="flex gap-1 text-2xl">
        {Array.from({ length: RULES.maxHp }, (_, i) => (
          <m.span
            key={i}
            animate={
              i < round.hp
                ? { scale: 1, opacity: 1 }
                : { scale: 0.6, opacity: 0.25 }
            }
            transition={spring.bouncy}
            className="text-dex-red"
          >
            ♥
          </m.span>
        ))}
      </div>
    </m.div>
  );
}

function PokemonStage() {
  const t = useTranslations("quiz");
  const round = useQuizStore((s) => s.round);
  const phase = useQuizStore((s) => s.phase);
  const reward = useQuizStore((s) => s.reward);
  const gameOver = useQuizStore((s) => s.gameOver);
  if (!round) return null;

  const revealed =
    phase === "reveal" || phase === "reward"
      ? reward?.revealed
      : phase === "hit" && gameOver
        ? gameOver.revealed
        : undefined;

  return (
    <div className="relative size-40 sm:size-56">
      {/* Grass platform */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-2 h-8 rounded-[50%] bg-green-700/25"
      />
      <AnimatePresence mode="wait">
        {revealed ? (
          <m.div
            key={`reveal-${revealed.id}`}
            className="absolute inset-0"
            initial={{ filter: "brightness(0)", scale: 0.9 }}
            animate={{ filter: "brightness(1)", scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            {/* Flash on reveal */}
            <m.div
              aria-hidden
              className="absolute inset-0 rounded-full bg-white"
              initial={{ opacity: 0.9, scale: 0.4 }}
              animate={{ opacity: 0, scale: 1.6 }}
              transition={{ duration: 0.6 }}
            />
            <Image
              src={revealed.artworkUrl}
              alt={revealed.name}
              fill
              sizes="224px"
              className="object-contain"
            />
          </m.div>
        ) : (
          <m.div
            key={round.id}
            className="absolute inset-0"
            initial={{ x: 120, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={spring.gentle}
          >
            <Image
              src={round.silhouetteUrl}
              alt={t("unknownName")}
              fill
              sizes="224px"
              preload
              className="object-contain"
            />
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MessageBox() {
  const t = useTranslations("quiz");
  const locale = useLocale();
  const phase = useQuizStore((s) => s.phase);
  const reward = useQuizStore((s) => s.reward);
  const skipped = useQuizStore((s) => s.skipped);
  const gameOver = useQuizStore((s) => s.gameOver);
  const answer = useQuizStore((s) => s.answer);
  const closeAnswer = useQuizStore((s) => s.closeAnswer);
  const [value, setValue] = useState("");
  const inputId = useId();

  if (phase === "answering" || phase === "judging") {
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void answer(value, locale).then(() => setValue(""));
        }}
        className="flex flex-col gap-2 rounded-2xl border-4 border-ink/80 bg-card p-3"
      >
        <label htmlFor={inputId} className="text-sm font-semibold">
          {t("message.answering")}
        </label>
        <div className="flex gap-2">
          <input
            id={inputId}
            autoFocus
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") closeAnswer();
            }}
            maxLength={40}
            autoComplete="off"
            enterKeyHint="send"
            placeholder={t("answer.placeholder")}
            disabled={phase === "judging"}
            className="h-11 min-w-0 flex-1 rounded-xl border-2 border-ink/20 px-3 text-base outline-none focus:border-dex-red"
          />
          <button
            type="submit"
            disabled={phase === "judging" || value.trim() === ""}
            className="rounded-xl bg-dex-red px-4 font-black text-white disabled:opacity-50"
          >
            {t("answer.submit")}
          </button>
        </div>
        <button
          type="button"
          onClick={closeAnswer}
          className="self-start text-xs text-muted"
        >
          {t("answer.cancel")}
        </button>
        <ErrorNotice />
      </form>
    );
  }

  let message = t("message.menu");
  if (phase === "intro")
    message = skipped
      ? t("message.skipped", { name: skipped.name })
      : t("message.appeared");
  else if (phase === "hit")
    message = gameOver
      ? t("message.fainted", { name: gameOver.revealed.name })
      : t("message.wrong");
  else if ((phase === "reveal" || phase === "reward") && reward)
    message = t("message.correct", { name: reward.revealed.name });

  return (
    <div className="flex min-h-24 flex-col justify-between gap-2 rounded-2xl border-4 border-ink/80 bg-card p-3">
      <p aria-live="polite" className="text-base font-bold">
        {message}
      </p>
      <ErrorNotice />
    </div>
  );
}

const MENU = ["fight", "item", "pokemon", "run"] as const;

/** Legacy 2×2 battle menu: arrow keys move, Enter picks, 1–4 are shortcuts. */
function BattleMenu() {
  const t = useTranslations("quiz.menu");
  const locale = useLocale();
  const phase = useQuizStore((s) => s.phase);
  const round = useQuizStore((s) => s.round);
  const run = useQuizStore((s) => s.run);
  const gameOver = useQuizStore((s) => s.gameOver);
  const store = useQuizStore();
  const [focused, setFocused] = useState(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const active = phase === "menu";
  // The entrance and "wrong" animations can be cut short by choosing the next move, so a
  // player who knows what to do never waits for them. A faint must play out to game over.
  const skippable = phase === "intro" || (phase === "hit" && !gameOver);
  const usable = active || skippable;

  useEffect(() => {
    if (active) buttons.current[focused]?.focus();
    // Only when the menu becomes active, not on every focus move.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const disabled: Record<(typeof MENU)[number], boolean> = {
    fight: !usable,
    item: !usable || !!round?.hintUsed,
    pokemon: !usable || (run?.skipsLeft ?? 0) <= 0,
    run: !usable,
  };

  const act = (item: (typeof MENU)[number]) => {
    if (disabled[item]) return;
    if (skippable) store.advance();
    if (item === "fight") store.openAnswer();
    else if (item === "item") void store.hint(locale);
    else if (item === "pokemon") void store.skip(locale);
    else void store.flee(locale);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const moves: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -2,
      ArrowDown: 2,
    };
    if (event.key in moves) {
      event.preventDefault();
      const next = (focused + moves[event.key] + MENU.length) % MENU.length;
      setFocused(next);
      buttons.current[next]?.focus();
    } else if (/^[1-4]$/.test(event.key)) {
      event.preventDefault();
      act(MENU[Number(event.key) - 1]);
    }
  };

  return (
    <div
      role="group"
      aria-label={t("label")}
      onKeyDown={onKeyDown}
      className="grid grid-cols-2 gap-2"
    >
      {MENU.map((item, index) => (
        <button
          key={item}
          ref={(el) => {
            buttons.current[index] = el;
          }}
          type="button"
          tabIndex={index === focused ? 0 : -1}
          onFocus={() => setFocused(index)}
          onClick={() => act(item)}
          aria-disabled={disabled[item]}
          className="rounded-xl border-4 border-ink/80 bg-card px-3 py-3 text-left font-black transition-colors hover:bg-volt/30 focus-visible:bg-volt/40 focus-visible:outline-none aria-disabled:cursor-not-allowed aria-disabled:opacity-40"
        >
          <span aria-hidden className="mr-1 text-dex-red">
            ▸
          </span>
          {t(item)}
        </button>
      ))}
    </div>
  );
}
