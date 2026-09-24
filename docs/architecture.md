# Pokepedia Architecture

레거시 JSP 프로젝트(ottuck/PikapediaProject) 분석(Phase 1) 이후 확정한 요구사항·아키텍처·UI 결정 기록.
구조를 바꾸는 변경은 이 문서를 먼저 갱신한다.

- **[L] Legacy Core** — 레거시에서 복원하는 기능
- **[R] Remake Enhancement** — 리메이크에서 새로 추가하는 기능

## 1. 범위와 확정 결정

| 영역   | 결정                                                                                           |
| ------ | ---------------------------------------------------------------------------------------------- |
| 포켓몬 | 1세대 #001–151만. 타입은 **현재 공식 기준** (피피 = 페어리)                                    |
| 데이터 | PokeAPI → `scripts/sync-pokemon.ts`(1회) → Supabase DB + Storage. **런타임 PokeAPI 호출 없음** |
| 이미지 | 아트워크(normal/shiny) webp를 Storage에. 실루엣은 seed 시 미리 생성, opaque key                |
| 인증   | Supabase 익명 로그인 + Google OAuth (identity linking)                                         |
| i18n   | UI 전체 ko / en / ja (next-intl), 포켓몬 데이터 3개 언어                                       |
| 퀴즈   | HP는 round당 3 [L], 점수·콤보는 run [R]                                                        |
| 보상   | 맞힌 포켓몬 스티커 확정 [L] + variant(normal/shiny) 추첨 [R]                                   |
| 상태   | 서버 데이터는 RSC, Zustand는 퀴즈 화면만                                                       |
| 제외   | TanStack Query, Drizzle, GSAP, R2 — 필요해질 때 검토                                           |

## 2. 요구사항

### Must (MVP)

- **도감**: 151마리 한 페이지 그리드 [L], 타입 필터 [L], 검색(3개 언어 이름·번호) [L], 정렬 [R], URL 상태 동기화 [R], 카드 hover 연출 + 필터 layout 재배치 [R]
- **상세**: 아트워크·번호·이름·타입·키/몸무게·설명·타입 그라데이션 배경 [L], 분류·능력치·특성·진화(1세대 내)·이전/다음 [R]
- **퀴즈**: 싸운다/아이템/포켓몬/도망간다 + 방향키 [L], round HP 3 [L], 힌트(이름 절반) [L], 스킵 [L], 서버 판정·3개 언어 정답 허용·점수/콤보 HUD·등장/정답/오답/게임오버 연출 [R]
- **보상/컬렉션**: 스티커 지급 [L], shiny variant [R], `N / 151` + `?` 미획득 카드 [L], 수량·Shiny 수집률·획득 연출 [R]
- **계정**: 익명 → Google 연결 [R], 마이페이지 닉네임 [L] + 통계(플레이 수·정답률·최고 점수·최고 콤보·최근 획득) [R]
- **공통**: ko/en/ja [L], Pokédex 프레임 모티프 [L], 반응형

### Should

다크모드 [L], 상세의 "내 스티커" 배지(동적 영역), 상세 shiny 토글, 아바타 업로드 [L], 효과음

### Could

리더보드, 데일리 챌린지, 즐겨찾기 [L], 스티커 3D tilt, OG 이미지, 익명 계정 정리 cron, 익명 컬렉션 병합

### Not Now

Community 채팅, 2세대 이후, 결제/가챠

## 3. 게임 규칙

모든 수치는 `features/quiz/rules.ts` 상수 + Vitest.

```
Run   : score, combo, best_combo, skips_left = 3
Round : hp = 3, hint 1회

싸운다(정답) → round 클리어 → 점수 → 스티커 → 다음 round
싸운다(오답) → hp −1, combo = 0
  hp 0       → round 실패 → 정답 공개 → run 종료 (fainted)
아이템(힌트) → 현재 locale 이름 앞 절반 공개, combo = 0, 해당 round 점수 ×0.5
포켓몬(스킵) → skips_left −1, combo = 0, 0점, 스티커 없음
도망간다     → run 종료 (fled)
```

