import { expect, type Page } from "@playwright/test";
import { test } from "./fixtures";

async function startBattle(page: Page) {
  await page.goto("/ko");
  await page.getByRole("button", { name: /PRESS START/ }).click();
  await page.getByRole("button", { name: "건너뛰기", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "싸우다", exact: true }),
  ).toBeEnabled();
}

async function answerWrong(page: Page) {
  await page.getByRole("button", { name: "싸우다", exact: true }).click();
  await page.getByPlaceholder("포켓몬 이름").fill("미싱노");
  await page.getByRole("button", { name: "공격!", exact: true }).click();
}

test("힌트·HP를 새로고침 후 이어하고 넘기기를 세 번까지만 쓴다", async ({
  page,
  players,
}) => {
  await startBattle(page);
  const userId = await players.trackCurrent();
  const runId = await players.activeRunId();
  const hint = page.getByRole("button", { name: "힌트", exact: true });
  const skip = page.getByRole("button", { name: "넘기기", exact: true });

  await hint.click();
  await expect(hint).toBeDisabled();
  await answerWrong(page);
  await expect(page.getByText("HP 2/3", { exact: true })).toBeAttached();

  await page.reload();
  await page.getByRole("button", { name: /PRESS START/ }).click();
  await expect(hint).toBeDisabled();
  await expect(page.getByText("HP 2/3", { exact: true })).toBeAttached();
  expect(await players.trackCurrent()).toBe(userId);
  expect(await players.activeRunId()).toBe(runId);

  for (let used = 1; used <= 3; used++) {
    await skip.click();
    await expect(
      page.getByText(`${used + 1}번째 포켓몬`, { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(`넘기기 ${3 - used}/3`, { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("HP 3/3", { exact: true })).toBeAttached();
    await expect(hint).toBeEnabled();
  }
  await expect(skip).toBeDisabled();

  // Exhausted skips persist too; resuming must not replenish the allowance.
  await page.reload();
  await page.getByRole("button", { name: /PRESS START/ }).click();
  await expect(page.getByText("4번째 포켓몬", { exact: true })).toBeVisible();
  await expect(skip).toBeDisabled();
  expect(await players.activeRunId()).toBe(runId);
});

test("오답 세 번으로 게임을 끝내 기록에 저장하고 새 게임을 시작한다", async ({
  page,
  players,
}) => {
  await startBattle(page);
  const userId = await players.trackCurrent();
  const runId = await players.activeRunId();
  const name = await players.activeAnswer();

  for (const hp of [2, 1, 0]) {
    await answerWrong(page);
    if (hp > 0)
      await expect(
        page.getByText(`HP ${hp}/3`, { exact: true }),
      ).toBeAttached();
  }
  await expect(
    page.getByRole("heading", { name: "트레이너가 쓰러졌다!", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(`마지막 포켓몬은 ${name}`, { exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "다시 하기", exact: true }).click();
  await expect(page.getByText("1번째 포켓몬", { exact: true })).toBeVisible();
  await expect(page.getByText("HP 3/3", { exact: true })).toBeAttached();
  await expect(page.getByText("넘기기 3/3", { exact: true })).toBeVisible();
  expect(await players.trackCurrent()).toBe(userId);
  expect(await players.activeRunId()).not.toBe(runId);

  await page.getByRole("button", { name: "계정 메뉴" }).click();
  await page.getByRole("link", { name: "마이페이지", exact: true }).click();
  await expect(
    page
      .getByRole("region", { name: "최근 게임", exact: true })
      .getByText(/쓰러짐/),
  ).toBeVisible();
});
