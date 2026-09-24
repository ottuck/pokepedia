import { Link } from "@/i18n/navigation";
import { AccountMenu } from "@/features/auth/components/account-menu";
import { LocaleSwitcher } from "./locale-switcher";

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
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
      <div className="flex items-center gap-2">
        <LocaleSwitcher />
        <AccountMenu />
      </div>
    </header>
  );
}
