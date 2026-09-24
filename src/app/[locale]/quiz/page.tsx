import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { QuizGame } from "@/features/quiz/components/quiz-game";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("quiz");
  return { title: `${t("metaTitle")} · Pokepedia`, description: t("subtitle") };
}

// A static shell: the game itself is a client island that talks to Server Actions.
export default function QuizPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16">
      <QuizGame />
    </main>
  );
}
