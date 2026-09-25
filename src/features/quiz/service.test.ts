import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ActiveRunExistsError,
  QuizConflictError,
  type CommitInput,
  type QuizRepository,
} from "./repository";
import { RULES } from "./rules";
import { createQuizService } from "./service";
import type { PokemonNames, RoundRecord, RunRecord } from "./types";

const POKEMON: PokemonNames[] = [
  {
    id: 25,
    name_ko: "피카츄",
    name_en: "Pikachu",
    name_ja: "ピカチュウ",
    artwork_path: "normal/025.webp",
    shiny_artwork_path: "shiny/025.webp",
  },
  {
    id: 26,
    name_ko: "라이츄",
    name_en: "Raichu",
    name_ja: "ライチュウ",
    artwork_path: "normal/026.webp",
    shiny_artwork_path: "shiny/026.webp",
  },
  {
    id: 151,
    name_ko: "뮤",
    name_en: "Mew",
    name_ja: "ミュウ",
    artwork_path: "normal/151.webp",
    shiny_artwork_path: "shiny/151.webp",
  },
];
const KEYS: Record<number, string[]> = {
  25: ["피카츄", "pikachu", "ピカチュウ"],
  26: ["라이츄", "raichu", "ライチュウ"],
  151: ["뮤", "mew", "ミュウ"],
};

/**
 * Mirrors the database semantics that matter to the service: one active run per player,
 * version-checked commits, sticker counts, next round creation, and per-user scoping.
 */
class InMemoryQuizRepository implements QuizRepository {
  runs = new Map<
    string,
    RunRecord & { userId: string; endReason: string | null }
  >();
  rounds = new Map<
    string,
    RoundRecord & { userId: string; pokemonId: number }
  >();
  stickers = new Map<string, number>();
  private ids = 0;

  private id = () => `id-${++this.ids}`;

  async findActiveRun(userId: string) {
    const run = [...this.runs.values()].find(
      (r) => r.userId === userId && r.status === "active",
    );
    if (!run) return null;
    const round = [...this.rounds.values()].find(
      (r) => r.runId === run.id && r.status === "active",
    )!;
    return { run: strip(run), round: strip(round) };
  }
  async findRound(userId: string, roundId: string) {
    const round = this.rounds.get(roundId);
    if (!round || round.userId !== userId) return null;
    return { run: strip(this.runs.get(round.runId)!), round: strip(round) };
  }
  async findRoundSecret(userId: string, roundId: string) {
    const round = this.rounds.get(roundId);
    if (!round || round.userId !== userId) return null;
    return {
      pokemonId: round.pokemonId,
      answerKeys: KEYS[round.pokemonId],
      silhouettePath: `sil-${round.pokemonId}.webp`,
    };
  }
  async seenPokemonIds(userId: string, roundId: string) {
    const round = this.rounds.get(roundId);
    if (!round || round.userId !== userId) return new Set<number>();
    return new Set(
      [...this.rounds.values()]
        .filter((r) => r.runId === round.runId)
        .map((r) => r.pokemonId),
    );
  }
  async allPokemonIds() {
    return POKEMON.map((p) => p.id);
  }
  async pokemonNames(pokemonId: number) {
    return POKEMON.find((p) => p.id === pokemonId)!;
  }
  async startRun(userId: string, pokemonId: number) {
    if (await this.findActiveRun(userId)) throw new ActiveRunExistsError();
    const runId = this.id();
    this.runs.set(runId, {
      id: runId,
      userId,
      endReason: null,
      status: "active",
      score: 0,
      combo: 0,
      bestCombo: 0,
      roundsCleared: 0,
      skipsLeft: RULES.skipsPerRun,
    });
    const roundId = this.addRound(userId, runId, 1, pokemonId);
    return { runId, roundId };
  }
  async commit(input: CommitInput) {
    const stored = this.rounds.get(input.round.id);
    if (
      !stored ||
      stored.userId !== input.userId ||
      stored.status !== "active" ||
      stored.version !== input.round.version
    ) {
      throw new QuizConflictError();
    }
    this.rounds.set(stored.id, {
      ...stored,
      ...input.round,
      version: stored.version + 1,
    });
    const run = this.runs.get(stored.runId)!;
    this.runs.set(run.id, { ...run, ...input.run, endReason: input.endReason });

    let stickerQuantity: number | null = null;
    if (input.sticker) {
      const key = `${input.userId}:${stored.pokemonId}:${input.sticker}`;
      stickerQuantity = (this.stickers.get(key) ?? 0) + 1;
      this.stickers.set(key, stickerQuantity);
    }
    const nextRoundId =
      input.nextPokemonId === null
        ? null
        : this.addRound(
            input.userId,
            run.id,
            stored.seq + 1,
            input.nextPokemonId,
          );
    return { stickerQuantity, nextRoundId };
  }

