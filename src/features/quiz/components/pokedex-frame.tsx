import type { ReactNode, Ref } from "react";
import { dotGothic, galmuri } from "../fonts";
import { SoundToggle } from "./sound-toggle";

type Props = {
  children: ReactNode;
  ref?: Ref<HTMLDivElement>;
  /** In battle: touches on the device do not scroll the page (see QuizGame). */
  locked?: boolean;
};

/** The legacy Pokédex device: red body, indicator lights, and a blue screen. */
export function PokedexFrame({ children, ref, locked = false }: Props) {
  return (
    <div
      ref={ref}
      className={`scroll-mt-2 rounded-[2rem] bg-dex-red p-2 shadow-xl sm:p-5 ${locked ? "touch-none" : ""}`}
    >
      <div className="mb-2 flex items-center gap-2 px-1 sm:mb-3">
        <span aria-hidden className="contents">
          <span className="size-7 rounded-full border-4 border-white bg-sky-400 shadow-inner" />
          <span className="size-3 rounded-full bg-red-300" />
          <span className="size-3 rounded-full bg-volt" />
          <span className="size-3 rounded-full bg-green-400" />
        </span>
        <SoundToggle />
      </div>
      <div
        className={`${galmuri.variable} ${dotGothic.variable} overflow-hidden rounded-3xl border-4 border-ink/20 bg-dex-screen font-pixel`}
      >
        {children}
      </div>
    </div>
  );
}
