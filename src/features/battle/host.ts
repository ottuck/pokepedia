import type { OwnedSticker } from "@/features/collection/summary";

/**
 * The Unity battle game (separate repo `pokepedia-unity`) runs on its own host inside an iframe.
 * Protocol v1 (pokepedia-unity docs/PROJECT.md §9.2): the game posts `ready` once it has loaded and
 * the player pressed START; the page answers with `init` carrying the stickers it owns. The game
 * decides which of them can battle, so the page sends every sticker.
 */
export const BATTLE_ORIGIN = "https://battle.pokepedia.dev";

/** Pokémon the player can battle with (Unity `roster.json` `playable`). */
export const BATTLE_PLAYABLE_IDS: readonly number[] = [25];

/** A new player's first quiz Pokémon, so that clearing it opens the battle (Pikachu). */
export const BATTLE_STARTER_ID = BATTLE_PLAYABLE_IDS[0];

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

/** The game's screen in game pixels (pokepedia-unity draws 240×216 and scales it by whole numbers). */
const GAME_W = 240;
const GAME_H = 216;
/**
 * Upper bound for the screen in CSS pixels. Bigger than this the low-res art (text, dithered
 * backgrounds) looks broken rather than retro (user feedback, 2026-10-17).
 */
export const BATTLE_MAX_WIDTH = 720;

/**
 * The iframe size that makes the game fill it at a whole-number scale on this screen: the
 * largest scale whose screen fits `maxWidth` × `maxHeight` CSS pixels (and BATTLE_MAX_WIDTH),
 * at least 1×. Two device pixels of slack keep rounding in the browser from dropping a step.
 */
export function fitBattleScreen(
  maxWidth: number,
  maxHeight: number,
  devicePixelRatio: number,
): { width: number; height: number; scale: number } {
  const dpr = devicePixelRatio > 0 ? devicePixelRatio : 1;
  // The slack comes out of the room on the page; the cap is on the screen itself.
  const width = Math.min(maxWidth * dpr - 2, BATTLE_MAX_WIDTH * dpr);
  const height = maxHeight * dpr - 2;
  const scale = Math.max(
    1,
    Math.floor(Math.min(width / GAME_W, height / GAME_H)),
  );
  return {
    width: (scale * GAME_W + 2) / dpr,
    height: (scale * GAME_H + 2) / dpr,
    scale,
  };
}
