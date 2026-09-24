@AGENTS.md

# Pokepedia

Modern remake of a 2023 JSP team project: Gen 1 (#001–151) Pokédex, a battle-style
silhouette quiz, and a sticker collection. Next.js 16 App Router + Supabase + Vercel.
Architecture and product decisions: `docs/architecture.md` — read it before structural changes.

## Commands

- `npm run dev` — dev server
- `npm run lint` / `npm run typecheck` / `npm run format:check` / `npm test`
- Node 24 (`.nvmrc`). Package manager: npm.

## Principles

- Server Components by default; `"use client"` only where interaction needs it.
- Validate at boundaries with Zod (Server Action input, env, seed-script input). Don't trust
  client-sent ids — derive the user from the session.
- Server Actions return `{ ok: true, ... } | { ok: false, code }`; UI copy lives in
  `messages/*.json`, never in server code.
- Game rules are pure TS in `features/quiz/rules.ts` (unit-tested); multi-row writes go
  through a Postgres RPC in one transaction.
- No runtime dependency on PokeAPI. PokeAPI code lives only under `scripts/`.
- Add libraries only when a concrete problem needs them (TanStack Query, Drizzle, GSAP are
  deliberately absent).

## Supabase

- Keys: publishable key (`sb_publishable_…`) for browser/SSR, secret key (`sb_secret_…`)
  server-only. Do not use legacy `anon` / `service_role` JWT keys.
- One remote project (`pokepedia`) serves Vercel Production and Preview. Local development
  uses `npx supabase start`.
- Verify migrations, RLS, RPCs and seed changes against local Supabase first. Never edit an
  already-merged migration; add a new one.
- Never apply migrations, seed, or reset against the remote project unless explicitly
  asked; that happens only after the change is merged to main.

## Git workflow

- Never push directly to main. One feature branch per coherent unit of work
  (feat/…, fix/…, refactor/…, test/…, docs/…, chore/…).
- Conventional commit prefixes: feat, fix, refactor, test, docs, chore. PR titles MUST use
  this format (they become the squash-merge commit).
- Keep commits logically scoped; never one huge commit for a whole phase.
- One PR per coherent feature; aim for < ~400 changed lines excluding migrations,
  generated types, lockfiles and messages/*.json.
- Before committing: `npm run lint && npm run typecheck && npm test` (relevant scope).
- Never commit secrets (.env*, secret keys, SILHOUETTE_SECRET, wallets).
- Never merge a PR unless explicitly asked.
- Dependent work: branch from the unmerged branch and note "Depends on #N" in the PR.
