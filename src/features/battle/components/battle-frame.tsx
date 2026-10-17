"use client";

import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import {
  BATTLE_ORIGIN,
  type BattleSticker,
  battleUrl,
  fitBattleScreen,
  initFor,
} from "../host";

type Props = { locale: string; owned: BattleSticker[] };

/** Same as Tailwind's sm: phones below it get the game edge to edge. */
const WIDE = 640;
/** Page padding (px-4 ×2), red frame padding (p-5 ×2) and bezel (p-2 ×2) around the screen. */
const CHROME_X = 32 + 40 + 16;
/** Site header, title and intro, the frame's lights row and paddings: room kept above and below. */
const CHROME_Y = 200;
/** The page column (max-w-page, 42rem). */
const MAIN_MAX = 672;

function subscribe(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}
const windowKey = () =>
  `${window.innerWidth}x${window.innerHeight}@${window.devicePixelRatio || 1}`;

/**
 * The Unity game in an iframe. It answers every `ready` (the game sends it again after a reload
 * or a retry) with the stickers read on the server for this request.
 */
export function BattleFrame({ locale, owned }: Props) {
  const t = useTranslations("battle");
  const frame = useRef<HTMLIFrameElement>(null);
  // Wider screens: size the iframe so the game fills it at a whole-number scale (crisp pixels,
  // no bezel inside the game page). Changes with the window and the display scale.
  const key = useSyncExternalStore(subscribe, windowKey, () => "");
  const screen = useMemo(() => {
    const m = /^(\d+)x(\d+)@([\d.]+)$/.exec(key);
    if (!m || Number(m[1]) < WIDE) return null;
    const width = Math.min(Number(m[1]), MAIN_MAX) - CHROME_X;
    return fitBattleScreen(width, Number(m[2]) - CHROME_Y, Number(m[3]));
  }, [key]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const init = initFor(event, locale, owned);
      if (init) frame.current?.contentWindow?.postMessage(init, BATTLE_ORIGIN);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [locale, owned]);

  return (
    // Phones: edge to edge, the game fills the width. The game scales its pixels by whole
    // numbers, so the extra width often reaches the next scale step (a 375px phone at 2x:
    // 343px → 2x, 375px → 3x).
    // Wider screens: the quiz's red Pokédex device at the same width as the quiz (the page
    // column), with the screen sized by fitBattleScreen and centered on the dark bezel. A bigger
    // screen than that made the low-res art look broken.
    <div className="-mx-4 w-[calc(100%+2rem)] sm:mx-0 sm:w-full sm:rounded-[2rem] sm:bg-dex-red sm:p-5 sm:shadow-xl">
      <div aria-hidden className="mb-3 hidden items-center gap-2 px-1 sm:flex">
        <span className="size-7 rounded-full border-4 border-white bg-sky-400 shadow-inner" />
        <span className="size-3 rounded-full bg-red-300" />
        <span className="size-3 rounded-full bg-volt" />
        <span className="size-3 rounded-full bg-green-400" />
      </div>
      <div className="bg-[#262a35] sm:flex sm:justify-center sm:rounded-2xl sm:p-2">
        <iframe
          ref={frame}
          src={battleUrl(locale)}
          title={t("frameTitle")}
          allow="autoplay"
          style={
            screen ? { width: screen.width, height: screen.height } : undefined
          }
          className="block aspect-[10/9] w-full border-0 sm:aspect-auto sm:h-[432px] sm:w-[480px]"
        />
      </div>
    </div>
  );
}
