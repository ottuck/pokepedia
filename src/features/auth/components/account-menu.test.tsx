import { act, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, expect, it, vi } from "vitest";
import type { AuthChangeEvent } from "@supabase/supabase-js";
import messages from "../../../../messages/ko.json";
import { AccountMenu } from "./account-menu";

const mocks = vi.hoisted(() => ({
  getClaims: vi.fn(),
  profile: vi.fn(),
  refresh: vi.fn(),
  listener: null as ((event: AuthChangeEvent) => void) | null,
}));
const router = vi.hoisted(() => ({ refresh: mocks.refresh, push: vi.fn() }));
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => router,
  Link: ({ href, ...props }: { href: string }) => <a href={href} {...props} />,
}));
vi.mock("@/lib/supabase/browser", () => ({
  createClient: () => ({
    auth: {
      getClaims: mocks.getClaims,
      onAuthStateChange: (listener: typeof mocks.listener) => {
        mocks.listener = listener;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }),
    }),
  }),
}));

const guest = { sub: "guest-1", is_anonymous: true, user_metadata: {} };
const renderMenu = () =>
  render(
    <NextIntlClientProvider locale="ko" messages={messages}>
      <AccountMenu />
    </NextIntlClientProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listener = null;
  mocks.profile.mockResolvedValue({ data: { nickname: "레드" } });
});

it("refreshes personal pages and ignores a profile read completed after sign-out", async () => {
  mocks.getClaims.mockResolvedValue({ data: { claims: guest } });
  let respond!: (value: unknown) => void;
  mocks.profile.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        respond = resolve;
      }),
  );
  renderMenu();
  await waitFor(() => expect(mocks.profile).toHaveBeenCalledOnce());
  mocks.getClaims.mockResolvedValue({ data: null });
  act(() => mocks.listener?.("SIGNED_OUT"));
  await waitFor(() => expect(mocks.refresh).toHaveBeenCalledOnce());
  await act(async () => respond({ data: { nickname: "이전 계정" } }));
  expect(
    screen.getByRole("button", { name: "Google로 로그인" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "계정 메뉴" }),
  ).not.toBeInTheDocument();
});

it("refreshes the current route when another tab signs in", async () => {
  mocks.getClaims.mockResolvedValue({ data: null });
  renderMenu();
  await screen.findByRole("button", { name: "Google로 로그인" });
  mocks.getClaims.mockResolvedValue({ data: { claims: guest } });
  act(() => mocks.listener?.("SIGNED_IN"));
  await screen.findByRole("button", { name: "계정 메뉴" });
  expect(mocks.refresh).toHaveBeenCalledOnce();
});
