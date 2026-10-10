import { expect } from "@playwright/test";
import { test } from "./fixtures";

test("도감 → 상세 → 언어 전환 → 게임(오답·정답) → 컬렉션", async ({
  page,
  players,
}) => {
  // Dex: search, open a detail page, then switch its language.
  await page.goto("/ko/pokedex");
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
  await page.goto("/ko");
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
  const name = await players.activeAnswer();
  // A newer active round from another player must not become this browser's answer.
  await players.createOtherRun(name === "피카츄" ? 26 : 25);
  expect(await players.activeAnswer()).toBe(name);
  await fight.click();
  await answer.fill(name);
  await attack.click();
  await expect(page.getByText(`정답! ${name}!`)).toBeVisible();
  await expect(page.getByRole("dialog", { name, exact: true })).toBeVisible();

  // Collection: the sticker is there.
  await page.goto("/ko/collection");
  await expect(
    page.getByRole("link", { name: new RegExp(name) }),
  ).toBeVisible();
});

test("게임 중 게스트 로그아웃 → 타이틀 → 새 게스트로 다시 시작", async ({
  page,
  players,
}) => {
  await page.goto("/ko");
  await page.getByText("PRESS START").click();
  await page.getByRole("button", { name: "건너뛰기", exact: true }).click();
  const fight = page.getByRole("button", { name: "싸우다", exact: true });
  await expect(fight).toBeVisible();
  await players.trackCurrent();

  await page.getByRole("button", { name: "계정 메뉴" }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "게스트 나가기" }).click();
  await expect(
    page.getByRole("button", { name: "Google로 로그인" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /PRESS START/ })).toBeVisible();
  await expect(fight).toHaveCount(0);

  await page.getByText("PRESS START").click();
  await fight.click();
  await page.getByPlaceholder("포켓몬 이름").fill("미싱노");
  await page.getByRole("button", { name: "공격!", exact: true }).click();
  await expect(page.getByText("HP 2/3")).toBeAttached();
  await players.trackCurrent();

  // Signing out on another page must also clear the stored battle when returning.
  await page.getByRole("link", { name: "컬렉션", exact: true }).click();
  await page.getByRole("button", { name: "계정 메뉴" }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "게스트 나가기" }).click();
  await expect(
    page.getByRole("button", { name: "Google로 로그인" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "게임", exact: true }).click();
  await expect(page.getByRole("button", { name: /PRESS START/ })).toBeVisible();
  await expect(fight).toHaveCount(0);
});

test("다른 탭에서 종료한 배틀의 명령은 새 게임 없이 타이틀로 돌아간다", async ({
  page,
  context,
  players,
}) => {
  await page.goto("/ko");
  await page.getByText("PRESS START").click();
  await page.getByRole("button", { name: "건너뛰기", exact: true }).click();
  const fight = page.getByRole("button", { name: "싸우다", exact: true });
  await expect(fight).toBeVisible();
  await players.trackCurrent();

  const other = await context.newPage();
  await other.goto("/ko");
  await other.getByText("PRESS START").click();
  await other.getByRole("button", { name: "도망치다", exact: true }).click();
  await expect(other.getByText("무사히 도망쳤다!")).toBeVisible();

  await fight.click();
  await page.getByPlaceholder("포켓몬 이름").fill("미싱노");
  await page.getByRole("button", { name: "공격!", exact: true }).click();
  await expect(page.getByRole("button", { name: /PRESS START/ })).toBeVisible();
  await expect(fight).toHaveCount(0);
});

for (const fromOtherTab of [false, true]) {
  test(`마이페이지 로그아웃 후 개인 기록 갱신 (${fromOtherTab ? "다른 탭" : "현재 탭"})`, async ({
    page,
    context,
    players,
  }) => {
    await page.goto("/ko");
    await page.getByText("PRESS START").click();
    await page.getByRole("button", { name: "건너뛰기", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "싸우다", exact: true }),
    ).toBeVisible();
    await players.trackCurrent();
    await page.goto("/ko/me");
    await expect(
      page.getByRole("button", { name: "닉네임 변경" }),
    ).toBeVisible();

    const signOutPage = fromOtherTab ? await context.newPage() : page;
    if (fromOtherTab) await signOutPage.goto("/ko/collection");
    await signOutPage.getByRole("button", { name: "계정 메뉴" }).click();
    signOutPage.once("dialog", (dialog) => dialog.accept());
    await signOutPage.getByRole("button", { name: "게스트 나가기" }).click();
    await expect(
      page.getByRole("button", { name: "Google로 로그인" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "아직 기록이 없어요" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "닉네임 변경" })).toHaveCount(
      0,
    );
  });
}
