import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MotionGlobalConfig } from "motion/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import messages from "../../../../messages/ko.json";
import { useQuizStore } from "../store";
import type { RoundView, RunView } from "../types";
import { QuizGame } from "./quiz-game";

const actions = vi.hoisted(() => ({
  startQuiz: vi.fn(),
  submitAnswer: vi.fn(),
  requestHint: vi.fn(),
  skipQuizRound: vi.fn(),
  fleeQuiz: vi.fn(),
}));
vi.mock("../actions", () => actions);
vi.mock("@/lib/supabase/browser", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        maybeSingle: async () => ({ data: { nickname: "레드" } }),
      }),
    }),
  }),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, ...props }: { href: string }) => <a href={href} {...props} />,
}));

const run: RunView = {
  id: "run-1",
  status: "active",
  score: 0,
  combo: 0,
  bestCombo: 0,
  roundsCleared: 0,
  skipsLeft: 3,
};
const round = (id: string, overrides: Partial<RoundView> = {}): RoundView => ({
  id,
  seq: 1,
  hp: 3,
  hintUsed: false,
  mask: "???",
  hint: null,
  silhouetteUrl: "https://example.test/sil.webp",
  ...overrides,
});
const pikachu = {
  id: 25,
  name: "피카츄",
  artworkUrl: "https://example.test/025.webp",
};

function renderGame() {
  return render(
    <NextIntlClientProvider locale="ko" messages={messages}>
      <QuizGame />
    </NextIntlClientProvider>,
  );
}

/** Plays out the timed intro/hit/reveal phases. */
const finishAnimation = () => act(() => vi.runOnlyPendingTimers());

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.clearAllMocks();
  useQuizStore.getState().reset();
  // Returning player by default: PRESS START goes straight into the battle.
  localStorage.setItem("quiz-rules-seen", "1");
  actions.startQuiz.mockResolvedValue({
    ok: true,
    data: { run, round: round("r1") },
  });
});

async function startGame(user: ReturnType<typeof userEvent.setup>) {
  renderGame();
  await user.click(screen.getByRole("button", { name: /PRESS START/ }));
  expect(
    await screen.findByText("앗! 야생의 ???(이)가 튀어나왔다!"),
  ).toBeInTheDocument();
  await finishAnimation();
  expect(screen.getByText("무엇을 할까?")).toBeInTheDocument();
}

describe("QuizGame intro", () => {
  it("shows the rules before the first game, and starts the battle after the last page", async () => {
    localStorage.removeItem("quiz-rules-seen");
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderGame();

    await user.click(screen.getByRole("button", { name: /PRESS START/ }));
    expect(screen.getByText("룰 설명 1/5")).toBeInTheDocument();
    expect(actions.startQuiz).not.toHaveBeenCalled();

    // Each press finishes the printing line, the next one turns the page.
    for (let press = 0; press < 10; press++) await user.keyboard("{Enter}");

    expect(actions.startQuiz).toHaveBeenCalledWith({ locale: "ko" });
    expect(localStorage.getItem("quiz-rules-seen")).toBe("1");
  });

  it("lets the rules be skipped", async () => {
    localStorage.removeItem("quiz-rules-seen");
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderGame();

    await user.click(screen.getByRole("button", { name: /PRESS START/ }));
    await user.click(screen.getByRole("button", { name: "건너뛰기" }));

    expect(actions.startQuiz).toHaveBeenCalledOnce();
  });

  it("starts from the keyboard on the title screen", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderGame();

    await user.keyboard("{Enter}");

    expect(actions.startQuiz).toHaveBeenCalledOnce();
  });
});

