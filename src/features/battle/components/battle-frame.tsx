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
    // Phones: edge to edge. The game scales its pixels by whole numbers, so the extra width
    // often reaches the next scale step (a 375px phone at 2x: 343px → 2x, 375px → 3x).
    <div className="-mx-4 w-[calc(100%+2rem)] overflow-hidden bg-[#0f380f] sm:mx-auto sm:w-full sm:max-w-[640px] sm:rounded-2xl sm:shadow-lg sm:ring-1 sm:ring-ink/10">
      <iframe
        ref={frame}
        src={battleUrl(locale)}
        title={t("frameTitle")}
        allow="autoplay"
        className="block aspect-[10/9] w-full border-0"
      />
    </div>
  );
}
