import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import messages from "../../../../messages/ko.json";
import { announceAccountChange } from "../account-events";
import { AccountMenu } from "./account-menu";

type Claims = {
  is_anonymous?: boolean;
  user_metadata?: Record<string, unknown>;
} | null;

const auth = {
  claims: null as Claims,
  signInWithOAuth: vi.fn(async () => ({ data: {}, error: null })),
  linkIdentity: vi.fn(async () => ({ data: {}, error: null })),
  signOut: vi.fn(async () => ({ error: null })),
};

const push = vi.fn();
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push }),
  Link: ({ href, ...props }: { href: string }) => <a href={href} {...props} />,
}));

vi.mock("@/lib/supabase/browser", () => ({
  createClient: () => ({
    auth: {
      getClaims: async () => ({
        data: auth.claims ? { claims: auth.claims } : null,
      }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
      signInWithOAuth: auth.signInWithOAuth,
      linkIdentity: auth.linkIdentity,
      signOut: auth.signOut,
    },
    from: () => ({
      select: () => ({
        maybeSingle: async () => ({ data: { nickname: "Trainer-1A2B" } }),
      }),
    }),
  }),
}));

// jsdom has no Popover API: the menu panel stays hidden and clicking the trigger does not open
// it. So these tests check the wiring and use `hidden: true` for items inside the panel; opening
// and light-dismiss are browser behavior, covered by the E2E suite.
const inMenu = { hidden: true } as const;

function renderMenu() {
  return render(
    <NextIntlClientProvider locale="ko" messages={messages}>
      <AccountMenu />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState(null, "", "/ko/pokemon/25");
});

describe("AccountMenu", () => {
  it("offers Google sign-in when signed out, returning to the current page", async () => {
    auth.claims = null;
    const user = userEvent.setup();
    renderMenu();

    await user.click(
      await screen.findByRole("button", { name: "Google로 로그인" }),
    );

    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/ko/pokemon/25")}`,
      },
    });
    expect(auth.linkIdentity).not.toHaveBeenCalled();
  });

  it("links Google to a guest account instead of creating a new one", async () => {
    auth.claims = { is_anonymous: true };
    const user = userEvent.setup();
    renderMenu();

    const trigger = await screen.findByRole("button", { name: "계정 메뉴" });
    const panel = document.getElementById(
      trigger.getAttribute("popovertarget")!,
    );
    expect(panel).toHaveAttribute("popover", "auto");
    expect(panel).toHaveTextContent("게스트 플레이 중");
    await user.click(
      screen.getByRole("button", { name: "Google 계정에 저장", ...inMenu }),
    );

    expect(auth.linkIdentity).toHaveBeenCalledOnce();
    expect(auth.signInWithOAuth).not.toHaveBeenCalled();
  });

  it("shows the auth error page when Google sign-in cannot start", async () => {
    auth.claims = null;
    auth.signInWithOAuth.mockResolvedValueOnce({
      data: {},
      error: { code: "provider_disabled" },
    } as never);
    const user = userEvent.setup();
    renderMenu();

    await user.click(
      await screen.findByRole("button", { name: "Google로 로그인" }),
    );

    expect(push).toHaveBeenCalledWith({
      pathname: "/auth/error",
      query: { code: "provider_disabled" },
    });
  });

  it("asks before a guest leaves, since guest progress cannot be recovered", async () => {
    auth.claims = { is_anonymous: true };
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false);
    const user = userEvent.setup();
    renderMenu();

    await user.click(
      await screen.findByRole("button", { name: "게스트 나가기", ...inMenu }),
    );

    expect(confirm).toHaveBeenCalledOnce();
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it("signs a Google user out without asking", async () => {
    auth.claims = { is_anonymous: false };
    const confirm = vi.spyOn(window, "confirm");
    const user = userEvent.setup();
    renderMenu();

    await user.click(
      await screen.findByRole("button", { name: "로그아웃", ...inMenu }),
    );

    expect(confirm).not.toHaveBeenCalled();
    expect(auth.signOut).toHaveBeenCalledOnce();
    expect(screen.queryByText("Google 계정에 저장")).not.toBeInTheDocument();
  });

  it("picks up a guest session created on the server", async () => {
    auth.claims = null;
    renderMenu();
    await screen.findByRole("button", { name: "Google로 로그인" });

    // The quiz's first game signs in through a Server Action, invisible to onAuthStateChange.
    auth.claims = { is_anonymous: true };
    act(() => announceAccountChange());

    expect(
      await screen.findByRole("button", { name: "계정 메뉴" }),
    ).toHaveTextContent("Trainer-1A2B");
  });
});
