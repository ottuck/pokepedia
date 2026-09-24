import { notFound } from "next/navigation";

// Unknown paths under a valid locale render the translated [locale]/not-found.tsx.
export default function CatchAllPage() {
  notFound();
}
