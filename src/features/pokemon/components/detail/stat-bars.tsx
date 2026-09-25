"use client";

import { LazyMotion, m, MotionConfig } from "motion/react";
import { useFormatter, useTranslations } from "next-intl";
import { loadMotionFeatures, spring } from "@/lib/motion";

const STAT_KEYS = [
  "hp",
  "attack",
  "defense",
  "special_attack",
  "special_defense",
  "speed",
] as const;

type StatKey = (typeof STAT_KEYS)[number];

// Bars are scaled against this, not 255: no Gen 1 base stat except Chansey's HP (250) goes
// far past 150, so a 255 scale would leave most bars looking half empty.
const BAR_MAX = 180;

export function StatBars({ stats }: { stats: Record<StatKey, number> }) {
  const t = useTranslations("detail");
  const format = useFormatter();
  const total = STAT_KEYS.reduce((sum, key) => sum + stats[key], 0);

  return (
    <LazyMotion features={loadMotionFeatures} strict>
      <MotionConfig reducedMotion="user">
        <dl className="space-y-2">
          {STAT_KEYS.map((key, index) => (
            <div
              key={key}
              className="grid grid-cols-[6.5rem_2.5rem_1fr] items-center gap-2"
            >
              <dt className="text-sm text-muted">{t(`stats.${key}`)}</dt>
              <dd className="text-right font-mono text-sm font-bold">
                {stats[key]}
              </dd>
              <dd
                aria-hidden
                className="h-2.5 overflow-hidden rounded-full bg-ink/5"
              >
                <m.div
                  className="h-full origin-left rounded-full bg-linear-to-r from-(--type) to-(--type-2)"
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: Math.min(stats[key] / BAR_MAX, 1) }}
                  viewport={{ once: true }}
                  transition={{ ...spring.gentle, delay: index * 0.05 }}
                />
              </dd>
            </div>
          ))}
          <div className="grid grid-cols-[6.5rem_2.5rem_1fr] items-center gap-2 border-t border-ink/10 pt-2">
            <dt className="text-sm font-bold">{t("total")}</dt>
            <dd className="text-right font-mono text-sm font-black">
              {format.number(total)}
            </dd>
          </div>
        </dl>
      </MotionConfig>
    </LazyMotion>
  );
}