- 점수: `base[hp] × hint × comboMultiplier`, `base = {3: 100, 2: 60, 1: 30}`, `comboMultiplier = 1 + 0.1 × min(combo − 1, 10)` (최대 ×2.0)
- 콤보 보상 — shiny 확률: combo 1–4 → 5%, 5–9 → 10%, 10+ → 20%. 힌트 사용 round는 5%
- 힌트는 이름 글자 수의 절반(내림)만 공개한다. 한 글자 이름(뮤)은 아무것도 공개하지 않는다(정답 노출 방지)
- 힌트를 쓴 round도 클리어하면 콤보가 1부터 다시 시작한다
- 콤보는 오답·힌트·스킵에서 리셋 (실패하면 run이 끝나므로 "연속 정답"만으로는 의미가 없음)

## 4. 환경 구성

단일 remote Supabase 프로젝트를 운영한다 (개인 프로젝트 규모).

| 환경              | Supabase                       | 비고                                                   |
| ----------------- | ------------------------------ | ------------------------------------------------------ |
| Local             | `pnpm supabase start` (Docker) | 모든 DB 변경을 먼저 여기서 검증                        |
| Vercel Production | remote `pokepedia`             | main 배포                                              |
| Vercel Preview    | remote `pokepedia` (동일)      | PR 확인용. **DB를 변경하는 작업을 자동 실행하지 않음** |

### 배포 파이프라인

```
feature branch → PR ─┬─ GitHub CI (lint / typecheck / format / test)
                     └─ Vercel Preview build
                → Claude self-review → 위험도 판단 ─ 저위험: Claude squash merge
                                                  └ 고위험: 사용자 승인 후 merge
main ─┬─ Vercel Production 자동 배포
      └─ Supabase GitHub integration: 신규 migrations 자동 적용
      → post-deploy 확인 (배포 상태 + production smoke test)
```

위험도 분류와 merge 조건은 `CLAUDE.md` § Merge policy가 기준이다.

### DB 변경 흐름

| 대상                                              | 적용 방식                                                                   |
| ------------------------------------------------- | --------------------------------------------------------------------------- |
| Schema (`supabase/migrations`)                    | local 검증 → PR → **main merge 시 Supabase integration이 자동 적용**        |
| Pokémon 데이터·이미지 (`scripts/sync-pokemon.ts`) | **수동**, 사용자가 명시적으로 요청할 때만 remote에 실행 (idempotent upsert) |
| 사용자 데이터                                     | 앱을 통해서만. 대량 변경·삭제는 사용자 승인                                 |

- migration은 현재 배포된 코드와 호환되어야 한다 (expand → 코드 전환 → contract). merge 후 Vercel과 Supabase는 병렬로 배포되므로 순서가 보장되지 않는다.
- DB 롤백은 하지 않는다. 문제가 생기면 새 migration으로 수정한다 (forward fix).
- Vercel build/deploy 단계에 migration·seed·reset을 넣지 않는다. production에서 seed file은 자동 적용되지 않는다.
- PR별 Supabase Preview Branching은 유료 기능이라 사용하지 않는다 (PR의 `Supabase Preview: skipping`은 정상). 대신 migration은 CI에서 local Supabase로 검증한다 (첫 migration PR에서 추가).
- Preview는 production 데이터를 공유한다. Preview에서의 게임 플레이는 실제 데이터가 된다는 점을 전제로 한다.
- Preview URL에서 OAuth를 쓰려면 Supabase Auth Redirect URLs에 Vercel preview 패턴을 추가한다.

### 환경변수

| 변수                                   | 노출             | Local             | Vercel (Prod + Preview)   |
| -------------------------------------- | ---------------- | ----------------- | ------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | public           | local CLI URL     | remote URL                |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | public           | local publishable | remote `sb_publishable_…` |
| `SUPABASE_SECRET_KEY`                  | server only      | local secret      | remote `sb_secret_…`      |
| `SILHOUETTE_SECRET`                    | seed script only | 값                | 설정하지 않음             |

- Supabase의 새 API key 체계를 사용한다: publishable / secret. legacy `anon` / `service_role` JWT key는 사용하지 않는다.
- secret key는 Postgres의 `service_role` 권한으로 동작한다. 따라서 RPC 권한 설계(§6)의 "service_role 전용"은 secret key를 쓰는 서버 코드 전용이라는 뜻이다.
- remote에 seed를 실행할 때는 별도 파일(`.env.remote.local`, gitignore 대상)을 사용하고, 명시적으로 지정한다.

