import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MotionGlobalConfig } from "motion/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import messages from "../../../../messages/ko.json";
import type { DexEntry } from "../explore";
import { PokedexExplorer } from "./pokedex-explorer";

let searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({ useSearchParams: () => searchParams }));

const entries: DexEntry[] = [
  {
    id: 1,
    name_ko: "이상해씨",
    name_en: "Bulbasaur",
    name_ja: "フシギダネ",
    type_1: "grass",
    type_2: "poison",
  },
  {
    id: 4,
    name_ko: "파이리",
    name_en: "Charmander",
    name_ja: "ヒトカゲ",
    type_1: "fire",
    type_2: null,
  },
  {
    id: 25,
    name_ko: "피카츄",
    name_en: "Pikachu",
    name_ja: "ピカチュウ",
    type_1: "electric",
    type_2: null,
  },
];
// Stand-ins for the server-rendered cards.
const cards = Object.fromEntries(
  entries.map((e) => [e.id, <p key={e.id}>{e.name_ko}</p>]),
);

function renderExplorer() {
  return render(
    <NextIntlClientProvider locale="ko" messages={messages}>
      <PokedexExplorer entries={entries} cards={cards} />
    </NextIntlClientProvider>,
  );
}

const visibleNames = () =>
  screen.queryAllByRole("listitem").map((item) => item.textContent);

beforeAll(() => {
  // Exit animations would otherwise keep removed cards in the DOM for a moment.
  MotionGlobalConfig.skipAnimations = true;
});

beforeEach(() => {
  searchParams = new URLSearchParams();
  window.history.replaceState(null, "", "/ko");
});

describe("PokedexExplorer", () => {
  it("filters by name as the user types and reflects it in the URL", async () => {
    const user = userEvent.setup();
    renderExplorer();

    await user.type(
      screen.getByRole("searchbox", { name: "포켓몬 검색" }),
      "피카",
    );

    await waitFor(() => expect(visibleNames()).toEqual(["피카츄"]));
    expect(screen.getByText("3마리 중 1마리")).toBeInTheDocument();
    expect(window.location.search).toBe(`?q=${encodeURIComponent("피카")}`);
  });

  it("filters by type and toggles back to all", async () => {
    const user = userEvent.setup();
    renderExplorer();
    const typeGroup = screen.getByRole("group", { name: "타입" });

    const fire = within(typeGroup).getByRole("button", { name: "불꽃" });
    await user.click(fire);
    await waitFor(() => expect(visibleNames()).toEqual(["파이리"]));
    expect(fire).toHaveAttribute("aria-pressed", "true");

    await user.click(fire);
    await waitFor(() => expect(visibleNames()).toHaveLength(3));
    expect(
      within(typeGroup).getByRole("button", { name: "전체" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("only offers types that exist in the dex", () => {
    renderExplorer();
    const typeGroup = screen.getByRole("group", { name: "타입" });

    expect(
      within(typeGroup).queryByRole("button", { name: "드래곤" }),
    ).not.toBeInTheDocument();
  });

  it("shows an empty state that resets the filters", async () => {
    const user = userEvent.setup();
    renderExplorer();

    await user.type(screen.getByRole("searchbox"), "뮤츠");
    await user.click(
      await screen.findByRole("button", { name: "필터 초기화" }),
    );

    await waitFor(() => expect(visibleNames()).toHaveLength(3));
    expect(screen.getByRole("searchbox")).toHaveValue("");
  });

  it("restores filters from a shared URL", async () => {
    searchParams = new URLSearchParams("type=electric&sort=name");
    renderExplorer();

    await waitFor(() => expect(visibleNames()).toEqual(["피카츄"]));
    expect(screen.getByRole("combobox", { name: "정렬" })).toHaveValue("name");
  });
});
