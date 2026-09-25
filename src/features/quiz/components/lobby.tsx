"use client";

import { useLocale } from "next-intl";
import { useState } from "react";
import { useQuizStore } from "../store";
import { ErrorNotice } from "./error-notice";
import { RulesScreen } from "./rules-screen";
import { TitleScreen } from "./title-screen";

const RULES_SEEN = "quiz-rules-seen";

function rulesSeen() {
  try {
    return localStorage.getItem(RULES_SEEN) === "1";
  } catch {
    return false;
  }
}

function rememberRules() {
  try {
    localStorage.setItem(RULES_SEEN, "1");
  } catch {
    // Not remembered; the rules show again next time, which is harmless.
  }
}

/**
 * Before a game: the title screen, then (first time only, or on request) the rules, then
 * the battle. The server call starts on the last step; its "getting ready" state shows in
 * whichever screen is up.
 */
export function Lobby() {
  const locale = useLocale();
  const phase = useQuizStore((s) => s.phase);
  const start = useQuizStore((s) => s.start);
  const starting = phase === "starting";
  const [screen, setScreen] = useState<"title" | "rules">("title");

  const play = () => {
    rememberRules();
    void start(locale);
  };

  return (
    <div className="relative">
      {screen === "title" ? (
        <TitleScreen
          starting={starting}
          onStart={() => (rulesSeen() ? play() : setScreen("rules"))}
          onShowRules={() => setScreen("rules")}
        />
      ) : (
        <RulesScreen starting={starting} onDone={play} />
      )}
      <div className="absolute inset-x-4 bottom-4 z-10">
        <ErrorNotice />
      </div>
    </div>
  );
}
