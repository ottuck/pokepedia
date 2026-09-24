import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import messages from "../../messages/en.json";
import { LocaleSwitcher } from "./locale-switcher";

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/quiz",
  Link: ({
    href,
    locale,
    ...props
  }: ComponentProps<"a"> & { locale: string }) => (
    <a href={`/${locale}${href}`} {...props} />
  ),
}));

function renderSwitcher() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <LocaleSwitcher />
    </NextIntlClientProvider>,
  );
}

describe("LocaleSwitcher", () => {
  it("links every language to the current page", () => {
    renderSwitcher();

    const nav = screen.getByRole("navigation", { name: "Language" });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "한국어" })).toHaveAttribute(
      "href",
      "/ko/quiz",
    );
    expect(screen.getByRole("link", { name: "日本語" })).toHaveAttribute(
      "href",
      "/ja/quiz",
    );
  });

  it("marks only the active language as current", () => {
    renderSwitcher();

    expect(screen.getByRole("link", { name: "English" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "한국어" })).not.toHaveAttribute(
      "aria-current",
    );
  });
});
