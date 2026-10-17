import type { OwnedSticker } from "@/features/collection/summary";

/**
 * The Unity battle game (separate repo `pokepedia-unity`) runs on its own host inside an iframe.
 * Protocol v1 (pokepedia-unity docs/PROJECT.md §9.2): the game posts `ready` once it has loaded and
 * the player pressed START; the page answers with `init` carrying the stickers it owns. The game
 * decides which of them can battle, so the page sends every sticker.
 */
export const BATTLE_ORIGIN = "https://battle.pokepedia.dev";

export type BattleSticker = { id: number; shiny: boolean };

export type BattleInit = {
  type: "init";
  v: 1;
  locale: string;
  owned: BattleSticker[];
};

export function battleUrl(locale: string): string {
  return `${BATTLE_ORIGIN}/?host=pokepedia&lang=${encodeURIComponent(locale)}`;
}

export function toBattleStickers(
  stickers: readonly OwnedSticker[],
): BattleSticker[] {
  return stickers.map((s) => ({
    id: s.pokemon_id,
    shiny: s.variant === "shiny",
  }));
}

/**
 * The `init` to send for a message from the game, or null when it must be ignored: another
 * origin (any page can post to this window) or anything but a v1 `ready`.
 */
export function initFor(
  event: { origin: string; data: unknown },
  locale: string,
  owned: BattleSticker[],
): BattleInit | null {
  if (event.origin !== BATTLE_ORIGIN) return null;
  const data = event.data as { type?: unknown; v?: unknown } | null;
  if (typeof data !== "object" || data === null) return null;
  if (data.type !== "ready" || data.v !== 1) return null;
  return { type: "init", v: 1, locale, owned };
}
