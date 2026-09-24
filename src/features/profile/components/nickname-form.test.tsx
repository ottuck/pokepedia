import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import messages from "../../../../messages/ko.json";
import { NicknameForm } from "./nickname-form";

const renameMe = vi.hoisted(() => vi.fn());
vi.mock("../actions", () => ({ renameMe }));

const announceAccountChange = vi.hoisted(() => vi.fn());
vi.mock("@/features/auth/account-events", () => ({ announceAccountChange }));

function renderForm() {
  return render(
    <NextIntlClientProvider locale="ko" messages={messages}>
      <NicknameForm nickname="Trainer-1A2B" />
    </NextIntlClientProvider>,
  );
}

async function submit(nickname: string) {
  const user = userEvent.setup();
  renderForm();
  await user.click(screen.getByRole("button", { name: "닉네임 변경" }));
  const input = screen.getByRole("textbox", { name: "닉네임" });
  await user.clear(input);
  await user.type(input, nickname);
  await user.click(screen.getByRole("button", { name: "저장" }));
}

beforeEach(() => vi.clearAllMocks());

describe("NicknameForm", () => {
  it("shows the nickname as the page heading until editing starts", () => {
    renderForm();

    expect(
      screen.getByRole("heading", { level: 1, name: "Trainer-1A2B" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("saves the new nickname and tells the header", async () => {
    renameMe.mockResolvedValueOnce({ ok: true, nickname: "레드" });

    await submit("레드");

    expect(renameMe).toHaveBeenCalledWith("레드");
    expect(announceAccountChange).toHaveBeenCalledOnce();
    // Back to read-only; the page re-renders with the saved name (see `refresh()`).
    expect(
      await screen.findByRole("heading", { level: 1 }),
    ).toBeInTheDocument();
  });

  it("keeps the form open with the reason when the server refuses", async () => {
    renameMe.mockResolvedValueOnce({ ok: false, code: "invalid_nickname" });

    await submit("레드");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "닉네임은 앞뒤 공백을 빼고 2~20자여야 해요.",
    );
    expect(screen.getByRole("textbox", { name: "닉네임" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(announceAccountChange).not.toHaveBeenCalled();
  });

  it("can be cancelled without saving", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: "닉네임 변경" }));
    await user.click(screen.getByRole("button", { name: "취소" }));

    expect(renameMe).not.toHaveBeenCalled();
    expect(
      screen.getByRole("heading", { level: 1, name: "Trainer-1A2B" }),
    ).toBeInTheDocument();
  });
});
