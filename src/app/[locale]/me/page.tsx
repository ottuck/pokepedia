import type { Metadata } from "next";
import Image from "next/image";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { GuestSaveBanner } from "@/features/collection/components/guest-save-banner";
import { artworkUrl } from "@/features/pokemon/assets";
import { localizedName } from "@/features/pokemon/format";
import { getPokedexList } from "@/features/pokemon/queries";
import { AvatarEditor } from "@/features/profile/components/avatar-editor";
import { NicknameForm } from "@/features/profile/components/nickname-form";
import { getMyPage } from "@/features/profile/queries";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("me");
  return { title: `${t("title")} · Pokepedia` };
}

// Rendered per request: the page reads the session cookie (see getMyPage).
export default async function MyPage() {
  const [locale, t, format, pokedex, me] = await Promise.all([
    getLocale(),
    getTranslations("me"),
    getFormatter(),
    getPokedexList(),
    getMyPage(),
  ]);

  if (!me) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 pb-16">
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-card p-10 text-center ring-1 ring-ink/5">
          <h1 className="text-2xl font-black">{t("emptyTitle")}</h1>
          <p className="text-sm text-muted">{t("emptyBody")}</p>
          <Link
            href="/"
            className="rounded-full bg-ink px-5 py-2 text-sm font-bold text-surface"
          >
            {t("toQuiz")}
          </Link>
        </div>
      </main>
    );
  }

  const byId = new Map(pokedex.map((pokemon) => [pokemon.id, pokemon]));
  // Relative times ("3 hours ago") need no time zone, unlike dates formatted on the server.
  const now = new Date();
  const stats = [
    { label: t("stats.plays"), value: format.number(me.stats.plays) },
    { label: t("stats.bestScore"), value: format.number(me.stats.bestScore) },
    { label: t("stats.bestCombo"), value: format.number(me.stats.bestCombo) },
    {
      label: t("stats.clearRate"),
      value:
        me.stats.clearRate === null
          ? "–"
          : format.number(me.stats.clearRate, { style: "percent" }),
    },
    {
      label: t("stats.collected"),
      value: `${me.collection.collected} / ${pokedex.length}`,
    },
  ];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pb-16">
      <header className="flex flex-col gap-4">
        <AvatarEditor
          // Remount after a change so the picture and buttons follow the new profile.
          key={me.avatar.url ?? "none"}
          userId={me.userId}
          nickname={me.nickname}
          pictureUrl={me.avatar.url}
          hasUpload={me.avatar.hasUpload}
          isGuest={me.isAnonymous}
        />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-bold text-muted">
            {me.isAnonymous ? t("guestAccount") : t("googleAccount")}
          </p>
          {/* Keyed so a saved nickname resets the form to its read-only state. */}
          <NicknameForm key={me.nickname} nickname={me.nickname} />
        </div>
      </header>

      {me.isAnonymous && <GuestSaveBanner />}

      <section aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="mb-3 text-lg font-black">
          {t("stats.title")}
        </h2>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {stats.map(({ label, value }) => (
            <div
              key={label}
              // Five cards: the last one spans the row in the two-column phone layout.
              className="rounded-2xl bg-card p-4 ring-1 ring-ink/5 last:col-span-2 sm:last:col-span-1"
            >
              <dt className="text-xs font-bold text-muted">{label}</dt>
              <dd className="font-mono text-2xl font-black">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="stickers-heading">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 id="stickers-heading" className="text-lg font-black">
            {t("recentStickers")}
          </h2>
          <Link
            href="/collection"
            className="text-sm font-bold text-muted hover:text-ink"
          >
            {t("toCollection")}
          </Link>
        </div>
        {me.recentStickers.length === 0 ? (
          <p className="text-sm text-muted">{t("noStickers")}</p>
        ) : (
          <ul className="grid grid-cols-4 gap-3 sm:grid-cols-8">
            {me.recentStickers.map(({ pokemon_id, variant }) => {
              const pokemon = byId.get(pokemon_id);
              if (!pokemon) return null;
              const shiny = variant === "shiny";
              return (
                <li key={`${pokemon_id}-${variant}`}>
                  <Link
                    href={`/pokemon/${pokemon_id}`}
                    className={`flex flex-col items-center gap-1 rounded-xl border-4 bg-card p-1 text-center ${shiny ? "border-volt" : "border-card"}`}
                  >
                    <span className="relative aspect-square w-full">
                      <Image
                        src={artworkUrl(
                          shiny
                            ? pokemon.shiny_artwork_path
                            : pokemon.artwork_path,
                        )}
                        alt=""
                        fill
                        sizes="80px"
                        className="object-contain"
                      />
                    </span>
                    <span className="w-full truncate text-xs font-bold">
                      {localizedName(pokemon, locale)}
                      {shiny && (
                        <span className="sr-only"> ({t("shiny")})</span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="runs-heading">
        <h2 id="runs-heading" className="mb-3 text-lg font-black">
          {t("recentRuns")}
        </h2>
        {me.recentRuns.length === 0 ? (
          <p className="text-sm text-muted">{t("noRuns")}</p>
        ) : (
          <ol className="divide-y divide-ink/5 rounded-2xl bg-card ring-1 ring-ink/5">
            {me.recentRuns.map((run) => (
              <li
                key={run.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="font-mono text-lg font-black">
                    {t("runScore", { score: format.number(run.score) })}
                  </p>
                  <p className="text-xs text-muted">
                    {t("runDetail", {
                      cleared: run.rounds_cleared,
                      combo: run.best_combo,
                    })}
                  </p>
                </div>
                <div className="text-right text-xs text-muted">
                  <p className="font-bold">
                    {run.end_reason === "fainted"
                      ? t("endReason.fainted")
                      : t("endReason.fled")}
                  </p>
                  {run.finished_at && (
                    <p>{format.relativeTime(new Date(run.finished_at), now)}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
