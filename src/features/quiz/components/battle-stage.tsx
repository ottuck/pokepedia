"use client";

import { AnimatePresence, m, useReducedMotion } from "motion/react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { spring } from "@/lib/motion";
import { RULES, shinyChance } from "../rules";
import { useQuizStore, type QuizPhase } from "../store";
import styles from "./battle.module.css";
import { ErrorNotice } from "./error-notice";
import { RewardCard } from "./reward-card";
import { TrainerSprite } from "./trainer-sprite";
import { useTrainerName } from "./use-trainer-name";
import { useTypewriter } from "./use-typewriter";

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

/** The trainer levels up with every Pokémon named in the run. */
const START_LEVEL = 5;

/**
 * The battle, laid out like a Game Boy battle screen: the wild Pokémon and its info box on
 * top, the trainer's back and the player's info box below, then the text and command boxes.
 */
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
    <div className={styles.battle}>
      <Hud />
      <div className={styles.field}>
        <EnemyInfo />
        <EnemySprite />
        <Trainer />
        <PlayerInfo />
      </div>
      <div className={styles.console}>
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
    <div className={styles.hud}>
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
      <span className="font-normal opacity-80">
        {t("shinyChance", { percent: chance })}
      </span>
      <span className="font-normal opacity-80">
        {t("skips")} {run.skipsLeft}/{RULES.skipsPerRun}
      </span>
      <span className="font-normal opacity-80">
        {t("round", { seq: round.seq })}
      </span>
    </div>
  );
}

/** A Game Boy HP bar: green, then yellow, then red as it drains. */
function HpBar({ ratio }: { ratio: number }) {
  const level = ratio > 0.7 ? "high" : ratio > 0.4 ? "mid" : "low";
  return (
    <span aria-hidden className={styles.hpRow}>
      <span className={styles.hpLabel}>HP</span>
      <span className={styles.hpTrack}>
        <span
          className={styles.hpFill}
          data-level={level}
          style={{ width: `${ratio * 100}%` }}
        />
      </span>
    </span>
  );
}

/** The Pokémon revealed right now: after a clear, or the answer when the trainer faints. */
function useRevealed() {
  const phase = useQuizStore((s) => s.phase);
  const reward = useQuizStore((s) => s.reward);
  const gameOver = useQuizStore((s) => s.gameOver);
  if (phase === "reveal" || phase === "reward") return reward?.revealed;
  if (phase === "hit" && gameOver) return gameOver.revealed;
  return undefined;
}

function EnemyInfo() {
  const t = useTranslations("quiz");
  const round = useQuizStore((s) => s.round);
  const phase = useQuizStore((s) => s.phase);
  const revealed = useRevealed();
  if (!round) return null;

  // Named correctly: the wild Pokémon's HP runs out.
  const defeated = phase === "reveal" || phase === "reward";

  return (
    <div className={`${styles.info} ${styles.enemyInfo}`}>
      <p aria-live="polite" className={`${styles.name} tabular-nums`}>
        {revealed?.name ?? round.hint ?? round.mask}
      </p>
      <span aria-hidden className={styles.level}>
        :L??
      </span>
      {round.hint && !revealed && (
        <span className="ml-2 text-xs text-[#6b6860]">{t("hint")}</span>
      )}
      <HpBar ratio={defeated ? 0 : 1} />
    </div>
  );
}

