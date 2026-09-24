const HIRAGANA_START = 0x3041;
const HIRAGANA_END = 0x3096;
const KATAKANA_OFFSET = 0x60;

/**
 * Canonical form of a Pokémon name for answer matching. Used both when building
 * `answer_keys` at sync time and when grading a submitted answer, so the two always agree.
 *
 * - NFKC: full-width letters/digits and half-width katakana fold to their standard forms
 * - lowercase: "PIKACHU" = "pikachu"
 * - hiragana → katakana: "ぴかちゅう" = "ピカチュウ"
 * - letters and digits only: drops spaces, punctuation and ♀/♂ ("Mr. Mime" → "mrmime",
 *   "Farfetch'd" → "farfetchd", "니드런♀" → "니드런"). The long-vowel mark ー is kept.
 */
export function normalizeAnswer(input: string): string {
  const folded = input.normalize("NFKC").toLowerCase();

  let result = "";
  for (const char of folded) {
    const code = char.codePointAt(0)!;
    const kana =
      code >= HIRAGANA_START && code <= HIRAGANA_END
        ? String.fromCodePoint(code + KATAKANA_OFFSET)
        : char;
    if (/[\p{L}\p{N}ー]/u.test(kana)) result += kana;
  }
  return result;
}
