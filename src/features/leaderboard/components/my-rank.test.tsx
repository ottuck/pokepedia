import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import messages from "../../../../messages/ko.json";
import { MyRank } from "./my-rank";

const state = vi.hoisted(() => ({
  signedIn: false,
  rows: [] as Array<{ rank: number; score: number; best_combo: number }>,
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabase/browser", () => ({
  createClient: () => ({
    auth: {
      getClaims: async () => ({
        data: state.signedIn ? { claims: { sub: "user-1" } } : null,
      }),
    },
    rpc: async (name: string) => {
      state.rpc(name);
      return { data: state.rows, error: null };
    },
  }),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, ...props }: { href: string }) => <a href={href} {...props} />,
}));

function renderRank() {
  return render(
    <NextIntlClientProvider locale="ko" messages={messages}>
      <MyRank />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  state.signedIn = false;
  state.rows = [];
});

describe("MyRank", () => {
  it("invites a visitor without a session to play, without asking for a rank", async () => {
    renderRank();

    expect(
      await screen.findByText("퀴즈를 한 판 하면 게스트로도 순위에 올라요."),
    ).toBeInTheDocument();
    expect(state.rpc).not.toHaveBeenCalled();
  });

  it("shows the player's own rank, best score and combo", async () => {
    state.signedIn = true;
    state.rows = [{ rank: 7, score: 1280, best_combo: 5 }];
    renderRank();

    expect(
      await screen.findByText("내 순위 7위 · 최고 1,280점 · 콤보 5"),
    ).toBeInTheDocument();
    expect(state.rpc).toHaveBeenCalledWith("my_leaderboard_rank");
  });

  it("explains how to get ranked when there is no scored game yet", async () => {
    state.signedIn = true;
    renderRank();

    expect(
      await screen.findByText(
        "아직 점수를 낸 게임이 없어요. 한 판 하면 순위에 올라요.",
      ),
    ).toBeInTheDocument();
  });
});
