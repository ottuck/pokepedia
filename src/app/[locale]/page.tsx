import { QuizGame } from "@/features/quiz/components/quiz-game";

// Home: the game's title screen is the first thing a visitor sees (the dex is /pokedex).
// A static shell: the game itself is a client island that talks to Server Actions. Title and
// description come from the layout's site metadata. Same column as every page.
export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-page px-4 pb-16">
      <QuizGame />
    </main>
  );
}
