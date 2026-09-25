/* eslint-disable @next/next/no-img-element -- plain stand-ins for the server-rendered <Image> props */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import messages from "../../../../../messages/ko.json";
import { ArtworkViewer } from "./artwork-viewer";

function renderViewer() {
  return render(
    <NextIntlClientProvider locale="ko" messages={messages}>
      <ArtworkViewer
        normal={<img alt="피카츄" src="/normal.webp" />}
        shiny={<img alt="색이 다른 피카츄" src="/shiny.webp" />}
      />
    </NextIntlClientProvider>,
  );
}

describe("ArtworkViewer", () => {
  it("does not mount (or download) the shiny artwork until asked", () => {
    renderViewer();

    expect(screen.getByRole("img", { name: "피카츄" })).toBeInTheDocument();
    expect(
      screen.queryByRole("img", { name: "색이 다른 피카츄", hidden: true }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /색이 다른 모습/ }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("switches between the normal and shiny artwork", async () => {
    const user = userEvent.setup();
    renderViewer();
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

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("img", { name: "피카츄" })).toBeInTheDocument();
  });
});
