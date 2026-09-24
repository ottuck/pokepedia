import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MotionGlobalConfig } from "motion/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeAll, describe, expect, it } from "vitest";
import messages from "../../../../messages/ko.json";
import { CollectionExplorer } from "./collection-explorer";

const ids = [1, 4, 25];
const holdings = { 1: { normal: 2, shiny: 0 }, 25: { normal: 3, shiny: 1 } };
const cards = Object.fromEntries(ids.map((id) => [id, <p key={id}>#{id}</p>]));

const shown = () =>
  screen.queryAllByRole("listitem").map((li) => li.textContent);

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});

describe("CollectionExplorer", () => {
  it.each([
    ["전체", ["#1", "#4", "#25"]],
    ["모은 것", ["#1", "#25"]],
    ["못 모은 것", ["#4"]],
    ["색이 다른", ["#25"]],
  ])("%s shows %j", async (label, expected) => {
    const user = userEvent.setup();
    render(
      <NextIntlClientProvider locale="ko" messages={messages}>
        <CollectionExplorer ids={ids} holdings={holdings} cards={cards} />
      </NextIntlClientProvider>,
    );

    await user.click(screen.getByRole("button", { name: label }));

    await waitFor(() => expect(shown()).toEqual(expected));
    expect(screen.getByRole("button", { name: label })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