## 5. 데이터 파이프라인

```
PokeAPI ──(로컬에서 1회 실행) scripts/sync-pokemon.ts
  ① 1–151 species / pokemon / evolution-chain / ability 조회 (동시 5개, .cache/pokeapi/ 원본 캐시)
  ② Zod로 원본 검증 → 도메인 row 정규화
  ③ sharp: 아트워크 PNG → webp 512 (normal, shiny) + 검은 실루엣 webp
  ④ Storage 업로드 + DB upsert (idempotent)
```

- 실행: `pnpm sync:pokemon` (기본 `.env.local`). remote 대상은 `--env-file .env.remote.local --yes` 없이는 거부한다
- 이미지 인코딩: webp quality 85, effort 4 (effort 6은 장당 ~75배 느리고 용량은 ~1% 차이). 원본 475px라 확대하지 않는다
- 코드: `scripts/sync-pokemon/` — `pokeapi.ts`(Zod + 캐시), `transform.ts`(순수 변환, 단위 테스트), `images.ts`(sharp), `index.mts`(실행)
- 정답 키 정규화는 퀴즈 채점과 같은 `src/features/quiz/normalize.ts`를 쓴다
- 실루엣 key = `HMAC-SHA256(SILHOUETTE_SECRET, id)` 앞 16자리
- 버킷: `pokemon-artwork`(public, `normal/025.webp`, `shiny/025.webp`), `quiz-silhouette`(public, `{opaque}.webp`), `avatars`(Should). `config.toml`에 선언하고 GitHub 연동이 production에 생성한다. storage.objects 정책이 없으므로 목록 조회·쓰기는 secret key만 가능
- DB 반영은 `sync_pokemon_catalog` RPC 한 번으로 한다 (부분 반영 방지)
- 설명: 언어별 최신 버전 flavor text, 제어문자 정리
- 진화: 체인을 1–151로 절단 (2세대 이후 분기·prebaby 제외)
- opaque key는 "개발자도구로 바로 보이지 않는" 수준의 방어다. 매핑표를 직접 만드는 것까지는 막지 않는다 (랭킹 도입 시 재검토).

## 6. DB 스키마

```sql
-- 도감 (public read)
pokemon (
  id smallint pk check (id between 1 and 151),
  name_ko, name_en, name_ja, genus_ko, genus_en, genus_ja text not null,
  type_1 pokemon_type not null, type_2 pokemon_type check (type_2 is distinct from type_1),
  height_dm, weight_hg smallint not null,          -- PokeAPI 원 단위, UI에서 변환
  hp, attack, defense, special_attack, special_defense, speed smallint not null,
  description_ko, description_en, description_ja text not null,
  evolves_from_id smallint references pokemon,
  evolution jsonb,                                  -- {trigger, minLevel, item:{ko,en,ja}}
  artwork_path, shiny_artwork_path text not null,
  is_legendary, is_mythical boolean not null default false
)
ability (id, slug, name_ko/en/ja, description_ko/en/ja)
pokemon_ability (pokemon_id, ability_id, slot, is_hidden, pk (pokemon_id, slot))

-- 퀴즈 비밀 데이터: private 스키마 (Data API 비노출)
private.pokemon_quiz (pokemon_id pk, silhouette_path text unique not null, answer_keys text[] not null)

-- 동기화: 전체 카탈로그를 한 트랜잭션으로 upsert (service_role 전용, idempotent)
public.sync_pokemon_catalog(p_abilities, p_pokemon, p_pokemon_abilities, p_quiz jsonb)

-- 사용자
profile (id uuid pk → auth.users on delete cascade, nickname 2–20자, created_at)  -- signup trigger, 아바타는 Google 메타데이터 사용

-- 게임
quiz_run   (id, user_id, status active|finished, end_reason fainted|fled, score, combo, best_combo,
            rounds_cleared, skips_left, started_at, finished_at)
           unique (user_id) where status = 'active'
quiz_round (id, run_id, user_id, seq, pokemon_id, status active|cleared|failed|skipped,
            hp 0–3, attempts, hint_used, score_gained, sticker_variant, created_at, resolved_at)
           unique (run_id, seq); unique (run_id) where status = 'active'
user_sticker (user_id, pokemon_id, variant normal|shiny, quantity > 0,
              first_obtained_at, last_obtained_at, pk (user_id, pokemon_id, variant))

my_stats view (security_invoker = true)
```

