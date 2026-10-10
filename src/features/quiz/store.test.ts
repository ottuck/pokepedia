import { beforeEach, expect, it, vi } from "vitest";
import { useQuizStore } from "./store";

const actions = vi.hoisted(() => ({
  startQuiz: vi.fn(),
  submitAnswer: vi.fn(),
  requestHint: vi.fn(),
  skipQuizRound: vi.fn(),
  fleeQuiz: vi.fn(),
}));
vi.mock("./actions", () => actions);
const run = {
  id: "run-1",
  status: "active" as const,
  score: 0,
  combo: 0,
  bestCombo: 0,
  roundsCleared: 0,
  skipsLeft: 3,
};
const round = {
  id: "round-1",
  seq: 1,
  hp: 3,
  hintUsed: false,
  mask: "???",
  hint: null,
  silhouetteUrl: "https://example.test/sil.webp",
};

beforeEach(() => {
  vi.resetAllMocks();
  useQuizStore.getState().reset();
  useQuizStore.setState({ phase: "menu", run, round });
});

it.each(["start", "hint", "skip", "flee"] as const)(
  "ignores a late %s response after reset",
  async (method) => {
    let respond!: (value: unknown) => void;
    const action = {
      start: actions.startQuiz,
      hint: actions.requestHint,
      skip: actions.skipQuizRound,
      flee: actions.fleeQuiz,
    }[method];
    action.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          respond = resolve;
        }),
    );
    const pending = useQuizStore.getState()[method]("ko");
    useQuizStore.getState().reset();
    respond({ ok: true, data: { run, round, nextRound: round } });
    await pending;
    expect(useQuizStore.getState()).toMatchObject({
      phase: "lobby",
      run: null,
      round: null,
    });
  },
);

it("does not revive a recovery request after sign-out", async () => {
  actions.submitAnswer.mockResolvedValueOnce({ ok: false, code: "conflict" });
  let respond!: (value: unknown) => void;
  actions.startQuiz.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        respond = resolve;
      }),
  );
  useQuizStore.getState().openAnswer();
  const pending = useQuizStore.getState().answer("피카츄", "ko");
  await vi.waitFor(() => expect(actions.startQuiz).toHaveBeenCalledOnce());
  useQuizStore.getState().reset();
  respond({ ok: true, data: { run, round } });
  await pending;
  expect(useQuizStore.getState().phase).toBe("lobby");
});

it("authentication failure returns to START instead of retrying an expired session", async () => {
  actions.submitAnswer.mockResolvedValueOnce({
    ok: false,
    code: "unauthenticated",
  });
  useQuizStore.getState().openAnswer();
  await useQuizStore.getState().answer("피카츄", "ko");
  expect(useQuizStore.getState()).toMatchObject({
    phase: "lobby",
    run: null,
    error: "unauthenticated",
  });
});

it("keeps a first guest sign-in and token refresh, but clears a different player's battle", () => {
  useQuizStore.setState({ phase: "starting", run: null, round: null });
  useQuizStore.getState().syncSessionUser(null);
  useQuizStore.getState().syncSessionUser("guest-1");
  useQuizStore.setState({ phase: "menu", run, round });
  useQuizStore.getState().syncSessionUser("guest-1");
  expect(useQuizStore.getState().run?.id).toBe(run.id);
  useQuizStore.getState().syncSessionUser("guest-2");
  expect(useQuizStore.getState().run).toBeNull();
});

it("clears a stale battle when returning without a session, even before its owner was loaded", () => {
  useQuizStore.getState().syncSessionUser(null);
  expect(useQuizStore.getState()).toMatchObject({
    phase: "lobby",
    run: null,
    round: null,
  });
});