  private addRound(
    userId: string,
    runId: string,
    seq: number,
    pokemonId: number,
  ) {
    const id = this.id();
    this.rounds.set(id, {
      id,
      runId,
      userId,
      seq,
      pokemonId,
      status: "active",
      hp: 3,
      attempts: 0,
      hintUsed: false,
      version: 0,
    });
    return id;
  }
}

/** Drops the storage-only fields the repository never returns. */
function strip(record: object) {
  const hidden = new Set(["userId", "pokemonId", "endReason"]);
  return Object.fromEntries(
    Object.entries(record).filter(([key]) => !hidden.has(key)),
  ) as never;
}

const urls = {
  artwork: (p: string) => `art/${p}`,
  silhouette: (p: string) => `sil/${p}`,
};
// First pick is index 0 (Pikachu); the variant roll never hits shiny.
const random = () => 0.99;
const firstPick = () => 0;

let repo: InMemoryQuizRepository;
beforeEach(() => {
  repo = new InMemoryQuizRepository();
});

function service(rng: () => number = random) {
  return createQuizService({ repo, random: rng, urls });
}

async function start(userId = "ash") {
  const result = await service(firstPick).startOrResume(userId, "ko");
  if (!result.ok) throw new Error(result.code);
  return result.data;
}

describe("startOrResume", () => {
  it("starts a run whose round shows only a silhouette and a name mask", async () => {
    const state = await start();

    expect(state.run).toMatchObject({
      status: "active",
      score: 0,
      skipsLeft: 3,
    });
    expect(state.round).toEqual({
      id: expect.any(String),
      seq: 1,
      hp: 3,
      hintUsed: false,
      mask: "???",
      hint: null,
      silhouetteUrl: "sil/sil-25.webp",
    });
    // Nothing that names the answer may reach the browser while the round is in play.
    const sent = JSON.stringify(state);
    for (const leak of [
      "피카츄",
      "Pikachu",
      "ピカチュウ",
      "normal/025",
      "pokemonId",
    ]) {
      expect(sent).not.toContain(leak);
    }
  });

  it("resumes the run in progress instead of starting another", async () => {
    const first = await start();
    const again = await start();
    expect(again.round.id).toBe(first.round.id);
    expect(repo.runs.size).toBe(1);
  });
});

describe("answer", () => {
  it("costs HP on a wrong answer and keeps the same round", async () => {
    const { round } = await start();
    const result = await service().answer("ash", round.id, "라이츄", "ko");

    expect(result).toMatchObject({
      ok: true,
      data: {
        outcome: "wrong",
        run: { combo: 0 },
        round: { id: round.id, hp: 2 },
      },
    });
  });

  it("clears with the name in any language, rewards a sticker and serves the next round", async () => {
    const { round } = await start();
    const result = await service().answer("ash", round.id, "Pikachu", "ja");
    if (!result.ok || result.data.outcome !== "cleared")
      throw new Error("expected clear");

    expect(result.data).toMatchObject({
      run: { score: 100, combo: 1, roundsCleared: 1 },
      revealed: {
        id: 25,
        name: "ピカチュウ",
        artworkUrl: "art/normal/025.webp",
      },
      scoreGained: 100,
      sticker: { variant: "normal", quantity: 1, isNew: true },
      nextRound: { seq: 2, hp: 3 },
    });
    expect(result.data.nextRound.id).not.toBe(round.id);
    expect(repo.stickers.get("ash:25:normal")).toBe(1);
  });

  it("shows the shiny artwork when the roll lands shiny", async () => {
    const { round } = await start();
    const result = await service(() => 0).answer(
      "ash",
      round.id,
      "피카츄",
      "ko",
    );

    expect(result).toMatchObject({
      ok: true,
      data: {
        sticker: { variant: "shiny" },
        revealed: { artworkUrl: "art/shiny/025.webp" },
      },
    });
  });

  it("reveals the answer and ends the run on the third miss", async () => {
    const { round } = await start();
    await service().answer("ash", round.id, "x", "ko");
    await service().answer("ash", round.id, "y", "ko");
    const result = await service().answer("ash", round.id, "z", "ko");

    expect(result).toMatchObject({
      ok: true,
      data: {
        outcome: "fainted",
        run: { status: "finished" },
        revealed: { name: "피카츄" },
      },
    });
    expect([...repo.runs.values()][0].endReason).toBe("fainted");
  });

  it("does not let another player answer your round", async () => {
    const { round } = await start("ash");
    expect(await service().answer("gary", round.id, "피카츄", "ko")).toEqual({
      ok: false,
      code: "not_found",
    });
  });

  it("refuses an answer to a round that is already over", async () => {
    const { round } = await start();
    await service().answer("ash", round.id, "피카츄", "ko");
    expect(await service().answer("ash", round.id, "피카츄", "ko")).toEqual({
      ok: false,
      code: "round_not_active",
    });
  });

  it("reports a conflict when the round changed underneath", async () => {
    const { round } = await start();
    const stored = repo.rounds.get(round.id)!;
    const originalFind = repo.findRound.bind(repo);
    // Simulate a concurrent request committing between this request's read and write.
    repo.findRound = async (...args) => {
      const found = await originalFind(...args);
      repo.rounds.set(round.id, { ...stored, version: stored.version + 1 });
      return found;
    };

    expect(await service().answer("ash", round.id, "피카츄", "ko")).toEqual({
      ok: false,
      code: "conflict",
    });
    expect(repo.stickers.size).toBe(0);
  });
});

