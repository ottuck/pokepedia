"use server";

import { z } from "zod";
import { artworkUrl, silhouetteUrl } from "@/features/pokemon/assets";
import { routing } from "@/i18n/routing";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseQuizRepository } from "./repository.supabase";
import { createQuizService } from "./service";
import type {
  ActionResult,
  AnswerResult,
  FleeResult,
  QuizState,
  RoundView,
  RunView,
  SkipResult,
} from "./types";

// Server Actions are public POST endpoints: every input is validated, and the player is always
// the one in the session cookie, never an id from the request.

const locale = z.enum(routing.locales);
const roundInput = z.object({ roundId: z.uuid(), locale });
const answerInput = roundInput.extend({ answer: z.string().max(40) });
const localeInput = z.object({ locale });

/** Uniform [0, 1) from the platform CSPRNG, so sticker rolls are not predictable. */
function secureRandom(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
}

function quizService() {
  return createQuizService({
    repo: createSupabaseQuizRepository(createAdminClient()),
    random: secureRandom,
    urls: { artwork: artworkUrl, silhouette: silhouetteUrl },
  });
}

/** The verified user id from the session, or null. */
async function sessionUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims.sub ?? null;
}

const invalid = { ok: false, code: "invalid_input" } as const;
const unauthenticated = { ok: false, code: "unauthenticated" } as const;

/**
 * PLAY: resumes the player's run or starts one. Visitors without a session become anonymous
 * players here, so the game needs no sign-up (they can link Google later).
 */
export async function startQuiz(
  input: unknown,
): Promise<ActionResult<QuizState>> {
  const parsed = localeInput.safeParse(input);
  if (!parsed.success) return invalid;

  let userId = await sessionUserId();
  if (!userId) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error || !data.user) return { ok: false, code: "sign_in_failed" };
    userId = data.user.id;
  }
  return quizService().startOrResume(userId, parsed.data.locale);
}

export async function submitAnswer(
  input: unknown,
): Promise<ActionResult<AnswerResult>> {
  const parsed = answerInput.safeParse(input);
  if (!parsed.success) return invalid;
  const userId = await sessionUserId();
  if (!userId) return unauthenticated;
  const { roundId, answer, locale } = parsed.data;
  return quizService().answer(userId, roundId, answer, locale);
}

export async function requestHint(
  input: unknown,
): Promise<ActionResult<{ run: RunView; round: RoundView }>> {
  const parsed = roundInput.safeParse(input);
  if (!parsed.success) return invalid;
  const userId = await sessionUserId();
  if (!userId) return unauthenticated;
  return quizService().hint(userId, parsed.data.roundId, parsed.data.locale);
}

export async function skipQuizRound(
  input: unknown,
): Promise<ActionResult<SkipResult>> {
  const parsed = roundInput.safeParse(input);
  if (!parsed.success) return invalid;
  const userId = await sessionUserId();
  if (!userId) return unauthenticated;
  return quizService().skip(userId, parsed.data.roundId, parsed.data.locale);
}

export async function fleeQuiz(
  input: unknown,
): Promise<ActionResult<FleeResult>> {
  const parsed = localeInput.safeParse(input);
  if (!parsed.success) return invalid;
  const userId = await sessionUserId();
  if (!userId) return unauthenticated;
  return quizService().flee(userId, parsed.data.locale);
}
