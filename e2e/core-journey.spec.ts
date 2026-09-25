import { existsSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/database.types";

// Locally the keys come from .env.local; CI exports them from `supabase status -o env`.
if (!process.env.SUPABASE_SECRET_KEY && existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

/**
 * The answer to the round in play. Players can never read it (RLS hides active rounds), so
 * the test asks the local database directly with the secret key.
 */
async function activeAnswer() {
  const admin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );
  const { data, error } = await admin
    .from("quiz_round")
    .select("pokemon(name_ko)")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (error) throw error;
  return data.pokemon.name_ko;
}

test("도감 → 상세 → 언어 전환 → 게임(오답·정답) → 컬렉션", async ({ page }) => {
  // Dex: search, open a detail page, then switch its language.
  await page.goto("/ko");
  await page.getByRole("searchbox", { name: "포켓몬 검색" }).fill("피카츄");
  await page.getByRole("heading", { name: "피카츄", level: 2 }).click();
  await expect(page).toHaveURL(/\/ko\/pokemon\/25$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("피카츄");

  await page.getByRole("link", { name: "English" }).click();
  await expect(page).toHaveURL(/\/en\/pokemon\/25$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Pikachu",
  );

  // Game: the first visit starts a guest session and shows the rules once.
  await page.goto("/ko/quiz");
  await page.getByText("PRESS START").click();
  await page.getByRole("button", { name: "건너뛰기" }).click();

  const fight = page.getByRole("button", { name: /싸우다/ });
  const answer = page.getByPlaceholder("포켓몬 이름");
  const attack = page.getByRole("button", { name: "공격!" });

  // A wrong answer costs one HP.
  await fight.click();
  await answer.fill("미싱노");
  await attack.click();
  await expect(page.getByText("효과가 없는 것 같다…")).toBeVisible();
  await expect(page.getByText("HP 2/3")).toBeAttached();

  // The right answer wins that Pokémon's sticker.
  const name = await activeAnswer();
  await fight.click();
  await answer.fill(name);
  await attack.click();
  await expect(page.getByText(`정답! ${name}!`)).toBeVisible();
  await expect(page.getByText(/새 띠부씰!|띠부씰 ×/)).toBeVisible();

  // Collection: the sticker is there.
  await page.goto("/ko/collection");
  await expect(
    page.getByRole("link", { name: new RegExp(name) }),
  ).toBeVisible();
});