describe("hint / skip / flee", () => {
  it("reveals half the name once and breaks the combo", async () => {
    const { round } = await start();
    const hinted = await service().hint("ash", round.id, "ko");

    expect(hinted).toMatchObject({
      ok: true,
      data: { round: { hintUsed: true, hint: "피??" } },
    });
    expect(await service().hint("ash", round.id, "ko")).toEqual({
      ok: false,
      code: "hint_already_used",
    });
  });

  it("skips to a new Pokémon, shows who it was, and spends a skip", async () => {
    const { round } = await start();
    const skipped = await service().skip("ash", round.id, "en");

    expect(skipped).toMatchObject({
      ok: true,
      data: {
        run: { skipsLeft: 2 },
        revealed: { name: "Pikachu" },
        nextRound: { seq: 2 },
      },
    });
  });

  it("flees the run in progress and reveals the answer", async () => {
    await start();
    const fled = await service().flee("ash", "ko");

    expect(fled).toMatchObject({
      ok: true,
      data: { run: { status: "finished" }, revealed: { id: 25 } },
    });
    expect([...repo.runs.values()][0].endReason).toBe("fled");
    expect(await service().flee("ash", "ko")).toEqual({
      ok: false,
      code: "run_not_active",
    });
  });

  it("never repeats a Pokémon within a run until all have appeared", async () => {
    let { round } = await start();
    const seen = [];
    for (let i = 0; i < POKEMON.length; i++) {
      const secret = await repo.findRoundSecret("ash", round.id);
      seen.push(secret!.pokemonId);
      const result = await service(firstPick).skip("ash", round.id, "ko");
      if (!result.ok) {
        expect(result.code).toBe("no_skips_left"); // 3 skips for 3 Pokémon
        break;
      }
      round = result.data.nextRound;
    }
    expect(new Set(seen).size).toBe(seen.length);
  });
});

/**
 * Each storage call is a network round trip in production (the function and the database
 * are in different places), so a click costs one round trip per *sequential* wait. This
 * counts those waits: every call takes one tick; concurrent calls share it. Catalog reads
 * are excluded because the Supabase repository serves them from memory.
 */
async function sequentialRoundTrips(action: () => Promise<unknown>) {
  const tick = 100;
  const delayed = [
    "findActiveRun",
    "findRound",
    "findRoundSecret",
    "seenPokemonIds",
    "startRun",
    "commit",
  ] as const;
  const originals = delayed.map((name) => [name, repo[name]] as const);
  for (const [name, original] of originals) {
    (repo as unknown as Record<string, unknown>)[name] = async (
      ...args: unknown[]
    ) => {
      await new Promise((resolve) => setTimeout(resolve, tick));
      return (original as (...a: unknown[]) => unknown).apply(repo, args);
    };
  }
  vi.useFakeTimers();
  try {
    let settled = false;
    const done = action().finally(() => (settled = true));
    let trips = 0;
    while (!settled) {
      await vi.advanceTimersByTimeAsync(tick);
      trips++;
    }
    await done;
    return trips;
  } finally {
    vi.useRealTimers();
    for (const [name, original] of originals) {
      (repo as unknown as Record<string, unknown>)[name] = original;
    }
  }
}

describe("round trips per click", () => {
  it("a clear waits on three: load (round, answer, seen), commit, next round", async () => {
    const { round } = await start();

    const trips = await sequentialRoundTrips(() =>
      service().answer("ash", round.id, "피카츄", "ko"),
    );

    expect(trips).toBe(3);
  });

  it("a wrong answer and a hint wait on two: load, commit", async () => {
    const { round } = await start();

    expect(
      await sequentialRoundTrips(() =>
        service().answer("ash", round.id, "라이츄", "ko"),
      ),
    ).toBe(2);
    expect(
      await sequentialRoundTrips(() => service().hint("ash", round.id, "ko")),
    ).toBe(2);
  });
});