`sticker`, `game_result` 테이블은 두지 않는다. 스티커 = 포켓몬 × variant, 결과·최근 획득 = `quiz_round`.

### 권한 (RLS + grants)

전제: publishable key는 공개되어 있다. `anon`/`authenticated`에 허용한 것은 브라우저에서 직접 호출 가능하다고 가정한다.

| 대상                                    | anon / authenticated                                                 |
| --------------------------------------- | -------------------------------------------------------------------- |
| `pokemon`, `ability`, `pokemon_ability` | SELECT                                                               |
| `private.*`                             | 없음                                                                 |
| `profile`                               | 본인 SELECT, `nickname` 컬럼만 UPDATE                                |
| `quiz_run`, `user_sticker`              | 본인 SELECT                                                          |
| `quiz_round`                            | 본인 SELECT, `status <> 'active'`만 (진행 중 문제 숨김)              |
| 게임 RPC                                | EXECUTE 없음 — `revoke execute ... from public, anon, authenticated` |

계층: `proxy.ts`(세션 갱신·locale) → Server Action / RSC(`getClaims()`로 사용자 확인) → RLS(최종 방어선).

## 인증

- 도감은 로그인 없이 쓴다. 퀴즈 PLAY 시 세션이 없으면 **익명 로그인**(퀴즈 PR에서 연결).
- Google: 비로그인 사용자는 `signInWithOAuth`, **게스트는 `linkIdentity`**로 같은 user id에 Google을 붙여 컬렉션을 유지한다.
- `/auth/callback`(Route Handler, proxy 제외): PKCE code → 세션 cookie 교환 후 `next`로 이동. `next`는 같은 origin 경로만 허용(`//evil`, `/\evil` 차단). 실패는 `/[locale]/auth/error?code=`로 보낸다(`identity_already_exists`: 이미 다른 계정에 연결된 Google).
- 헤더 계정 영역은 **client island**다. layout에서 cookie를 읽으면 모든 정적 페이지가 요청마다 렌더링되므로, 브라우저에서 `getClaims()`로 세션을 읽고 profile은 RLS 아래에서 조회한다.
- profile은 `auth.users` insert trigger(`private.create_profile_for_new_user`, security definer)가 만든다. 기본 닉네임 `Trainer-XXXX`(언어 중립). 본인만 조회, `nickname` 컬럼만 수정 가능.
- 원격 설정은 대시보드에서 한다(`config.toml`의 auth 설정은 GitHub 연동으로 배포되지 않음): Anonymous sign-ins, Manual linking, Google provider, Site URL, Redirect URLs(production, preview 와일드카드).
- Could: 이미 있는 Google 계정으로 로그인할 때 게스트 컬렉션 병합, 오래된 익명 계정 정리 cron, CAPTCHA.

## 7. 게임 API (Server Actions)

`features/quiz/actions.ts`. Zod 입력 검증, 사용자는 항상 세션에서(`getClaims().sub`), 결과는 `{ ok: true, data } | { ok: false, code }`(문구는 클라이언트가 번역).

| Action                                      | 동작                                                                                                                |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `startQuiz({ locale })`                     | 세션 없으면 익명 로그인. 진행 중 run이 있으면 이어하기, 없으면 run + 첫 round                                       |
| `submitAnswer({ roundId, answer, locale })` | wrong `{ run, round }` / fainted `{ run, revealed }` / cleared `{ run, revealed, scoreGained, sticker, nextRound }` |
| `requestHint({ roundId, locale })`          | 이름 절반 공개, 콤보 리셋                                                                                           |
| `skipQuizRound({ roundId, locale })`        | 스킵한 포켓몬 공개 + 다음 round                                                                                     |
| `fleeQuiz({ locale })`                      | 진행 중 run 종료 + 정답 공개                                                                                        |

