/**
 * Share of met Pokémon that were named. Skipped rounds (including the one left behind by
 * fleeing) are not counted: the player never gave up on them by answering wrong.
 * Null before the first answered round.
 */
export function clearRate(cleared: number, failed: number): number | null {
  const answered = cleared + failed;
  return answered === 0 ? null : cleared / answered;
}
