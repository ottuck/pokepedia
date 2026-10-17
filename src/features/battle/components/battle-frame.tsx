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
    <div className="mx-auto w-full max-w-[640px] overflow-hidden rounded-2xl bg-[#0f380f] shadow-lg ring-1 ring-ink/10">
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
