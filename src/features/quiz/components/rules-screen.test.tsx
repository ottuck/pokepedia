import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import messages from "../../../../messages/ko.json";
import { RULES } from "../rules";
import { RulesScreen } from "./rules-screen";

const renderRules = (
  mode: "intro" | "full",
  props: { starting?: boolean; onDone?: () => void } = {},
) =>
  render(
    <NextIntlClientProvider locale="ko" messages={messages}>
      <RulesScreen
        mode={mode}
        starting={props.starting ?? false}
        onDone={props.onDone ?? vi.fn()}
      />
    </NextIntlClientProvider>,
  );

// Reduced motion prints a page at once, so one click turns it.
const stubReducedMotion = () =>
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));

describe("RulesScreen", () => {
  it("keeps the shiny tiers ordered from the highest combo down", () => {
    const combos = RULES.shinyTiers.map((tier) => tier.minCombo);
    expect(RULES.shinyTiers).toHaveLength(3);
    expect(combos).toEqual([...combos].sort((a, b) => b - a));
  });

  it("shows three pages on the first visit and ends on the combo page", async () => {
    stubReducedMotion();
    const onDone = vi.fn();
    renderRules("intro", { onDone });
    const user = userEvent.setup();

    expect(screen.getByText("룰 설명 1/3")).toBeInTheDocument();
    await user.click(screen.getAllByText(/이름을 맞혀서/)[0]);
    await user.click(screen.getAllByText(/싸우다/)[0]);
    expect(screen.getByText("룰 설명 3/3")).toBeInTheDocument();
    expect(screen.getAllByText(/최대 ×2\.0/).length).toBeGreaterThan(0);

    await user.click(screen.getAllByText(/콤보/)[0]);
    expect(onDone).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });

  it("ends the full rules on the score table built from RULES", async () => {
    stubReducedMotion();
    renderRules("full");
    const user = userEvent.setup();

    for (let page = 1; page < 5; page++) {
      await user.keyboard("{Enter}");
    }
    expect(screen.getByText("룰 설명 5/5")).toBeInTheDocument();
    expect(screen.getByText("점수표")).toBeInTheDocument();
    expect(screen.getByText("100점")).toBeInTheDocument();
    expect(screen.getByText("60점")).toBeInTheDocument();
    expect(screen.getByText("30점")).toBeInTheDocument();
    expect(screen.getByText(/맞힐 때마다 \+10%/)).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("shows the getting-ready text instead of the table while starting", async () => {
    stubReducedMotion();
    const { rerender } = renderRules("full");
    const user = userEvent.setup();
    for (let page = 1; page < 5; page++) {
      await user.keyboard("{Enter}");
    }

    rerender(
      <NextIntlClientProvider locale="ko" messages={messages}>
        <RulesScreen mode="full" starting onDone={vi.fn()} />
      </NextIntlClientProvider>,
    );
    expect(screen.queryByText("점수표")).not.toBeInTheDocument();
    expect(screen.getAllByText("준비 중…").length).toBeGreaterThan(0);
    vi.unstubAllGlobals();
  });
});