describe("QuizGame", () => {
  it("starts from the lobby and shows only a silhouette and a name mask", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await startGame(user);

    expect(actions.startQuiz).toHaveBeenCalledWith({ locale: "ko" });
    expect(
      screen.getByRole("img", { name: "정체불명의 포켓몬" }),
    ).toBeInTheDocument();
    expect(screen.getByText("???")).toBeInTheDocument();
  });

  it("lets the player act during the entrance instead of waiting for it", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderGame();
    await user.click(screen.getByRole("button", { name: /PRESS START/ }));
    expect(
      await screen.findByText("앗! 야생의 ???(이)가 튀어나왔다!"),
    ).toBeInTheDocument();

    // Still in the entrance animation: choosing "fight" skips the rest of it.
    await user.click(screen.getByRole("button", { name: /싸우다/ }));

    expect(
      screen.getByRole("textbox", { name: "이름을 입력하세요." }),
    ).toBeInTheDocument();
  });

  it("shows the trainer's info box with nickname, level and HP", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await startGame(user);

    expect(await screen.findByText("레드")).toBeInTheDocument();
    expect(screen.getByText(":L5")).toBeInTheDocument();
    expect(screen.getByText("HP 3/3")).toBeInTheDocument();
  });

  it("picks the selected command with Z, like the A button", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    actions.fleeQuiz.mockResolvedValue({
      ok: true,
      data: { run: { ...run, status: "finished" }, revealed: pikachu },
    });
    await startGame(user);

    await user.keyboard("{ArrowDown}{ArrowRight}z");

    expect(actions.fleeQuiz).toHaveBeenCalledWith({ locale: "ko" });
  });

  it("loses HP on a wrong answer and returns to the menu", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    actions.submitAnswer.mockResolvedValue({
      ok: true,
      data: { outcome: "wrong", run, round: round("r1", { hp: 2 }) },
    });
    await startGame(user);

    await user.click(screen.getByRole("button", { name: /싸우다/ }));
    await user.type(
      screen.getByRole("textbox", { name: "이름을 입력하세요." }),
      "라이츄{Enter}",
    );

    expect(await screen.findByText("효과가 없는 것 같다…")).toBeInTheDocument();
    expect(screen.getByText("HP 2/3")).toBeInTheDocument();
    expect(actions.submitAnswer).toHaveBeenCalledWith({
      roundId: "r1",
      answer: "라이츄",
      locale: "ko",
    });
    await finishAnimation();
    expect(screen.getByText("무엇을 할까?")).toBeInTheDocument();
  });

  it("reveals the Pokémon, shows the sticker, then serves the next round", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    actions.submitAnswer.mockResolvedValue({
      ok: true,
      data: {
        outcome: "cleared",
        run: { ...run, score: 100, combo: 1, bestCombo: 1, roundsCleared: 1 },
        revealed: pikachu,
        scoreGained: 100,
        sticker: { variant: "normal", quantity: 1, isNew: true },
        nextRound: round("r2", { seq: 2, mask: "????" }),
      },
    });
    await startGame(user);

    await user.keyboard("1"); // shortcut for 싸우다
    await user.type(screen.getByRole("textbox"), "피카츄{Enter}");

    expect(await screen.findByText("정답! 피카츄!")).toBeInTheDocument();
    await finishAnimation();
    const card = screen.getByRole("dialog", { name: "피카츄" });
    expect(within(card).getByText(/새 띠부씰!/)).toBeInTheDocument();
    expect(within(card).getByText("+100점")).toBeInTheDocument();

    await user.click(within(card).getByRole("button", { name: "다음 포켓몬" }));
    expect(await screen.findByText("????")).toBeInTheDocument();
    expect(screen.getByText("2번째 포켓몬")).toBeInTheDocument();
    // One Pokémon named: the trainer grows a level.
    expect(screen.getByText(":L6")).toBeInTheDocument();
  });

  it("disables the item after the hint and shows half the name", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    actions.requestHint.mockResolvedValue({
      ok: true,
      data: { run, round: round("r1", { hintUsed: true, hint: "피??" }) },
    });
    await startGame(user);

    await user.keyboard("2");

    expect(await screen.findByText("피??")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /가방/ })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("moves through the menu with arrow keys", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await startGame(user);

    expect(screen.getByRole("button", { name: /싸우다/ })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", { name: /가방/ })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("button", { name: /도망치다/ })).toHaveFocus();
  });

  it("ends the run on the third miss with a summary", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    actions.submitAnswer.mockResolvedValue({
      ok: true,
      data: {
        outcome: "fainted",
        run: { ...run, status: "finished" },
        revealed: pikachu,
      },
    });
    await startGame(user);

    await user.keyboard("1");
    await user.type(screen.getByRole("textbox"), "모름{Enter}");
    expect(
      await screen.findByText("눈앞이 캄캄해졌다… 정답은 피카츄!"),
    ).toBeInTheDocument();
    await finishAnimation();

    expect(
      screen.getByRole("heading", { name: "트레이너가 쓰러졌다!" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("이번엔 띠부씰을 모으지 못했어요."),
    ).toBeInTheDocument();
  });

  it("recovers from a crashed request instead of hanging on “getting ready”", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    actions.startQuiz.mockRejectedValueOnce(new Error("500"));
    renderGame();

    await user.click(screen.getByRole("button", { name: /PRESS START/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "문제가 생겼어요",
    );
    expect(screen.getByRole("button", { name: /PRESS START/ })).toBeEnabled();
  });

  it("lets the player retry an answer after a server error", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    actions.submitAnswer.mockResolvedValueOnce({
      ok: false,
      code: "server_error",
    });
    await startGame(user);

    await user.keyboard("1");
    await user.type(screen.getByRole("textbox"), "피카츄{Enter}");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "문제가 생겼어요",
    );
    expect(screen.getByRole("textbox")).toBeEnabled();
  });

  it("stays in the lobby with a message when a guest session cannot start", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    actions.startQuiz.mockResolvedValueOnce({
      ok: false,
      code: "sign_in_failed",
    });
    renderGame();

    await user.click(screen.getByRole("button", { name: /PRESS START/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "게스트로 시작하지 못했어요",
    );
    expect(screen.getByRole("button", { name: /PRESS START/ })).toBeEnabled();
  });
});