function EnemySprite() {
  const t = useTranslations("quiz");
  const round = useQuizStore((s) => s.round);
  const revealed = useRevealed();
  if (!round) return null;

  return (
    <div className={styles.enemy}>
      <div aria-hidden className={styles.platform} />
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
              sizes="208px"
              className="object-contain"
            />
          </m.div>
        ) : (
          <m.div
            key={round.id}
            className="absolute inset-0"
            // A new wild Pokémon slides in from the left, as in the originals.
            initial={{ x: "-160%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={spring.gentle}
          >
            <Image
              src={round.silhouetteUrl}
              alt={t("unknownName")}
              fill
              sizes="208px"
              preload
              className="object-contain"
            />
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * The player's trainer, always on the field. Slides in once when the battle starts and
 * shakes when HP is lost.
 */
function Trainer() {
  const phase = useQuizStore((s) => s.phase);
  return (
    <m.div
      className={styles.trainer}
      initial={{ x: "160%" }}
      animate={{ x: 0 }}
      transition={spring.gentle}
    >
      <div aria-hidden className={styles.trainerPlatform} />
      <m.div
        // Losing HP: the trainer shakes and blinks, as a Pokémon does when it is hit.
        animate={phase === "hit" ? { x: [0, -10, 10, -7, 7, -3, 0] } : { x: 0 }}
        transition={{ duration: 0.45 }}
        className={phase === "hit" ? styles.hurt : undefined}
      >
        <TrainerSprite className={styles.trainerSprite} />
      </m.div>
    </m.div>
  );
}

function PlayerInfo() {
  const t = useTranslations("quiz");
  const round = useQuizStore((s) => s.round);
  const run = useQuizStore((s) => s.run);
  const trainerName = useTrainerName();
  if (!round || !run) return null;

  const level = START_LEVEL + run.roundsCleared;

  return (
    <div className={`${styles.info} ${styles.playerInfo}`}>
      <p className={styles.name}>{trainerName ?? t("battle.you")}</p>
      <span
        // Remounted on every level so the level-up flash plays again.
        key={level}
        className={`${styles.level} ${level > START_LEVEL ? styles.levelUp : ""}`}
      >
        :L{level}
      </span>
      {level > START_LEVEL && (
        <m.span
          key={`up-${level}`}
          aria-hidden
          className="absolute -top-5 right-2 text-xs font-bold text-[#e3342f]"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: [0, 1, 1, 0], y: [4, 0, 0, -4] }}
          transition={{ duration: 1.6 }}
        >
          {t("battle.levelUp")}
        </m.span>
      )}
      <HpBar ratio={round.hp / RULES.maxHp} />
      <span className="sr-only">{t("hud.hp", { hp: round.hp })}</span>
      <span aria-hidden className={`${styles.hpNumbers} tabular-nums`}>
        {round.hp}/ {RULES.maxHp}
      </span>
    </div>
  );
}

function MessageBox() {
  const t = useTranslations("quiz");
  const locale = useLocale();
  const phase = useQuizStore((s) => s.phase);
  const round = useQuizStore((s) => s.round);
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
        className={`${styles.box} ${styles.answer}`}
      >
        <label htmlFor={inputId}>{t("message.answering")}</label>
        <div className={styles.answerRow}>
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
            className={styles.input}
          />
          <button
            type="submit"
            disabled={phase === "judging" || value.trim() === ""}
            className={styles.attack}
          >
            {t("answer.submit")}
          </button>
        </div>
        <button type="button" onClick={closeAnswer} className={styles.cancel}>
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
      : t("message.appeared", { name: round?.mask ?? "???" });
  else if (phase === "hit")
    message = gameOver
      ? t("message.fainted", { name: gameOver.revealed.name })
      : t("message.wrong");
  else if ((phase === "reveal" || phase === "reward") && reward)
    message = t("message.correct", { name: reward.revealed.name });

  return <BattleText message={message} />;
}

/** The text box: prints the message letter by letter; a click shows the rest at once. */
function BattleText({ message }: { message: string }) {
  const { shown, done, finish } = useTypewriter(message);

  return (
    <div className={`${styles.box} ${styles.message}`} onClick={finish}>
      <p aria-live="polite">
        {/* The unprinted rest keeps its space (no reflow) and is hidden from screen
            readers, which hear the message once it is complete. */}
        <span aria-hidden={!done}>
          {shown}
          <span className="invisible">{message.slice(shown.length)}</span>
        </span>
      </p>
      <ErrorNotice />
    </div>
  );
}

const MENU = ["fight", "item", "pokemon", "run"] as const;

/**
 * The 2×2 command box. Arrow keys move the ▶ cursor, Enter or Z picks, 1–4 are shortcuts;
 * the pointer moves the cursor too.
 */
function BattleMenu() {
  const t = useTranslations("quiz.menu");
  const locale = useLocale();
  const phase = useQuizStore((s) => s.phase);
  const round = useQuizStore((s) => s.round);
  const run = useQuizStore((s) => s.run);
  const gameOver = useQuizStore((s) => s.gameOver);
  const store = useQuizStore();
  const [selected, setSelected] = useState(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const active = phase === "menu";
  // The entrance and "wrong" animations can be cut short by choosing the next move, so a
  // player who knows what to do never waits for them. A faint must play out to game over.
  const skippable = phase === "intro" || (phase === "hit" && !gameOver);
  const usable = active || skippable;

  useEffect(() => {
    // Keyboard players land on the menu whenever it can be used (also after the answer
    // box closes), not on every cursor move.
    if (usable) buttons.current[selected]?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usable]);

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
      const next = (selected + moves[event.key] + MENU.length) % MENU.length;
      setSelected(next);
      buttons.current[next]?.focus();
    } else if (event.key === "z" || event.key === "Z") {
      // The A button.
      event.preventDefault();
      act(MENU[selected]);
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
      className={`${styles.box} ${styles.menu}`}
    >
      {MENU.map((item, index) => (
        <button
          key={item}
          ref={(el) => {
            buttons.current[index] = el;
          }}
          type="button"
          tabIndex={index === selected ? 0 : -1}
          data-selected={index === selected}
          onFocus={() => setSelected(index)}
          onMouseEnter={() => setSelected(index)}
          onClick={() => act(item)}
          aria-disabled={disabled[item]}
          className={styles.command}
        >
          <span aria-hidden className={styles.pointer}>
            ▶
          </span>
          {t(item)}
        </button>
      ))}
    </div>
  );
}