구조 — "TS가 판단, SQL이 원자적 커밋":

- `service.ts`: 저장소에서 신뢰할 수 있는 상태를 읽고 `rules.ts`를 적용해 전이를 계산한다. 저장소는 인터페이스(`repository.ts`)라서 단위 테스트는 in-memory 구현으로, 통합 테스트는 실제 Supabase 구현(`repository.supabase.ts`)으로 돈다.
- 브라우저로 가는 round에는 포켓몬 id·이름이 없다. 실루엣(opaque 파일명)과 이름 마스크뿐이다.
- RPC(모두 service_role 전용): `quiz_round_secret`(정답 키·실루엣, private 스키마), `quiz_start_run`, `quiz_commit`.
- `quiz_commit` 한 번에: round 갱신(`version` 낙관적 잠금) → run 갱신 → 스티커 +1 → 다음 round 생성. 정답과 다음 문제 생성이 같은 트랜잭션이라 "클리어했는데 다음 문제가 없는" 상태가 없다. 같은 답을 동시에 두 번 보내면 하나만 적용되고 나머지는 `conflict`.
- 도망가기는 진행 중 round를 `skipped`로 닫고 run을 `fled`로 끝낸다.
- 난수(다음 포켓몬, 색違い)는 서버의 CSPRNG(`crypto.getRandomValues`).
- `supabase/seed.sql`: 로컬·CI용 최소 카탈로그(3마리). production에는 적용되지 않는다.

### 퀴즈 화면

- `/[locale]/quiz`는 정적 셸이고 게임은 client island(`QuizGame`)다.
- Zustand `useQuizStore`: 서버 액션을 호출하고 결과를 저장한다. phase(`lobby → intro → menu ⇄ answering → judging → hit | reveal → reward → … → gameover`)는 결과를 어떤 순서로 연출할지만 정한다. 판정은 항상 서버.
- 자동으로 넘어가는 phase(intro/hit/reveal)는 `BattleStage`가 타이머로 `advance()`한다. reduced motion이면 대기 시간을 줄인다.
- 레거시 조작: 2×2 메뉴(싸운다/아이템/포켓몬/도망간다), 방향키 이동(roving tabindex), 숫자 1–4 단축키, 입력창 Esc.
- 연출: 실루엣 등장(spring), 오답 시 HP 패널 흔들림, 정답 시 flash + 실루엣→아트워크, 스티커 카드 낙하·뒤집기(색違い는 홀로그램 광택), 콤보 pop.
- 새로고침하면 로비로 돌아오고, 시작을 누르면 서버의 진행 중 run을 이어한다.

## 8. 렌더링 전략

| Route                         | 렌더링      | 경계                                                                      |
| ----------------------------- | ----------- | ------------------------------------------------------------------------- |
| `/[locale]`                   | 정적 (캐시) | RSC가 slim list → `PokedexExplorer`(C)가 필터·검색·정렬·layout 애니메이션 |
| `/[locale]/pokemon/[id]`      | SSG 151 × 3 | 대부분 RSC, `StatBars`만 C                                                |
| `/[locale]/quiz`              | 동적        | 서버 셸 + `QuizGame`(C, Zustand)                                          |
| `/[locale]/collection`, `/me` | 동적        | RSC 조회 + 카드 연출 C                                                    |

