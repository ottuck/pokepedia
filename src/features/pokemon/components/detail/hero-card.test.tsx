/* eslint-disable @next/next/no-img-element -- plain stand-ins for the server-rendered <Image> props */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import messages from "../../../../../messages/ko.json";
import { HeroCard } from "./hero-card";

function renderCard() {
  return render(
    <NextIntlClientProvider locale="ko" messages={messages}>
      <HeroCard
        number="#025"
        name="피카츄"
        genus="쥐포켓몬"
        types={<span>전기</span>}
        height="0.4m"
        weight="6kg"
        normal={<img alt="피카츄" src="/normal.webp" />}
        shiny={<img alt="색이 다른 피카츄" src="/shiny.webp" />}
      />
    </NextIntlClientProvider>,
  );
}

describe("HeroCard", () => {
  it("shows the card with the normal artwork and keeps its repeated text out of the accessibility tree", () => {
    renderCard();

    expect(screen.getByRole("img", { name: "피카츄" })).toBeInTheDocument();
    // The page heading already names the Pokémon; the card must not read it twice.
    for (const text of ["#025", "쥐포켓몬", "0.4m", "전기"]) {
      expect(screen.getByText(text).closest("[aria-hidden]")).not.toBeNull();
    }
  });

  it("does not mount (or download) the shiny artwork until asked", () => {
    renderCard();

    expect(
      screen.queryByRole("img", { name: "색이 다른 피카츄", hidden: true }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /색이 다른 모습/ }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("turns into the shiny print: shiny artwork shown, card marked shiny", async () => {
    const user = userEvent.setup();
    renderCard();
    const toggle = screen.getByRole("button", { name: /색이 다른 모습/ });

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("img", { name: "색이 다른 피카츄" }),
    ).toBeInTheDocument();
    // The hidden one leaves the accessibility tree instead of being read twice.
    expect(
      screen.queryByRole("img", { name: "피카츄" }),
    ).not.toBeInTheDocument();
    expect(document.querySelector("[data-shiny]")).toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("img", { name: "피카츄" })).toBeInTheDocument();
    expect(document.querySelector("[data-shiny]")).not.toBeInTheDocument();
  });
});
