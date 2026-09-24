import type { ReactNode } from "react";

/** The legacy Pokédex device: red body, indicator lights, and a blue screen. */
export function PokedexFrame({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[2rem] bg-dex-red p-3 shadow-xl sm:p-5">
      <div aria-hidden className="mb-3 flex items-center gap-2 px-1">
        <span className="size-7 rounded-full border-4 border-white bg-sky-400 shadow-inner" />
        <span className="size-3 rounded-full bg-red-300" />
        <span className="size-3 rounded-full bg-volt" />
        <span className="size-3 rounded-full bg-green-400" />
      </div>
      <div className="overflow-hidden rounded-3xl border-4 border-ink/20 bg-dex-screen">
        {children}
      </div>
    </div>
  );
}