- 도감 데이터는 cookie 없는 public client(`lib/supabase/public.ts`)로 읽고, 페이지는 **빌드 시 locale별로 prerender**한다. 카탈로그는 sync할 때만 바뀌므로 **remote sync 후에는 재배포**해야 화면에 반영된다.
- Cache Components(`"use cache"`)는 아직 켜지 않는다. 정적 페이지 안에 사용자별 영역(상세의 "내 스티커" 배지 등)이 필요해질 때 도입을 검토한다.
- 이미지는 `next/image` 최적화를 쓴다(Storage public URL만 `remotePatterns` 허용). 브라우저에는 webp로 변환·리사이즈되어 원본 대비 약 절반 크기. 로컬 Supabase(127.0.0.1)를 가리킬 때만 `dangerouslyAllowLocalIP`를 켠다.
- 상세 페이지: layout이 `locale`, page가 `id`를 생성(top-down)해 151 × 3 = 453페이지를 빌드 시 생성한다. `dynamicParams = false`라 목록 밖 id는 DB 조회 없이 404. 조회 함수는 React `cache`로 감싸 `generateMetadata`와 페이지가 같은 쿼리를 한 번만 실행한다. 진화 라인은 목록 쿼리(`evolves_from_id`, `evolution`)로 계산하고 jsonb `evolution`은 Zod로 읽는다.
- 도감 탐색: 서버가 카드 151장을 렌더링해 `cards` prop으로 `PokedexExplorer`(C)에 넘기고, 클라이언트는 어떤 카드를 어떤 순서로 보일지만 정한다(카드 렌더링 코드가 클라이언트 번들에 들어가지 않음). `useSearchParams` 때문에 Explorer는 Suspense 아래에서 클라이언트 렌더링되고, fallback은 필터 없는 전체 그리드라 prerender HTML에 카드가 모두 들어간다.
- 필터 상태: URL(`?q=&type=&sort=`)로 초기화 → 이후 로컬 state가 기준, URL은 `history.replaceState`로 따라간다(IME 입력과 충돌 방지, 뒤로가기 오염 방지). URL 값은 Zod로 검증하고 잘못된 값은 기본값으로.
- Motion: `LazyMotion`으로 애니메이션 엔진을 지연 로딩(`domMax`, layout 애니메이션 필요), `MotionConfig reducedMotion="user"`, spring 프리셋은 `lib/motion.ts`.
- 타입 색은 `features/pokemon/types.ts`가 단일 출처(base/soft/ink, 대비 테스트). 컴포넌트는 CSS 변수(`--type`, `--type-soft`, `--type-ink`, `--type-2`)로 소비한다.

## 9. i18n

- next-intl, `app/[locale]/…`, locales `ko`(기본)·`en`·`ja`, `localePrefix: 'always'`
- locale은 `next/root-params`로 읽는다 (Next 16.3+). `setRequestLocale`은 deprecated라 쓰지 않는다. URL 밖의 404는 `global-not-found`, locale 안의 404는 `[locale]/not-found`
- `messages/{ko,en,ja}.json`: `nav.*`, `dex.*`, `quiz.battle.*`, `quiz.result.*`, `collection.*`, `errors.<code>`
- 포켓몬 컬럼 선택 helper `localize(row, 'name', locale)`
- 한국어 조사(이/가)는 받침 판별 helper

## 10. UI

- 톤: 도감·상세·컬렉션 = 밝고 컬러풀한 카드 / 퀴즈·마이페이지 = Pokédex 프레임 + 픽셀 폰트 배틀 UI
- 토큰: 브랜드(`dex-red`, `dex-screen`, `volt`), 타입 18색 × `{base, soft, ink}`, rarity, 시맨틱(`surface`, `ink`, `muted`) — 다크모드는 값 교체만으로
- 폰트: 본문 Noto Sans KR/JP, 배틀 Galmuri(ko/en) / DotGothic16(ja)
- 에셋: 게임에서 추출한 래스터 이미지 재사용 금지. 트레이너 등은 자체 SVG. 포켓몬 아트워크만 예외 (팬 프로젝트 고지)
- Motion: spring 프리셋 3개(`snappy`, `bouncy`, `gentle`), `LazyMotion`, `useReducedMotion` 대응
- 배틀 phase: `intro → answering → judging → hit | cleared → rewarding → … → fainted`. 서버 응답을 store에 먼저 저장하고 연출은 재생만 한다
- 접근성: 방향키·숫자키·Esc, `aria-live` 메시지, 실루엣 alt에 정답 미노출, 색 외 정보 병기

## 11. 테스트

| 도구                    | 대상                                                    |
| ----------------------- | ------------------------------------------------------- |
| Vitest                  | `rules.ts`, `normalize.ts`, sync 정규화                 |
| Vitest + local Supabase | RLS·RPC 권한                                            |
| RTL                     | `PokedexExplorer`, `BattleMenu`, `AnswerBox`            |
| Playwright              | 도감→검색→상세→언어 전환 / PLAY→오답→정답→스티커→컬렉션 |
