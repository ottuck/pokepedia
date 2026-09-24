import { DotGothic16 } from "next/font/google";
import localFont from "next/font/local";

/**
 * Pixel fonts for the battle screen, loaded only where the quiz renders.
 * Galmuri11 Bold (OFL, src/fonts/Galmuri-OFL.txt) covers all 11,172 Hangul syllables and Latin
 * in 166 KB; it is the only weight shipped, declared as a range so the browser never fakes bold.
 * It has no kana, so Japanese falls through to DotGothic16, fetched only when kana are drawn.
 */
export const galmuri = localFont({
  src: "../../fonts/Galmuri11-Bold.woff2",
  weight: "100 900",
  variable: "--font-galmuri",
  display: "swap",
});

export const dotGothic = DotGothic16({
  weight: "400",
  variable: "--font-dotgothic",
  preload: false,
  display: "swap",
});
