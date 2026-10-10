import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MotionGlobalConfig } from "motion/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import messages from "../../../../messages/ko.json";
import { useQuizStore } from "../store";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import type { RoundView, RunView } from "../types";
import { QuizGame } from "./quiz-game";

const actions = vi.hoisted(() => ({
  startQuiz: vi.fn(),
  submitAnswer: vi.fn(),
  requestHint: vi.fn(),
  skipQuizRound: vi.fn(),
  fleeQuiz: vi.fn(),
}));
const auth = vi.hoisted(() => ({
  listener: null as
    ((event: AuthChangeEvent, session: Session | null) => void) | null,
  getClaims: vi.fn(),
  unsubscribe: vi.fn(),
}));
vi.mock("../actions", () => actions);
vi.mock("@/lib/supabase/browser", () => ({
  createClient: () => ({
    auth: {
      getClaims: auth.getClaims,
      onAuthStateChange: (listener: typeof auth.listener) => {
        auth.listener = listener;
        return { data: { subscription: { unsubscribe: auth.unsubscribe } } };
      },
    },
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
  auth.listener = null;
  auth.getClaims.mockResolvedValue({ data: { claims: { sub: "guest-1" } } });
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

describe("QuizGame", () => {
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

  it("returns to a usable title when conflict recovery fails, then resumes on START", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await startGame(user);
    actions.submitAnswer.mockResolvedValueOnce({ ok: false, code: "conflict" });
    actions.startQuiz.mockRejectedValueOnce(new Error("network down"));

    await user.click(screen.getByRole("button", { name: "싸우다" }));
    await user.type(screen.getByRole("textbox"), "피카츄{Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "문제가 생겼어요",
    );
    expect(screen.getByRole("button", { name: /PRESS START/ })).toBeEnabled();

    actions.startQuiz.mockResolvedValueOnce({
      ok: true,
      data: { run, round: round("r2") },
    });
    await user.click(screen.getByRole("button", { name: /PRESS START/ }));
    await finishAnimation();
    expect(screen.getByRole("button", { name: "싸우다" })).toBeInTheDocument();
    expect(useQuizStore.getState().round?.id).toBe("r2");
  });

  it("sign-out clears the battle and a late answer cannot bring it back", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await startGame(user);
    let respond!: (value: unknown) => void;
    actions.submitAnswer.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          respond = resolve;
        }),
    );
    await user.click(screen.getByRole("button", { name: "싸우다" }));
    await user.type(screen.getByRole("textbox"), "피카츄{Enter}");
    expect(useQuizStore.getState().phase).toBe("judging");

    act(() => auth.listener?.("SIGNED_OUT", null));
    expect(
      screen.getByRole("button", { name: /PRESS START/ }),
    ).toBeInTheDocument();
    await act(async () => {
      respond({
        ok: true,
        data: { outcome: "wrong", run, round: round("r1", { hp: 2 }) },
      });
    });
    expect(
      screen.getByRole("button", { name: /PRESS START/ }),
    ).toBeInTheDocument();
    expect(useQuizStore.getState().run).toBeNull();
  });

  it("keeps the other commands usable while the answer box is open", async () => {
    // On phones the box's cancel link could end up out of view, leaving no way out.
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    actions.requestHint.mockResolvedValueOnce({
      ok: true,
      data: { run, round: round("r1", { hintUsed: true, hint: "피?" }) },
    });
    await startGame(user);

    await user.click(screen.getByRole("button", { name: "싸우다" }));
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "힌트" }));

    expect(actions.requestHint).toHaveBeenCalledOnce();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});
