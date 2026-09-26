# Pokepedia System Design

Pokepedia의 시스템 설계, 비즈니스 로직, 개발 방식을 정리한 문서다. 레거시 JSP 프로젝트(ottuck/PikapediaProject)를 분석한 뒤 확정한 결정을 기록한다.
구조를 바꾸는 변경은 이 문서를 먼저 갱신한다. 프로젝트 소개와 실행 방법은 [README](../README.md)에 있다.

- **[L] Legacy Core**: 레거시에서 복원한 기능
- **[R] Remake Enhancement**: 리메이크에서 새로 추가한 기능
- 화면에서는 "게임"이라고 부르지만, 코드와 URL은 `quiz`(`features/quiz`, `/[locale]/quiz`)를 쓴다.

**목차**

- [Ⅰ. 시스템 설계](#ⅰ-시스템-설계): 범위, 구성도, 환경, 데이터 파이프라인, DB 스키마·권한, 렌더링, i18n
- [Ⅱ. 비즈니스 로직](#ⅱ-비즈니스-로직): 요구사항, 게임 규칙, 게임 API, 계정, 리더보드, 컬렉션
- [Ⅲ. 개발](#ⅲ-개발): 배포 파이프라인, DB 변경, 환경변수, UI 구현, 테스트
- [Ⅳ. 만들면서 고민한 것들](#ⅳ-만들면서-고민한-것들): 위 결정들을 왜 그렇게 했는지 짧게

---

# Ⅰ. 시스템 설계

## 1. 범위와 확정 결정

| 영역   | 결정                                                                                           |
| ------ | ---------------------------------------------------------------------------------------------- |
| 포켓몬 | 1세대 #001–151만. 타입은 **현재 공식 기준**(피피 = 페어리)                                     |
| 데이터 | PokeAPI → `scripts/sync-pokemon`(1회) → Supabase DB + Storage. **런타임 PokeAPI 호출 없음**    |
| 이미지 | 아트워크(normal/shiny) webp를 Storage에 둔다. 실루엣은 동기화할 때 미리 만들고 opaque key 사용 |
| 인증   | Supabase 익명 로그인 + Google OAuth(identity linking)                                          |
| i18n   | UI 전체 ko / en / ja(next-intl), 포켓몬 데이터도 3개 언어                                      |
| 게임   | HP는 round당 3 [L], 점수·콤보는 run 단위 [R]                                                   |
| 보상   | 맞힌 포켓몬 스티커 확정 [L] + variant(normal/shiny) 추첨 [R]                                   |
| 상태   | 서버 데이터는 RSC, Zustand는 게임 화면만                                                       |
| 제외   | TanStack Query, Drizzle, GSAP, R2. 필요해질 때 검토                                            |

## 2. 시스템 구성

```mermaid
flowchart LR
  UI["브라우저<br/>RSC 페이지 + client island"]
  subgraph Vercel["Vercel · hnd1 도쿄"]
    Pages[페이지 렌더링]
    Actions[Server Actions<br/>게임 · 프로필 · 병합]
  end
  subgraph Supabase["Supabase · ap-northeast-1 도쿄"]
    Auth[Auth<br/>익명 · Google]
    DB[(Postgres<br/>RLS · RPC · pg_cron)]
    Storage[(Storage<br/>아트워크 · 실루엣 · 아바타)]
  end
  PokeAPI[(PokeAPI)] --> Sync[scripts/sync-pokemon<br/>수동 1회]
  Sync --> DB & Storage
  UI --> Pages -- publishable key --> DB
  UI --> Actions -- secret key · RPC --> DB
  UI -- publishable key · RLS --> DB
  UI --> Auth
  UI -- 이미지 --> Storage
```

- 브라우저는 publishable key로 RLS가 허용한 것만 읽는다. 게임 상태를 바꾸는 쓰기는 모두 Server Action이 secret key로 RPC를 호출해서 한다.
- 지역: Supabase 프로젝트는 AWS `ap-northeast-1`(도쿄)에 있다. 서버 함수(Server Action, 동적 페이지, 라우트 핸들러)도 `vercel.json`의 `regions: ["hnd1"]`로 도쿄에서 실행해 DB 왕복을 수 ms로 유지한다. 기본값 `iad1`(워싱턴)에서는 쿼리당 약 170ms였고, 게임 답변 한 번이 1.6–2.5s에서 약 0.25s로 줄었다. DB 지역을 옮기면 이 값도 함께 바꾼다.
- 모니터링: Vercel Web Analytics(`@vercel/analytics`, 쿠키를 쓰지 않는 페이지뷰)와 Speed Insights(`@vercel/speed-insights`, 실제 사용자의 Core Web Vitals)를 root layout(`app/[locale]/layout.tsx`)에 둔다. 스크립트는 `/_vercel/*`에서 로드되므로 proxy matcher에서 제외돼 있다. 두 기능은 Vercel 배포에서만 수집한다.

## 3. 환경 구성

단일 remote Supabase 프로젝트를 운영한다(개인 프로젝트 규모).

| 환경              | Supabase                       | 비고                                                   |
| ----------------- | ------------------------------ | ------------------------------------------------------ |
| Local             | `pnpm supabase start` (Docker) | 모든 DB 변경을 먼저 여기서 검증                        |
| Vercel Production | remote `pokepedia`             | main 배포                                              |
| Vercel Preview    | remote `pokepedia` (동일)      | PR 확인용. **DB를 변경하는 작업을 자동 실행하지 않음** |

- Preview는 production 데이터를 공유한다. Preview에서 게임을 하면 실제 데이터가 된다.
- PR별 Supabase Preview Branching은 유료 기능이라 쓰지 않는다(PR의 `Supabase Preview: skipping`은 정상). 대신 migration은 CI에서 local Supabase로 검증한다.
- Preview URL에서 OAuth를 쓰려면 Supabase Auth Redirect URLs에 Vercel preview 패턴을 추가한다.

## 4. 데이터 파이프라인

```
PokeAPI ──(로컬에서 1회 실행) scripts/sync-pokemon
  ① 1–151 species / pokemon / evolution-chain / ability 조회 (동시 5개, .cache/pokeapi/ 원본 캐시)
  ② Zod로 원본 검증 → 도메인 row 정규화
  ③ sharp: 아트워크 PNG → webp 512 (normal, shiny) + 검은 실루엣 webp
  ④ Storage 업로드 + DB upsert (idempotent)
```

- 실행: `pnpm sync:pokemon`(기본 `.env.local`). remote 대상은 `--env-file .env.remote.local --yes` 없이는 거부한다.
- 코드: `scripts/sync-pokemon/`: `pokeapi.ts`(Zod + 캐시), `transform.ts`(순수 변환, 단위 테스트), `images.ts`(sharp), `index.mts`(실행).
- 이미지 인코딩: webp quality 85, effort 4(effort 6은 장당 약 75배 느리고 용량 차이는 약 1%). 원본이 475px라 확대하지 않는다.
- 정답 키 정규화는 게임 채점과 같은 `src/features/quiz/normalize.ts`를 쓴다.
- 실루엣 key = `HMAC-SHA256(SILHOUETTE_SECRET, id)` 앞 16자리. 개발자도구로 바로 보이지 않는 수준의 방어이고, 매핑표를 직접 만드는 것까지는 막지 않는다.
- 버킷: `pokemon-artwork`(public, `normal/025.webp`, `shiny/025.webp`), `quiz-silhouette`(public, `{opaque}.webp`), `avatars`(§14). `config.toml`에 선언하고 GitHub 연동이 production에 만든다. 아트워크·실루엣 버킷에는 storage.objects 정책이 없어서 목록 조회와 쓰기는 secret key만 가능하다.
- DB 반영은 `sync_pokemon_catalog` RPC 한 번으로 한다(부분 반영 방지).
- 설명: 언어별 최신 버전 flavor text, 제어문자 정리.
- 진화: 체인을 1–151로 자른다(2세대 이후 분기·베이비 포켓몬 제외).
- 도감은 빌드 시 prerender되므로, remote 동기화 결과는 **다음 배포 후에** 화면에 보인다.

## 5. DB 스키마

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

-- 게임 비밀 데이터: private 스키마 (Data API 비노출)
private.pokemon_quiz (pokemon_id pk, silhouette_path text unique not null, answer_keys text[] not null)

-- 동기화: 전체 카탈로그를 한 트랜잭션으로 upsert (service_role 전용, idempotent)
public.sync_pokemon_catalog(p_abilities, p_pokemon, p_pokemon_abilities, p_quiz jsonb)

-- 사용자
profile (id uuid pk → auth.users on delete cascade, nickname 2–20자,
         avatar_path (자기 폴더 경로만 허용하는 check), created_at)   -- signup trigger가 생성

-- 게임
quiz_run   (id, user_id, status active|finished, end_reason fainted|fled, score, combo, best_combo,
            rounds_cleared, skips_left, started_at, finished_at)
           unique (user_id) where status = 'active'
quiz_round (id, run_id, user_id, seq, pokemon_id, status active|cleared|failed|skipped,
            hp 0–3, attempts, hint_used, score_gained, sticker_variant, version, created_at, resolved_at)
           unique (run_id, seq); unique (run_id) where status = 'active'
user_sticker (user_id, pokemon_id, variant normal|shiny, quantity > 0,
              first_obtained_at, last_obtained_at, pk (user_id, pokemon_id, variant))

-- 계정
private.guest_merge_ticket (token_hash pk, from_user_id, expires_at, consumed_at, consumed_by)  -- §13

my_stats view (security_invoker = true)
```

`sticker`, `game_result` 테이블은 두지 않는다. 스티커 = 포켓몬 × variant, 결과와 최근 획득은 `quiz_round`에서 읽는다.

### 권한 (RLS + grants)

전제: publishable key는 공개되어 있다. `anon`/`authenticated`에 허용한 것은 브라우저에서 직접 호출할 수 있다고 가정한다.

| 대상                                    | anon / authenticated                                                |
| --------------------------------------- | ------------------------------------------------------------------- |
| `pokemon`, `ability`, `pokemon_ability` | SELECT                                                              |
| `private.*`                             | 없음                                                                |
| `profile`                               | 본인 SELECT, `nickname` 컬럼만 UPDATE                               |
| `quiz_run`, `user_sticker`              | 본인 SELECT                                                         |
| `quiz_round`                            | 본인 SELECT, `status <> 'active'`만(진행 중 문제 숨김)              |
| 게임·병합·정리 RPC                      | EXECUTE 없음(`revoke execute ... from public, anon, authenticated`) |
| `leaderboard`, `my_leaderboard_rank`    | EXECUTE(공개 창구, §15)                                             |
| storage `avatars`                       | 비게스트 본인 폴더만 INSERT/DELETE(§14)                             |

- 새 테이블에는 기본 권한이 없다(`api.auto_expose_new_tables = false`). migration마다 `anon`, `authenticated`, `service_role`에 필요한 것만 GRANT한다.
- secret key는 Postgres의 `service_role` 권한으로 동작한다. "service_role 전용"은 secret key를 쓰는 서버 코드 전용이라는 뜻이다.
- 계층: `proxy.ts`(세션 갱신·locale) → Server Action / RSC(`getClaims()`로 사용자 확인) → RLS(최종 방어선).

## 6. 렌더링 전략

| Route                                  | 렌더링      | 경계                                                                      |
| -------------------------------------- | ----------- | ------------------------------------------------------------------------- |
| `/[locale]`                            | 정적 (캐시) | RSC가 slim list → `PokedexExplorer`(C)가 필터·검색·정렬·layout 애니메이션 |
| `/[locale]/pokemon/[id]`               | SSG 151 × 3 | 대부분 RSC, 상세 카드·배지만 C                                            |
| `/[locale]/quiz`                       | 정적 셸     | 서버 셸 + `QuizGame`(C, Zustand)                                          |
| `/[locale]/leaderboard`                | ISR 60초    | 목록은 RSC, "내 순위"만 C                                                 |
| `/[locale]/collection`, `/[locale]/me` | 동적        | 세션 cookie로 RSC 조회 + 카드 연출 C                                      |

- 도감 데이터는 cookie 없는 public client(`lib/supabase/public.ts`)로 읽고, 페이지는 **빌드 시 locale별로 prerender**한다.
- 상세 페이지: layout이 `locale`, page가 `id`를 생성(top-down)해 151 × 3 = 453페이지를 빌드 시 만든다. `dynamicParams = false`라 목록 밖 id는 DB 조회 없이 404다. 조회 함수는 React `cache`로 감싸 `generateMetadata`와 페이지가 같은 쿼리를 한 번만 실행한다. 진화 라인은 목록 쿼리(`evolves_from_id`, `evolution`)로 계산하고 jsonb `evolution`은 Zod로 읽는다.
- 헤더 계정 영역은 **client island**다. layout에서 cookie를 읽으면 모든 정적 페이지가 요청마다 렌더링되므로, 브라우저에서 `getClaims()`로 세션을 읽고 profile은 RLS 아래에서 조회한다. 상세의 "내 스티커" 배지도 같은 방식이다.
- 도감 탐색: 서버가 카드 151장을 렌더링해 `cards` prop으로 `PokedexExplorer`(C)에 넘기고, 클라이언트는 어떤 카드를 어떤 순서로 보일지만 정한다(카드 렌더링 코드가 클라이언트 번들에 들어가지 않음). `useSearchParams` 때문에 Explorer는 Suspense 아래에서 클라이언트 렌더링되고, fallback은 필터 없는 전체 그리드라 prerender HTML에 카드가 모두 들어간다.
- 필터 상태: URL(`?q=&type=&sort=`)로 초기화한 뒤에는 로컬 state가 기준이고, URL은 `history.replaceState`로 따라간다(IME 입력 충돌과 뒤로가기 오염 방지). URL 값은 Zod로 검증하고 잘못된 값은 기본값으로 바꾼다.
- 이미지는 `next/image` 최적화를 쓴다(Storage public URL만 `remotePatterns` 허용). 원본 대비 약 절반 크기로 전송된다. 로컬 Supabase(127.0.0.1)를 가리킬 때만 `dangerouslyAllowLocalIP`를 켠다.
- OG 이미지(`opengraph-image.tsx`): 사이트 기본 이미지와 포켓몬별 이미지(3 + 151 × 3)를 빌드 시 만든다. 메타데이터 이미지 라우트는 레이아웃의 `locale`을 물려받지 않으므로 `generateStaticParams`가 locale × id를 직접 반환한다(빠뜨리면 prerender되지 않고 `dynamicParams = false` 때문에 404). ImageResponse는 webp와 woff2를 읽지 못해 아트워크는 빌드 시 sharp로 PNG로 바꾸고, 글꼴은 Google Fonts의 `text=` 부분집합을 워커당 한 번만 받는다. 다운로드는 재시도한다.
- Cache Components(`"use cache"`)는 아직 켜지 않는다.

## 7. i18n

- next-intl, `app/[locale]/…`, locales `ko`(기본)·`en`·`ja`, `localePrefix: 'always'`.
- locale은 `next/root-params`로 읽는다(Next 16.3+). `setRequestLocale`은 deprecated라 쓰지 않는다. URL 밖의 404는 `global-not-found`, locale 안의 404는 `[locale]/not-found`.
- UI 문구는 `messages/{ko,en,ja}.json`에만 둔다. 서버 코드는 `code`만 돌려주고 번역은 클라이언트가 한다. `ko.json`이 타입의 기준이고, 나머지 언어의 키가 같은지 테스트한다.
- 포켓몬 데이터는 `localize(row, 'name', locale)`로 locale 컬럼을 고른다. 한국어 조사(이/가)는 받침 판별 helper를 쓴다.
- 클라이언트 메시지: `NextIntlClientProvider`가 locale 메시지 전체를 넘긴다. 약 3KB(gzip)라 네임스페이스별 전달 최적화는 하지 않는다. 30KB를 넘으면 다시 검토한다.

### 번들 메모 (2026-09-25 측정, 클라이언트 JS gzip)

- 모든 페이지: react-dom과 Next 런타임 약 69KB, supabase-js(헤더 계정 메뉴) 약 66KB, next-intl 약 20KB.
- zod: 클라이언트에 닿는 모듈은 `import * as z from "zod/mini"`로 쓴다(81KB → 16KB). 서버 전용 코드는 classic zod를 쓴다. `import { z }`는 네임스페이스 전체를 끌어오므로 쓰지 않는다.
- motion layout 기능(약 43KB)은 LazyMotion으로 나중에 로드한다.

---

# Ⅱ. 비즈니스 로직

## 8. 요구사항

모두 구현되어 있다.

### Must (MVP)

- **도감**: 151마리 한 페이지 그리드 [L], 타입 필터 [L], 검색(3개 언어 이름·번호) [L], 정렬 [R], URL 상태 동기화 [R], 카드 hover 연출 + 필터 layout 재배치 [R]
- **상세**: 아트워크·번호·이름·타입·키/몸무게·설명·타입 그라데이션 배경 [L], 분류·능력치·특성·진화(1세대 내)·이전/다음 [R]
- **게임**: 싸우다/가방/포켓몬/도망치다 + 방향키 [L], round HP 3 [L], 힌트(이름 절반) [L], 스킵 [L], 서버 판정·3개 언어 정답 허용·점수/콤보 HUD·등장/정답/오답/게임오버 연출 [R]
- **보상/컬렉션**: 스티커 지급 [L], shiny variant [R], `N / 151` + `?` 미획득 카드 [L], 수량·shiny 수집률·획득 연출 [R]
- **계정**: 익명 → Google 연결 [R], 마이페이지 닉네임 [L] + 통계(플레이 수·클리어율·최고 점수·최고 콤보·최근 획득) [R]
- **공통**: ko/en/ja [L], Pokédex 프레임 모티프 [L], 반응형

### Should / Could

다크모드 [L], 상세의 "내 스티커" 배지, 상세 shiny 토글, 아바타 업로드 [L], 효과음, 리더보드, 스티커 3D tilt, OG 이미지, 비활성 게스트 정리, 게스트 기록 병합

### Not Now

커뮤니티 채팅, 2세대 이후, 결제/가챠, CAPTCHA

## 9. 게임 규칙

모든 수치는 `features/quiz/rules.ts`의 상수이고 순수 함수로 단위 테스트한다.

```
Run   : score, combo, best_combo, skips_left = 3
Round : hp = 3, hint 1회

싸우다(정답)   → round 클리어 → 점수 → 스티커 → 다음 round
싸우다(오답)   → hp −1, combo = 0
  hp 0         → round 실패 → 정답 공개 → run 종료 (fainted)
가방(힌트)     → 현재 locale 이름 앞 절반 공개, combo = 0, 해당 round 점수 ×0.5
포켓몬(스킵)   → skips_left −1, combo = 0, 0점, 스티커 없음
도망치다       → run 종료 (fled)
```

- 점수: `base[hp] × hint × comboMultiplier`, `base = {3: 100, 2: 60, 1: 30}`, `comboMultiplier = 1 + 0.1 × min(combo − 1, 10)`(최대 ×2.0).
- 콤보 보상, shiny 확률: combo 1–4 → 5%, 5–9 → 10%, 10+ → 20%. 힌트를 쓴 round는 5%.
- 힌트는 이름 글자 수의 절반(내림)만 공개한다. 한 글자 이름(뮤)은 아무것도 공개하지 않는다(정답 노출 방지).
- 힌트를 쓴 round도 클리어하면 콤보가 1부터 다시 시작한다.
- 콤보는 오답·힌트·스킵에서 리셋한다(실패하면 run이 끝나므로 "연속 정답"만으로는 의미가 없음).
- 정답 판정은 3개 언어 이름을 모두 받는다. 입력과 정답 키를 같은 규칙으로 정규화한다(대소문자, 전각/반각, 히라가나→가타카나, 공백·기호 제거, 장음 기호는 유지).
- 다음 포켓몬은 이번 run에서 나오지 않은 포켓몬 중에서 고르고, 모두 나온 뒤에만 반복한다. 난수는 서버의 CSPRNG(`crypto.getRandomValues`)다.

## 10. 게임 API (Server Actions)

`features/quiz/actions.ts`. 입력은 Zod로 검증하고, 사용자는 항상 세션에서 정한다(`getClaims().sub`). 결과는 `{ ok: true, data } | { ok: false, code }`이고 문구는 클라이언트가 번역한다.

| Action                                      | 동작                                                                                                                |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `startQuiz({ locale })`                     | 세션이 없으면 익명 로그인. 진행 중 run이 있으면 이어하고, 없으면 run + 첫 round를 만든다                            |
| `submitAnswer({ roundId, answer, locale })` | wrong `{ run, round }` / fainted `{ run, revealed }` / cleared `{ run, revealed, scoreGained, sticker, nextRound }` |
| `requestHint({ roundId, locale })`          | 이름 절반 공개, 콤보 리셋                                                                                           |
| `skipQuizRound({ roundId, locale })`        | 스킵한 포켓몬 공개 + 다음 round                                                                                     |
| `fleeQuiz({ locale })`                      | 진행 중 run 종료 + 정답 공개                                                                                        |

구조: "TS가 판단하고, SQL이 원자적으로 커밋한다".

- `service.ts`: 저장소에서 신뢰할 수 있는 상태를 읽고 `rules.ts`를 적용해 전이를 계산한다. 저장소는 인터페이스(`repository.ts`)라서 단위 테스트는 in-memory 구현으로, 통합 테스트는 실제 Supabase 구현(`repository.supabase.ts`)으로 돈다.
- **정답 비노출**: 브라우저로 가는 round에는 포켓몬 id·이름이 없다. 실루엣(opaque 파일명)과 이름 마스크뿐이다. 진행 중 round는 RLS로도 숨긴다.
- RPC(모두 service_role 전용): `quiz_round_secret`(정답 키·실루엣, private 스키마), `quiz_start_run`, `quiz_commit`.
- **원자적 커밋**: `quiz_commit` 한 번에 round 갱신(`version` 낙관적 잠금) → run 갱신 → 스티커 +1 → 다음 round 생성까지 한다. 정답과 다음 문제 생성이 같은 트랜잭션이라 "클리어했는데 다음 문제가 없는" 상태가 없다. 같은 답을 동시에 두 번 보내면 하나만 적용되고 나머지는 `conflict`다.
- **DB 왕복 최소화**: 정답 한 번은 순차 대기 3번(round·정답·이번 run에서 본 포켓몬을 동시에 조회 → 커밋 → 다음 round), 오답과 힌트는 2번이다. 카탈로그는 메모리 캐시에서 읽는다. 이 횟수는 회귀 테스트로 지킨다.
- 도망치기는 진행 중 round를 `skipped`로 닫고 run을 `fled`로 끝낸다.
- 새로고침하면 로비로 돌아오고, 시작을 누르면 서버의 진행 중 run을 이어한다.

## 11. 인증

- 도감은 로그인 없이 쓴다. 게임 시작 시 세션이 없으면 **익명 로그인**한다.
- Google: 비로그인 사용자는 `signInWithOAuth`, **게스트는 `linkIdentity`**로 같은 user id에 Google을 붙여 기록을 유지한다.
- `/auth/callback`(Route Handler, proxy 제외): PKCE code → 세션 cookie 교환 후 `next`로 이동한다. `next`는 같은 origin 경로만 허용한다(`//evil`, `/\evil` 차단). 실패는 `/[locale]/auth/error?code=`로 보낸다(`identity_already_exists`: 이미 다른 계정에 연결된 Google).
- profile은 `auth.users` insert trigger(`private.create_profile_for_new_user`, security definer)가 만든다. 기본 닉네임은 `Trainer-XXXX`(언어 중립)이고, 본인만 조회하며 `nickname` 컬럼만 수정할 수 있다.
- 원격 Auth 설정은 대시보드에서 한다(`config.toml`의 auth 설정은 GitHub 연동으로 배포되지 않음): Anonymous sign-ins, Manual linking, Google provider, Site URL, Redirect URLs(production, preview 와일드카드).

## 12. 마이페이지

- 닉네임 수정: 2–20자, 앞뒤 공백 제거, 줄바꿈·제로폭 문자 거부. Server Action이 세션의 본인 profile만 바꾼다.
- 통계는 본인 세션 + RLS로 읽는 count/정렬 쿼리로 계산한다(새 권한 없음). 클리어율 = 맞힌 round ÷ (맞힌 + 실패한 round)이고, 스킵·도망 round는 뺀다.

## 13. 게스트 기록 병합과 정리

**병합**: 게스트의 `linkIdentity`가 `identity_already_exists`로 실패하면, 오류 페이지에서 게스트 기록을 그 Google 계정으로 합칠 수 있다.

1. 게스트 세션으로 Server Action `prepareGuestMerge`가 1회용 티켓을 만든다. 무작위 32바이트 토큰의 sha256만 `private.guest_merge_ticket`에 저장하고(10분), 원래 토큰은 httpOnly·Lax·`path=/auth/callback` 쿠키로만 보낸다.
2. 클라이언트가 Google로 `signInWithOAuth`한다(`next=/[locale]/collection`).
3. `/auth/callback`이 code를 교환한 뒤, 새 세션이 게스트가 **아니면** `guest_merge_redeem`(service_role 전용)을 호출한다. 이 함수가 한 트랜잭션으로 티켓을 소비하고, 게스트의 진행 중 게임을 도망 처리한 뒤 run/round를 옮기고 스티커 수량을 더한다. **그다음에만** Admin API로 게스트 user를 지우고 `?merged=1`로 이동한다.

- 쿠키는 callback에 올 때마다(성공이든 실패든) 지운다. 대상 user는 세션에서만 정하고, 게스트 → Google 방향만 허용한다. 티켓은 1회용이고 만료되면 거부된다.

**비활성 게스트 자동 정리**: pg_cron이 매일 18:00 UTC(한국 03:00)에 `cleanup_inactive_guests()`를 실행한다. 다음 조건을 **모두** 만족하는 계정만 `auth.users`에서 지우고, profile·게임·병합 티켓은 cascade로 함께 지워진다.

- 익명(게스트)이다.
- 마지막 활동이 60일보다 오래됐다.
- **스티커가 0장**이다. 한 장이라도 있으면 기간과 상관없이 지우지 않는다.
- 진행 중인 게임이 없다.
- "마지막 활동"은 다음 중 가장 늦은 시각이다: 계정 생성(첫 게임), 마지막 로그인, 세션 갱신(로그인 상태로 방문하면 proxy가 만료된 토큰을 갱신하므로 둘러보기만 해도 기록됨), 마지막 게임 시작·종료.
- 함수는 `security definer`이고 service_role만 실행할 수 있다(`p_dry_run`으로 개수만 확인 가능). 한 번에 최대 1000명씩 지운다.

## 14. 아바타

Google 계정만 쓸 수 있다.

- 마이페이지에서 사진을 고르면 브라우저가 가운데를 정사각형으로 잘라 256px webp로 만든다. webp로 인코딩하지 못하는 브라우저에서는 jpeg로 만들고, 위치 정보 같은 메타데이터도 이때 사라진다.
- 공개 버킷 `avatars`(512KiB, webp/jpeg)의 `{user_id}/{timestamp}.{webp|jpg}`에 **브라우저가 직접** 올린다. 매번 새 이름이라 CDN 캐시 문제가 없다.
- storage.objects 정책: 비게스트(`is_anonymous` false)만 자기 폴더에 올리고 지울 수 있다.
- 그다음 Server Action `setAvatar`가 세션에서 비게스트와 경로를 다시 확인하고 `profile.avatar_path`를 바꾼 뒤 이전 파일을 지운다. 저장에 실패하면 이전 파일을 남긴다. check 제약이 자기 폴더 경로만 허용한다.
- 표시 우선순위: 올린 사진 → Google 계정 사진(https만) → 이니셜. 헤더와 마이페이지에만 쓰고 **리더보드에는 보여 주지 않는다**.

## 15. 리더보드

- `/[locale]/leaderboard`: 사용자마다 **한 판 최고 점수**를 하나씩 뽑아 점수순으로 보여 준다(동점은 같은 순위, 먼저 달성한 기록이 위). 게스트도 포함한다.
- 공개 정보는 **닉네임, 점수, 그 판의 최고 콤보**뿐이다. user id, 이메일, Google 이름은 내보내지 않는다. `quiz_run`과 `profile`의 RLS(본인만)는 그대로 두고, `security definer` 함수 `leaderboard(limit)`(anon/authenticated, 최대 100)가 유일한 공개 창구다. 내 순위는 `my_leaderboard_rank()`(authenticated, `auth.uid()` 기준)로 브라우저에서 읽는다.
- 닉네임이 유일하지 않아 목록에서 "나"를 강조하지 않고 별도 카드로 보여 준다.

## 16. 컬렉션

- `/[locale]/collection`, `/[locale]/me`는 요청마다 서버 렌더링한다(세션 cookie를 읽기 때문). 동적 페이지라 Next가 `Cache-Control: private, no-store`로 응답한다.
- 스티커는 사용자 세션의 server client로 읽어서 RLS가 본인 것만 돌려준다(secret key 불필요).
- 151칸 전체를 보여 주고 미획득은 `?` 카드(레거시 빈 슬롯)다. 색이 다른 스티커가 있으면 색이 다른 아트워크와 금색 테두리를 쓴다.
- 필터(전체/모은 것/못 모은 것/색이 다른)는 클라이언트에서 하고, 카드는 도감처럼 서버 렌더링 결과를 prop으로 넘긴다.
- 게스트는 "Google 계정에 저장" 배너를 본다(`linkIdentity`).

---

# Ⅲ. 개발

## 17. 배포 파이프라인

```
feature branch → PR ─┬─ GitHub CI (lint / typecheck / format / test / DB test / E2E)
                     └─ Vercel Preview build
                → self-review → 위험도 판단 ─ 저위험: squash merge
                                            └ 고위험: 사용자 승인 후 merge
main ─┬─ Vercel Production 자동 배포
      └─ Supabase GitHub integration: 신규 migrations 자동 적용
      → post-deploy 확인 (배포 상태 + production smoke test)
```

- 위험도 분류와 merge 조건은 `CLAUDE.md` § Merge policy가 기준이다.
- CI(`.github/workflows/ci.yml`) 잡: `check`(lint, typecheck, format, 단위 테스트), `db`(local Supabase로 migration 적용, schema lint, 생성 타입 drift 확인, RLS·RPC 테스트), `e2e`(Playwright 핵심 여정).
- **문서만 바뀐 PR은 CI를 돌리지 않는다**: `**/*.md`, `docs/**`만 바뀌면 워크플로가 실행되지 않는다(`paths-ignore`). 코드와 문서가 함께 바뀌면 전부 실행된다.

## 18. DB 변경 흐름

| 대상                                           | 적용 방식                                                                  |
| ---------------------------------------------- | -------------------------------------------------------------------------- |
| Schema (`supabase/migrations`)                 | local 검증 → PR → **main merge 시 Supabase integration이 자동 적용**       |
| Pokémon 데이터·이미지 (`scripts/sync-pokemon`) | **수동**, 사용자가 명시적으로 요청할 때만 remote에 실행(idempotent upsert) |
| 사용자 데이터                                  | 앱을 통해서만. 대량 변경·삭제는 사용자 승인                                |

- migration은 현재 배포된 코드와 호환되어야 한다(expand → 코드 전환 → contract). merge 후 Vercel과 Supabase는 병렬로 배포되므로 순서가 보장되지 않는다.
- DB 롤백은 하지 않는다. 문제가 생기면 새 migration으로 고친다(forward fix). 이미 머지한 migration은 고치지 않는다.
- Vercel build/deploy 단계에 migration·seed·reset을 넣지 않는다. production에는 seed file이 적용되지 않는다.
- `supabase/seed.sql`: 로컬·CI용 최소 카탈로그(3마리, 이미지 없음).
- migration 후 `pnpm db:types`로 `database.types.ts`를 다시 만든다(CI가 drift를 확인).

## 19. 환경변수

| 변수                                   | 노출             | Local             | Vercel (Prod + Preview)   |
| -------------------------------------- | ---------------- | ----------------- | ------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | public           | local CLI URL     | remote URL                |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | public           | local publishable | remote `sb_publishable_…` |
| `SUPABASE_SECRET_KEY`                  | server only      | local secret      | remote `sb_secret_…`      |
| `SILHOUETTE_SECRET`                    | seed script only | 값                | 설정하지 않음             |

- Supabase의 새 API key 체계(publishable / secret)를 쓴다. legacy `anon` / `service_role` JWT key는 쓰지 않는다. env schema가 키 종류를 검증한다(secret key를 public 변수에 넣으면 거부).
- remote에 동기화할 때는 별도 파일(`.env.remote.local`, gitignore 대상)을 명시적으로 지정한다.

## 20. 코드 구조

```
src/
  app/[locale]/        페이지 (도감, 상세, quiz, collection, me, leaderboard, auth/error)
  app/auth/callback/   OAuth callback + 게스트 병합
  features/<도메인>/    pokemon · quiz · collection · profile · auth · leaderboard
    rules.ts / service.ts / repository*.ts / actions.ts / queries.ts / components/
  lib/supabase/        server.ts(사용자·RLS) · browser.ts · public.ts(cookie 없음) · admin.ts(secret, 서버 전용) · proxy.ts(세션 갱신)
  lib/env/             Zod env schema
messages/              ko · en · ja
scripts/sync-pokemon/  PokeAPI 동기화 (런타임 코드에서 import 금지)
supabase/              migrations · seed.sql · tests(RLS·RPC)
e2e/                   Playwright 핵심 여정
```

- Server Components가 기본이고, 상호작용이 필요한 곳만 `"use client"`.
- 경계(Server Action 입력, env, 동기화 입력)는 Zod로 검증한다. 클라이언트가 보낸 id를 믿지 않고 사용자는 세션에서 정한다.
- 여러 row를 바꾸는 쓰기는 Postgres RPC 하나의 트랜잭션으로 한다.
- 라이브러리는 구체적인 문제가 있을 때만 추가한다.

## 21. UI

- 톤: 도감·상세·컬렉션은 밝고 컬러풀한 카드, 게임·마이페이지는 Pokédex 프레임 + 픽셀 폰트 배틀 UI.
- 토큰(`app/globals.css`): 브랜드(`dex-red`, `dex-screen`, `volt`, 고정 어두운색 `charcoal`), 타입 18색 × `{base, soft, ink, softDark, inkDark}`, rarity, 시맨틱(`surface`, `card`, `ink`, `muted`, `danger`). 타입 색은 `features/pokemon/types.ts`가 단일 출처이고, 컴포넌트는 CSS 변수(`--type`, `--type-soft`, `--type-ink`, `--type-2`)로 쓴다.
- 다크모드 (**현재 꺼 둠**): `lib/theme.ts`의 `DARK_MODE_ENABLED = false`라 모든 페이지가 `<html data-theme="light">`로 렌더링되고 헤더 토글과 테마 스크립트가 빠진다. 아래 구조는 그대로 남아 있어 값만 바꾸면 되살아난다. 테마가 바뀌는 토큰은 모두 `light-dark(라이트, 다크)`로 정의하고, 테마 전환은 `color-scheme`만 바꾼다(`dark:` 변형을 쓰지 않음). 기본은 시스템 설정이고, 헤더 토글(시스템 → 라이트 → 다크)은 `localStorage.theme`과 `<html data-theme>`에 기록한다. 페이지가 정적이라 `<head>`의 인라인 스크립트가 첫 페인트 전에 `data-theme`을 적용한다(깜빡임 방지). 타입 색의 다크 대비(AA)는 테스트로 지킨다. 테마와 무관한 기기 부품(게임 HUD와 배틀 화면, 보상 배경막, 몬스터볼 로고)은 고정색을 쓴다.
- 헤더: 데스크톱은 로고 · 메뉴 알약 · 언어/계정을 한 줄에. 모바일은 첫 줄에 로고와 언어(KO/EN/JA 코드)·계정, 둘째 줄에 화면 폭을 채우는 탭 바(현재 탭은 빨간 밑줄)를 두고, 헤더 아래에 여백을 둬 페이지 제목과 띄운다.
- 폰트: 본문 Noto Sans KR/JP, 배틀 Galmuri(ko/en) / DotGothic16(ja).
- 에셋: 게임에서 추출한 래스터 이미지는 쓰지 않는다. 트레이너 등은 자체 SVG이고, 포켓몬 아트워크만 예외다(팬 프로젝트 고지).
- Motion: `LazyMotion`(`domMax`, layout 애니메이션)으로 엔진을 지연 로딩하고, `MotionConfig reducedMotion="user"`, spring 프리셋 3개(`snappy`, `bouncy`, `gentle`, `lib/motion.ts`).
- 접근성: 방향키·숫자키·Esc, `aria-live` 메시지, 실루엣 alt에 정답 미노출, 색 외 정보 병기, reduced motion 대응.

### 게임 화면

- `/[locale]/quiz`는 정적 셸이고 게임은 client island(`QuizGame`)다.
- Zustand `useQuizStore`가 서버 액션을 호출하고 결과를 저장한다. phase(`lobby → intro → menu ⇄ answering → judging → hit | reveal → reward → … → gameover`)는 결과를 어떤 순서로 연출할지만 정한다. 판정은 항상 서버가 한다.
- 자동으로 넘어가는 phase(intro/hit/reveal)는 `BattleStage`가 타이머로 `advance()`한다. reduced motion이면 대기 시간을 줄인다.
- 처음 들어오면 타이틀 화면(PRESS START)과 룰 설명(처음 한 번, 건너뛰기 가능)을 보여 준다.
- 화면 배치는 GB 배틀 화면을 따른다: 위쪽 야생 포켓몬 정보창(이름 마스크, `:L??`, HP 바)과 실루엣, 아래쪽 트레이너 뒷모습(자체 흑백 도트 SVG `TrainerSprite`)과 플레이어 정보창(닉네임, 레벨 = 5 + 이번 판에 맞힌 수, HP 바), 그 아래 글자가 한 자씩 찍히는 텍스트 창과 명령창. 배틀 화면은 다크모드에서도 GB의 밝은 팔레트를 유지한다. 닉네임은 헤더처럼 브라우저에서 RLS로 읽는다(`useTrainerName`).
- 조작: 2×2 명령창(싸우다/가방/포켓몬/도망치다), 방향키로 ▶ 커서 이동(roving tabindex), Enter·Z로 결정, 숫자 1–4 단축키, 입력창 Esc.
- 연출: 트레이너·실루엣 등장(spring), 오답 시 트레이너 흔들림·깜빡임 + HP 바 단계적 감소, 정답 시 적 HP 바 소진 + 레벨 업, flash + 실루엣→아트워크, 스티커 카드 낙하·뒤집기(색이 다른 스티커는 홀로그램 광택), 콤보 pop. 효과음은 Web Audio로 만들고 기본은 꺼져 있다.

### 상세 카드와 스티커 tilt

- 상세 카드(`PokemonHeroCard`): 상세 페이지의 아트워크 영역을 카드(번호, 타입, 이름, 아트워크, 분류, 키·몸무게)로 보여 주는 client island. 페이지는 SSG이고, 서버가 렌더링한 이미지와 배지를 props로 받는다.
- 인터랙션: 공통 hook `usePointerTilt`가 pointer 좌표를 requestAnimationFrame당 한 번 CSS 변수(`--rx`, `--ry`, `--px`, `--py`, `--distance`, `--tilt-x`, `--tilt-y`)로 쓰고, 시각 효과는 모두 CSS module이 만든다(React 재렌더링 없음). 최대 ±10°. 데스크톱은 hover, 모바일은 가로 드래그(`touch-action: pan-y`라 세로 스크롤은 그대로, 스크롤이 시작되면 평평하게 돌아감). reduced motion이면 리스너를 붙이지 않는다. 컬렉션 스티커 `Tilt`도 같은 hook을 쓴다.
- 깊이: `preserve-3d` 카드 안에서 foil·texture는 카드 면(0), 오라 20px, 텍스트 30px, 아트워크 55px, glare 60px. 카드 요소에 overflow·opacity·filter·blend를 걸면 3D가 평면으로 눌리므로, 잘라내기는 face 레이어에만 둔다.
- 반짝임과 빛: holo 띠(타입 색 무지개, color-dodge)와 두 겹의 sparkle, 타입 색 foil(soft-light), pointer를 따라가는 glare(overlay), 테두리 반사, 바닥 그림자. 가만히 있어도 holo 띠가 천천히 흘러 모바일에서도 반짝인다. **Shiny**를 켜면 무지개 회절 foil, 금색 테두리, 아트워크 후광으로 바뀌고, 색이 다른 이미지는 처음 누를 때만 받는다.
- poke-holo 등은 원리(레이어, blend-mode, CSS 변수)만 참고했고 코드는 가져오지 않았다(원본 GPL-3.0).

## 22. 테스트

완성 후 유지하는 포트폴리오 프로젝트라서, 깨지면 곤란한 것만 테스트로 지킨다. 각 테스트는 "왜 있는지" 설명할 수 있어야 한다. 렌더링·문구·DOM 구조를 확인하는 테스트는 두지 않는다(화면은 Preview와 E2E로 확인).

| 도구                    | 대상                                                                                               |
| ----------------------- | -------------------------------------------------------------------------------------------------- |
| Vitest                  | 게임 규칙(`rules.ts`: 정답 판정·HP·콤보·점수·힌트/스킵·색이 다른 확률 경계), 다국어 `normalize.ts` |
| Vitest                  | `service.ts`: 진행 중 정답 비노출, 남의 라운드 거부, 동시 제출 충돌, 클릭당 DB 왕복 횟수(회귀)     |
| Vitest                  | 보안 경계: 게스트 병합 티켓·콜백, open redirect, 아바타 경로, env 키 종류, 닉네임 검증             |
| Vitest                  | 데이터·회귀: sync 정답 키·실루엣 경로, 번역 키 일치, 타입 색 대비(AA), Supabase 재시도, 틸트 계산  |
| RTL                     | 실제 버그 회귀만: 게임 요청 실패 시 멈추지 않고 복구                                               |
| Vitest + local Supabase | RLS·RPC 권한, 게스트 병합·정리, 리더보드 공개 범위, 아바타 권한 (우선 보존)                        |
| Playwright              | 핵심 여정 1개: 도감 검색→상세→언어 전환→게임 오답·정답→컬렉션                                      |

- 명령: `pnpm test`(단위), `pnpm test:db`(local Supabase에 fixture를 쓰므로 로컬 DB에서만), `pnpm test:e2e`(`pnpm dev`를 :3200에 띄움).
- E2E는 local Supabase에 붙는다. 진행 중 round의 정답은 RLS로 가려져 있어서 테스트가 secret key로 로컬 DB의 `quiz_round`를 직접 읽는다. CI에서도 dev 서버로 돈다(프로덕션 빌드는 OG 이미지를 Storage 아트워크로 만드는데, 시드에는 이미지가 없음).

---

# Ⅳ. 만들면서 고민한 것들

**정답이 브라우저에 안 가게.** 이름 맞히기 게임이라 개발자도구 열면 답이 보이면 곤란하다. 진행 중인 문제는 응답에 포켓몬 id나 이름을 싣지 않고 실루엣과 글자 수 마스크만 보낸다. 실루엣 파일명은 HMAC 키로 바꿔 두고, 진행 중인 round는 RLS로 아예 조회가 안 되게 막았다. 정답 키는 API에 노출되지 않는 private 스키마에 있다.

**판정은 서버, 커밋은 한 번에.** 규칙은 순수 TS(`rules.ts`)로 두고, 결과 반영(점수, 띠부씰, 다음 문제 생성)은 Postgres RPC 하나로 트랜잭션 처리한다. `version` 컬럼으로 낙관적 잠금을 걸어서 같은 답을 두 번 보내도 띠부씰은 한 번만 나온다.

**느렸던 답변 응답.** 처음엔 답 하나에 1.6–2.5초가 걸렸다. 알고 보니 Vercel 함수는 워싱턴, DB는 도쿄에 있었다. 함수 리전을 도쿄로 옮기고 순차 DB 왕복을 8번에서 3번으로 줄였더니 0.25초 정도로 내려왔다. 왕복 횟수는 다시 늘지 않게 테스트로 묶어 뒀다.

**게스트에서 Google 계정으로.** 가입 없이 시작한 게스트가 나중에 Google을 연결하면 같은 user id를 유지한다. 이미 가입한 Google 계정이 있으면 기록을 합칠 수 있는데, 1회용 티켓(DB에는 해시만, 원본은 httpOnly 쿠키로만)으로 처리하고 기록 이동이 성공한 뒤에만 게스트를 지운다. 안 쓰는 게스트는 pg_cron이 정리하되, 띠부씰이 한 장이라도 있으면 남긴다.

**권한은 DB에서 끝낸다.** 새 테이블은 권한 없이 만들고 필요한 GRANT와 RLS만 연다. 랭킹처럼 남의 기록을 보여 줘야 하는 곳은 닉네임·점수·콤보만 돌려주는 함수 하나로 해결했다.

**테스트는 깨지면 곤란한 것만.** 게임 규칙, 권한, 실제로 났던 버그 위주로 남기고 화면 문구 확인 같은 건 지웠다. RLS·RPC는 로컬 Supabase에 붙여서 돌리고, E2E는 도감 → 상세 → 언어 전환 → 게임 → 컬렉션 한 줄기만 Playwright로 확인한다.

**GB 느낌은 직접.** 원작 에셋은 쓰지 않았다. 트레이너 도트, 타이틀 화면, 효과음은 SVG·CSS·Web Audio로 만들었고 포켓몬 아트워크만 PokeAPI 이미지다.
