import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import messages from "../../../../messages/ko.json";
import { SoundToggle } from "./sound-toggle";

afterEach(() => {
  localStorage.clear();
  vi.resetModules();
});

describe("SoundToggle", () => {
  it("is off by default and remembers when it is turned on", async () => {
    // jsdom has no Web Audio; turning sound on must not throw without it.
    const user = userEvent.setup();
    render(
      <NextIntlClientProvider locale="ko" messages={messages}>
        <SoundToggle />
      </NextIntlClientProvider>,
    );
    const button = screen.getByRole("button", { name: "효과음" });
    expect(button).toHaveAttribute("aria-pressed", "false");

    await user.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(localStorage.getItem("quiz-sound")).toBe("on");

    await user.click(button);
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(localStorage.getItem("quiz-sound")).toBeNull();
  });
});
