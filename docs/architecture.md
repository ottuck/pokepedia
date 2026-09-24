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
- 콤보는 오답·힌트·스킵에서 리셋 (실패하면 run이 끝나므로 "연속 정답"만으로는 의미가 없음)

## 4. 환경 구성

단일 remote Supabase 프로젝트를 운영한다 (개인 프로젝트 규모).

| 환경              | Supabase                      | 비고                                                   |
| ----------------- | ----------------------------- | ------------------------------------------------------ |
| Local             | `npx supabase start` (Docker) | 모든 DB 변경을 먼저 여기서 검증                        |
| Vercel Production | remote `pokepedia`            | main 배포                                              |
| Vercel Preview    | remote `pokepedia` (동일)     | PR 확인용. **DB를 변경하는 작업을 자동 실행하지 않음** |

### DB 변경 흐름

```
local: migration 작성 → supabase db reset → RLS/RPC 테스트 → PR
merge 후 (수동, 명시적으로):  npx supabase db push   /   seed 스크립트 실행
```

- Vercel build/deploy 단계에 migration·seed·reset을 넣지 않는다.
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

- 실루엣 key = `HMAC-SHA256(SILHOUETTE_SECRET, id)` 앞 16자리
- 버킷: `pokemon-artwork`(public, `normal/025.webp`, `shiny/025.webp`), `quiz-silhouette`(public, `{opaque}.webp`), `avatars`(Should)
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

-- 사용자
profile (id uuid pk → auth.users on delete cascade, nickname 2–20자, avatar_path, created_at)  -- signup trigger

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

## 7. 게임 API (Server Actions)

Zod 입력 검증, `{ ok: true, ... } | { ok: false, code }` 반환. 에러는 코드로, 문구는 클라이언트 locale로.

| Action                              | 동작                                                                                           |
| ----------------------------------- | ---------------------------------------------------------------------------------------------- |
| `startRun()`                        | 세션 없으면 익명 로그인. 진행 중 run이 있으면 이어하기, 없으면 run + 첫 round                  |
| `submitAnswer({ roundId, answer })` | wrong `{hp}` / cleared `{pokemon, scoreGained, combo, sticker}` / fainted `{pokemon, summary}` |
| `useHint({ roundId })`              | 힌트                                                                                           |
| `skipRound({ roundId })`            | 새 round                                                                                       |
| `nextRound({ runId })`              | 클리어 후 다음 문제                                                                            |
| `fleeRun({ runId })`                | 결과 요약                                                                                      |

`submitAnswer` 내부 — "TS가 판단, SQL이 원자적 커밋":

1. `getClaims()` → userId
2. secret-key client로 round·run·`private.pokemon_quiz` 조회 (본인 + active)
3. `rules.ts`: `judge(normalize(answer), answerKeys)` → `resolveRound(state, judgement, rng)`
4. 오답(hp 남음): `update ... where id = $1 and status = 'active' and attempts = $expected`
5. 클리어/실패: `rpc('resolve_round')` — 같은 guard로 round UPDATE + run UPDATE + `user_sticker` UPSERT, 한 트랜잭션

정규화: NFKC → 소문자 → 공백·구두점·♂♀ 제거 → 히라가나→가타카나. 문제 선택: run 내 중복 제외 랜덤.
Route Handler는 `/auth/callback`만 사용한다.

## 8. 렌더링 전략

| Route                         | 렌더링      | 경계                                                                      |
| ----------------------------- | ----------- | ------------------------------------------------------------------------- |
| `/[locale]`                   | 정적 (캐시) | RSC가 slim list → `PokedexExplorer`(C)가 필터·검색·정렬·layout 애니메이션 |
| `/[locale]/pokemon/[id]`      | SSG 151 × 3 | 대부분 RSC, `StatBars`만 C                                                |
| `/[locale]/quiz`              | 동적        | 서버 셸 + `QuizGame`(C, Zustand)                                          |
| `/[locale]/collection`, `/me` | 동적        | RSC 조회 + 카드 연출 C                                                    |

도감 데이터는 cookie 없는 Supabase client + Cache Components(`"use cache"`, `cacheLife`, `cacheTag('pokemon')`)로 캐시한다. 세부 API는 `node_modules/next/dist/docs` 기준.

## 9. i18n

- next-intl, `app/[locale]/…`, locales `ko`(기본)·`en`·`ja`, `localePrefix: 'always'`
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
