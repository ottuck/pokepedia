# Pokepedia

Modern remake of the Pokepedia web application built with Next.js and Supabase.

A Gen 1 (#001–151) Pokédex, a battle-style "Who's that Pokémon?" silhouette quiz, and a
sticker collection you fill by answering correctly. Remake of a 2023 JSP team project
([ottuck/PikapediaProject](https://github.com/ottuck/PikapediaProject)).

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Motion · Zustand · Zod ·
next-intl · Supabase (Postgres, Auth, Storage) · Vitest · React Testing Library · Playwright ·
Vercel

## Getting started

```bash
nvm use            # Node 24
npm install
npx supabase start      # needs Docker: local Postgres, Auth, Storage
cp .env.example .env.local   # fill keys from `npx supabase status -o env`
npm run dev
```

Checks: `npm run lint`, `npm run typecheck`, `npm run format:check`, `npm test`.

Design and architecture decisions: [docs/architecture.md](docs/architecture.md).

---

Pokémon and all related names and artwork are trademarks and © of Nintendo, Creatures Inc.
and GAME FREAK inc. This is a non-commercial fan project.
