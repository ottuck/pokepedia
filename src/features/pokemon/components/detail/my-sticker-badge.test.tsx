import { act, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { announceAccountChange } from "@/features/auth/account-events";
import messages from "../../../../../messages/ko.json";
import { MyStickerBadge } from "./my-sticker-badge";

const db = vi.hoisted(() => ({
  userId: null as string | null,
  rows: [] as Array<{ variant: "normal" | "shiny"; quantity: number }>,
  filters: [] as Array<[string, unknown]>,
}));

vi.mock("@/lib/supabase/browser", () => ({
  createClient: () => ({
    auth: {
      getClaims: async () => ({
        data: db.userId ? { claims: { sub: db.userId } } : null,
      }),
    },
    from: () => {
      const query = {
        select: () => query,
        eq: (column: string, value: unknown) => {
          db.filters.push([column, value]);
          return query;
        },
        then: (resolve: (value: unknown) => void) =>
          resolve({ data: db.rows, error: null }),
      };
      return query;
    },
  }),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, ...props }: { href: string }) => <a href={href} {...props} />,
}));

function renderBadge() {
  return render(
    <NextIntlClientProvider locale="ko" messages={messages}>
      <MyStickerBadge pokemonId={25} />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  db.userId = null;
  db.rows = [];
  db.filters = [];
});

describe("MyStickerBadge", () => {
  it("shows nothing without a session", async () => {
    const { container } = renderBadge();
    await act(async () => {});

    expect(container).toBeEmptyDOMElement();
  });

  it("counts this player's stickers of this Pokémon", async () => {
    db.userId = "user-1";
    db.rows = [
      { variant: "normal", quantity: 3 },
      { variant: "shiny", quantity: 1 },
    ];
    renderBadge();

    expect(
      await screen.findByText("내 띠부씰 3장 · 색이 다른 1장"),
    ).toBeInTheDocument();
    expect(screen.getByText(/색이 다른 모습 획득/)).toBeInTheDocument();
    expect(db.filters).toEqual([
      ["user_id", "user-1"],
      ["pokemon_id", 25],
    ]);
  });

  it("points to the quiz when none are owned, and updates after a guest is created", async () => {
    renderBadge();
    await act(async () => {});

    db.userId = "user-1";
    act(() => announceAccountChange());

    expect(
      await screen.findByRole("link", { name: "퀴즈로 모으기" }),
    ).toHaveAttribute("href", "/quiz");
  });
});
