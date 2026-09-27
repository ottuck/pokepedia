<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Pokepedia

Modern remake of a 2023 JSP team project: Gen 1 (#001–151) Pokédex, a battle-style
silhouette quiz, and a sticker collection. Next.js 16 App Router + Supabase + Vercel.
System design, business logic and development decisions: `docs/system_design.md` — read it
before structural changes. `README.md` is the public-facing overview.

## Commands

- `pnpm dev` — dev server
- `pnpm lint` / `pnpm typecheck` / `pnpm format:check` / `pnpm test`
- `pnpm supabase start` / `pnpm supabase status -o env` / `pnpm supabase db reset` — local Supabase (Docker)
- `pnpm db:types` — regenerate `src/lib/supabase/database.types.ts` after a migration (CI fails on drift)
- `pnpm sync:pokemon` — PokeAPI → local Supabase (catalog + images, idempotent, cached in `.cache/`).
  Remote only when asked: `pnpm sync:pokemon --env-file .env.remote.local --yes`
  The dex is prerendered at build time, so a remote sync only shows after the next deploy.
- `supabase/seed.sql` seeds a 3-Pokémon catalog for local/CI (`db reset`); run the sync for the full dex
- `pnpm test:db` — RLS/grant/RPC tests against local Supabase (writes fixtures; local DB only)
- `pnpm test:e2e` — one Playwright journey (dex → detail → language → game → collection) against
  local Supabase; starts `pnpm dev` on :3200 (first run: `pnpm exec playwright install chromium`).
  Local only, run by hand before bigger changes; not part of CI.
- Node 24 (`engines` in `package.json`; CI pins `node-version: 24`). Package manager: pnpm
  (version pinned by `packageManager`).
- Supabase clients: `lib/supabase/server.ts` (user, RLS), `browser.ts` (user, client side),
  `admin.ts` (secret key, bypasses RLS — server only), `proxy.ts` (session refresh only).

## Repo layout

- `src/app` routes · `src/features/<domain>` (queries, actions, components, pure logic + tests)
  · `src/lib` (env, Supabase clients, shared helpers) · `src/i18n` + `messages/*.json`
- `supabase/` — `config.toml` (local stack only), `migrations/` (auto-deployed on merge),
  `seed.sql`, `tests/` (`pnpm test:db`)
- `scripts/sync-pokemon` — the only PokeAPI code · `e2e/` — Playwright
- `.github/workflows/ci.yml` — check / db jobs · `vercel.json` — install command, region
- No `public/`: static assets are served from Supabase Storage; the favicon is `src/app/icon.svg`.
- Local-only, gitignored: `.env.local`, `.env.remote.local`, `.cache/` (PokeAPI cache for the
  sync), `.claude/` (desktop-app preview config), `.next/`, `test-results/`, `next-env.d.ts`.
- This file is the only agent-instructions file. Keep the Next.js block at the top: `next dev`
  looks for it and recreates `AGENTS.md` when it is missing.

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
  uses `pnpm supabase start`.
- **Migrations deploy automatically**: the Supabase GitHub integration applies new
  `supabase/migrations/*` to the remote project when they land on main. Merging a migration
  PR _is_ deploying it.
- Verify migrations, RLS, RPCs and seed changes against local Supabase first
  (`pnpm supabase db reset`). Never edit an already-merged migration; add a new one.
- New tables get no privileges by default (`api.auto_expose_new_tables = false`, same as
  remote). Every migration must GRANT exactly what `anon`, `authenticated` and `service_role`
  need; after changing migrations run `pnpm supabase db reset` so local matches a fresh remote.
- Migrations must be backward-compatible with the currently deployed code (expand →
  migrate code → contract). Vercel and Supabase deploy in parallel after merge, so there is
  no guaranteed order.
- **Seed / sync is separate and manual**: `scripts/sync-pokemon.ts` against the remote
  project runs only when the user explicitly asks. Never run seed or `db reset` against
  remote, and never add migration/seed steps to the Vercel build.

## Git workflow

- Never push directly to main. One feature branch per coherent unit of work
  (feat/…, fix/…, refactor/…, test/…, docs/…, chore/…).
- Conventional commit prefixes: feat, fix, refactor, test, docs, chore. PR titles MUST use
  this format (they become the squash-merge commit).
- Keep commits logically scoped; never one huge commit for a whole phase.
- One PR per coherent feature; aim for < ~400 changed lines excluding migrations,
  generated types, lockfiles and messages/*.json.
- Before committing: `pnpm lint && pnpm typecheck && pnpm test` (relevant scope);
  before opening a PR also `pnpm build`.
- Never commit secrets (.env*, secret keys, SILHOUETTE_SECRET, wallets).
- Dependent work: branch from the unmerged branch and note "Depends on #N" in the PR.
- Git text (commit messages, PR title/body) in natural Korean; branch names and technical terms
  stay English.
- Every PR: assignee `ottuck`, one type label (`enhancement`, `bug`, `documentation`, `chore`,
  `refactor`, `test`) plus relevant `area: *` labels (`db`, `data`, `i18n`, `auth`, `ui`, `quiz`,
  `infra`), and `needs-approval` when the merge policy requires it. Create a label if none fits.

## Merge policy (risk-based autonomy)

Claude merges its own PRs (squash) when the change is low-risk and every gate passes.

**Gates — all required, otherwise do not merge:**

1. GitHub CI green. Documentation-only PRs (`**/*.md`, `docs/**`) skip CI by design
   (`paths-ignore`), so this gate does not apply to them.
2. Vercel Preview deployment succeeded, and the changed pages were checked on it.
3. Self-review of the full diff (`/code-review` or equivalent) with findings fixed.
4. No unresolved review comments.
5. PR body lists which risk class applies and why it is low-risk.

**Low-risk (Claude may merge):** UI / CSS / Motion, components and ordinary features,
tests, additive non-destructive migrations (new tables/columns/indexes/functions without
new or changed grants/policies), Pokémon data code under `scripts/`, patch/minor updates of
existing dependencies, dependencies already planned in `docs/system_design.md`, docs.

**Needs the user's approval before merge** — label the PR `needs-approval`, ask, and wait:

- Destructive migrations (drop/rename, type changes, NOT NULL on existing data, data rewrites)
- Any RLS policy, GRANT/REVOKE, `security definer` function, or Auth configuration change
- Deleting or bulk-changing production data; running seed/sync against remote
- Secrets, environment variables, domains, billing, third-party integrations
- New dependencies not planned in `docs/system_design.md`; major-version upgrades
- Architecture changes (anything that should update `docs/system_design.md` beyond wording)

**After merge:**

1. Confirm the Vercel Production deployment for the merge commit succeeded.
2. If the PR had migrations, confirm the Supabase deployment succeeded.
3. Smoke test production (home page and the pages the PR touched return 200 and render).
4. On failure: open a fix PR, or `git revert` the merge commit in a revert PR (same gates).
   Database changes are fixed forward with a new migration, never rolled back by hand.
