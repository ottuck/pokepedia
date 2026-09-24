import { z } from "zod";

// Shape written by scripts/sync-pokemon (transform.ts `Evolution`). Parsed on read because
// the column is jsonb: the database does not enforce it.
export const evolutionSchema = z.object({
  trigger: z.string(),
  minLevel: z.number().int().optional(),
  item: z
    .object({
      slug: z.string(),
      ko: z.string(),
      en: z.string(),
      ja: z.string(),
    })
    .optional(),
});

export type Evolution = z.infer<typeof evolutionSchema>;

export type FamilyMember<T> = T & {
  id: number;
  evolves_from_id: number | null;
};

export type EvolutionStage<T> = Array<{
  member: FamilyMember<T>;
  evolution: Evolution | null;
}>;

/**
 * The evolution line containing `id`, as stages from the base form onwards. Branching lines
 * (Eevee) put every sibling in the same stage. Returns a single stage for Pokémon that
 * neither evolve nor evolve from anything.
 */
export function buildEvolutionStages<T>(
  all: ReadonlyArray<FamilyMember<T> & { evolution: unknown }>,
  id: number,
): EvolutionStage<T>[] {
  const byId = new Map(all.map((p) => [p.id, p]));
  const children = new Map<number, (typeof all)[number][]>();
  for (const p of all) {
    if (p.evolves_from_id === null) continue;
    children.set(p.evolves_from_id, [
      ...(children.get(p.evolves_from_id) ?? []),
      p,
    ]);
  }

  let root = byId.get(id);
  if (!root) throw new Error(`Pokémon #${id} is not in the list`);
  const seen = new Set<number>();
  while (root.evolves_from_id !== null && !seen.has(root.id)) {
    seen.add(root.id);
    const parent = byId.get(root.evolves_from_id);
    if (!parent) break;
    root = parent;
  }

  const stages: EvolutionStage<T>[] = [];
  let current = [root];
  while (current.length > 0) {
    stages.push(
      current.map((member) => ({
        member,
        evolution:
          member.evolution === null
            ? null
            : evolutionSchema.parse(member.evolution),
      })),
    );
    current = current
      .flatMap((member) => children.get(member.id) ?? [])
      .sort((a, b) => a.id - b.id);
  }
  return stages;
}
