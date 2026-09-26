import { Link } from "@/i18n/navigation";
import { AccountMenu } from "@/features/auth/components/account-menu";
import { DARK_MODE_ENABLED } from "@/lib/theme";
import { LocaleSwitcher } from "./locale-switcher";
import { ThemeToggle } from "./theme-toggle";
import { MainNav } from "./main-nav";

export function SiteHeader() {
  return (
    // Phones: logo + controls on the first row, a full-width tab bar below, then room before
    // the page title. From md: one row.
    <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-4 px-4 pt-4 pb-6 md:py-4">
      <Link
        href="/"
        className="flex items-center gap-2 text-xl font-black tracking-tight"
      >
        <span
          aria-hidden
          className="relative size-6 overflow-hidden rounded-full border-[3px] border-ink bg-white"
        >
          <span className="absolute inset-x-0 top-0 h-1/2 rounded-t-full bg-dex-red" />
          <span className="absolute top-1/2 left-1/2 size-2 -translate-1/2 rounded-full border-2 border-ink bg-white" />
        </span>
        Pokepedia
      </Link>
      <div className="order-last w-full md:order-none md:mr-auto md:w-auto">
        <MainNav />
      </div>
      <div className="flex items-center gap-2">
        <LocaleSwitcher />
        {DARK_MODE_ENABLED && <ThemeToggle />}
        <AccountMenu />
      </div>
    </header>
  );
}
