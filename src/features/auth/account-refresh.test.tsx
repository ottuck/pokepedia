import { act, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, expect, it, vi } from "vitest";
import messages from "../../../messages/ko.json";
import { MyRank } from "../leaderboard/components/my-rank";
import { MyStickerBadge } from "../pokemon/components/detail/my-sticker-badge";
import { useTrainerName } from "../quiz/components/use-trainer-name";
import { announceAccountChange } from "./account-events";

const mocks = vi.hoisted(() => ({
  getClaims: vi.fn(),
  rank: vi.fn(),
  read: vi.fn(),
}));
vi.mock("@/lib/supabase/browser", () => ({
  createClient: () => ({
    auth: { getClaims: mocks.getClaims },
    rpc: mocks.rank,
    from: () => ({
      select: () => ({
        maybeSingle: mocks.read,
        eq: () => ({ eq: mocks.read }),
      }),
    }),
  }),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, ...props }: { href: string }) => <a href={href} {...props} />,
}));

function deferred() {
  let respond!: (value: unknown) => void;
  const promise = new Promise((resolve) => {
    respond = resolve;
  });
  return { promise, respond };
}
const renderWidget = (widget: React.ReactNode) =>
  render(
    <NextIntlClientProvider locale="ko" messages={messages}>
      {widget}
    </NextIntlClientProvider>,
  );

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getClaims.mockResolvedValue({ data: { claims: { sub: "guest-1" } } });
});

it("does not restore the old player's rank after sign-out", async () => {
  const old = deferred();
  mocks.rank.mockReturnValueOnce(old.promise);
  renderWidget(<MyRank />);
  await waitFor(() => expect(mocks.rank).toHaveBeenCalledOnce());
  mocks.getClaims.mockResolvedValue({ data: null });
  act(announceAccountChange);
  await screen.findByText(messages.leaderboard.mine.signedOut);
  await act(async () =>
    old.respond({ data: [{ rank: 1, score: 999, best_combo: 5 }] }),
  );
  expect(
    screen.getByText(messages.leaderboard.mine.signedOut),
  ).toBeInTheDocument();
});

it("does not restore the old player's sticker badge after sign-out", async () => {
  const old = deferred();
  mocks.read.mockReturnValueOnce(old.promise);
  const { container } = renderWidget(<MyStickerBadge pokemonId={25} />);
  await waitFor(() => expect(mocks.read).toHaveBeenCalledOnce());
  mocks.getClaims.mockResolvedValue({ data: null });
  await act(async () => announceAccountChange());
  await act(async () =>
    old.respond({ data: [{ variant: "normal", quantity: 1 }] }),
  );
  expect(container).toBeEmptyDOMElement();
});

it("keeps a refreshed trainer nickname when an older read completes last", async () => {
  const old = deferred();
  mocks.read.mockReturnValueOnce(old.promise);
  function Trainer() {
    return <span>{useTrainerName()}</span>;
  }
  renderWidget(<Trainer />);
  await waitFor(() => expect(mocks.read).toHaveBeenCalledOnce());
  mocks.read.mockResolvedValue({ data: { nickname: "새 닉네임" } });
  act(announceAccountChange);
  await screen.findByText("새 닉네임");
  await act(async () => old.respond({ data: { nickname: "이전 닉네임" } }));
  expect(screen.getByText("새 닉네임")).toBeInTheDocument();
});
