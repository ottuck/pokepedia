"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { BATTLE_ORIGIN, type BattleSticker, battleUrl, initFor } from "../host";

type Props = { locale: string; owned: BattleSticker[] };

/**
 * The Unity game in an iframe. It answers every `ready` (the game sends it again after a reload
 * or a retry) with the stickers read on the server for this request.
 */
export function BattleFrame({ locale, owned }: Props) {
  const t = useTranslations("battle");
  const frame = useRef<HTMLIFrameElement>(null);

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
    // Wider screens: the same red Pokédex device as the quiz, as wide as the collection page.
    // The game keeps its 10:9 screen and grows to the window height; the space beside it is the
    // dark bezel the game page draws (pokepedia-unity WebGL template).
    <div className="-mx-4 w-[calc(100%+2rem)] sm:mx-0 sm:w-full sm:rounded-[2rem] sm:bg-dex-red sm:p-5 sm:shadow-xl">
      <div aria-hidden className="mb-3 hidden items-center gap-2 px-1 sm:flex">
        <span className="size-7 rounded-full border-4 border-white bg-sky-400 shadow-inner" />
        <span className="size-3 rounded-full bg-red-300" />
        <span className="size-3 rounded-full bg-volt" />
        <span className="size-3 rounded-full bg-green-400" />
      </div>
      <div className="[container-type:inline-size] overflow-hidden bg-[#262a35] sm:rounded-3xl sm:border-4 sm:border-ink/20">
        <iframe
          ref={frame}
          src={battleUrl(locale)}
          title={t("frameTitle")}
          allow="autoplay"
          className="block aspect-[10/9] w-full border-0 sm:aspect-auto sm:h-[min(90cqw,max(22rem,calc(100dvh-15rem)))]"
        />
      </div>
    </div>
  );
}
