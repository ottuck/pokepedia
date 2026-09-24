import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import messages from "../../messages/ko.json";
import { ThemeToggle } from "./theme-toggle";

function renderToggle() {
  return render(
    <NextIntlClientProvider locale="ko" messages={messages}>
      <ThemeToggle />
    </NextIntlClientProvider>,
  );
}

const root = document.documentElement;

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  delete root.dataset.theme;
});

describe("ThemeToggle", () => {
  it("cycles system → light → dark → system and remembers the choice", async () => {
    const user = userEvent.setup();
    renderToggle();
    const button = screen.getByRole("button", { name: /시스템 설정/ });

    await user.click(button);
    expect(root.dataset.theme).toBe("light");
    expect(localStorage.getItem("theme")).toBe("light");
    expect(button).toHaveAccessibleName(/라이트/);

    await user.click(button);
    expect(root.dataset.theme).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("dark");

    await user.click(button);
    expect(root.dataset.theme).toBeUndefined();
    expect(localStorage.getItem("theme")).toBeNull();
    expect(button).toHaveAccessibleName(/시스템 설정/);
  });

  it("starts from the theme the head script applied", () => {
    root.dataset.theme = "dark";
    renderToggle();

    expect(screen.getByRole("button")).toHaveAccessibleName(/다크/);
  });

  it("still switches the page when storage is blocked", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    const user = userEvent.setup();
    renderToggle();

    await user.click(screen.getByRole("button"));

    expect(root.dataset.theme).toBe("light");
    expect(screen.getByRole("button")).toHaveAccessibleName(/라이트/);
  });
});
