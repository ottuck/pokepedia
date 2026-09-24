import { useTranslations } from "next-intl";

/**
 * Instant placeholder for the per-request pages (collection, my page) while their session
 * queries run. Shapes only roughly match the page: it is there to show the click landed.
 */
export function PageSkeleton({ variant }: { variant: "collection" | "me" }) {
  const t = useTranslations("common");
  const block = "rounded-2xl bg-ink/5 motion-safe:animate-pulse";

  return (
    <main
      aria-busy
      className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-16"
    >
      <p role="status" className="sr-only">
        {t("loading")}
      </p>
      <div className={`h-9 w-48 ${block}`} />
      {variant === "collection" ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className={`h-20 ${block}`} />
            <div className={`h-20 ${block}`} />
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-6 lg:grid-cols-8">
            {Array.from({ length: 16 }, (_, i) => (
              <div key={i} className={`aspect-[3/4] ${block}`} />
            ))}
          </div>
        </>
      ) : (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className={`h-20 ${block}`} />
            ))}
          </div>
          <div className={`h-32 ${block}`} />
          <div className={`h-40 ${block}`} />
        </div>
      )}
    </main>
  );
}
