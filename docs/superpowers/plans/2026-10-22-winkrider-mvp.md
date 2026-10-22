# WinkRider MVP 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 윙크로 조향하고 입을 벌려 가속하는 3D 카트 레이싱 웹 게임의 MVP(트랙 1개 타임어택)를 만들어 Cloudflare Pages에 배포한다.

**Architecture:** pnpm + Nx 모노레포. 트랙 계산(`track`), 주행 로직(`kart`), 인식 결과 → 조작 입력 변환(`controls`)은 React와 DOM에 의존하지 않는 순수 TypeScript 패키지다. `apps/game`은 React + Vite + react-three-fiber 앱으로, MediaPipe를 Web Worker에서 돌리고, 주행 로직을 초당 60번 고정 간격으로 계산해 화면에 그린다.

**Tech Stack:** Nx 24.0.0, pnpm 12.5.1, Node 24, TypeScript ~6.0.3(Nx 기본값), Vite ^8, Vitest ~5.0.1, React 19.3.1, @react-three/fiber 9.8.2, @react-three/drei 10.7.9, three 0.186.1, @mediapipe/tasks-vision 1.1.1, zzfx 1.4.0, Playwright, wrangler 4.151.3(Cloudflare Pages)

**Spec:** `docs/planning.md` (이하 "기획"). 이 계획의 수치와 규칙은 모두 기획에서 왔다. 괄호 안의 절 번호는 기획의 절 번호다.

## Global Constraints

- 패키지 범위 이름은 `@winkrider`. 프로젝트는 `apps/game`, `packages/track`, `packages/kart`, `packages/controls` (기획 10.1).
- `react`, `react-dom`은 **19.3.1로 정확히 고정**한다(`^` 없이). R3F 9.8.2가 React 19.4 미만만 지원하기 때문이다 (기획 7장 3D 렌더링).
- `track`, `kart`, `controls`는 React, DOM, Three.js, MediaPipe를 import하지 않는다 (기획 10.1).
- 주행 로직은 **초당 60번 고정 간격**으로 계산하고, 화면은 보간해서 그린다 (기획 10.1).
- 매 프레임 바뀌는 값은 React 상태(`useState`)에 넣지 않는다. `useFrame` + `ref`로 다루고, HUD는 100ms에 한 번만 갱신한다 (기획 7장).
- MediaPipe는 **Web Worker**에서 GPU를 먼저 시도하고, 실패하면 CPU로 돌린다. 새 카메라 프레임에만 인식하고(`requestVideoFrameCallback`), Worker가 바쁘면 그 프레임은 건너뛴다. CPU에서는 손 인식을 격프레임으로 한다 (기획 8.1).
- WASM과 모델 파일은 직접 호스팅하고, 경로에 버전을 넣는다 (기획 7장 배포).
- 화면 문구는 `apps/game/src/i18n/ko.ts` 한 곳에만 둔다. 첫 출시는 한국어만 지원한다 (기획 10.10).
- PC 브라우저만 지원한다. 휴대폰으로 접속하면 "PC에서 플레이해 주세요"를 보여 준다 (기획 10.11).
- 서버는 없다. 기록은 localStorage에 저장하고, 저장소를 쓸 수 없어도 게임은 정상 동작해야 한다 (기획 10.6).
- 넥슨의 로고, 캐릭터, 폰트, 효과음, 트랙 디자인은 쓰지 않는다. 에셋과 음원은 CC0를 우선으로 쓰고, 모든 출처를 `CREDITS.md`에 기록한다. CC-BY-NC 같은 비상업 라이선스는 쓰지 않는다 (기획 7장, 9장).
- 조작 수치는 기획 10.9의 초기값을 그대로 쓴다. 판정 기준은 `packages/controls/src/config.ts`, 게임 밸런스는 `packages/kart/src/config.ts` 한 곳에 모은다.
- 좌표계는 Three.js와 같다. Y축이 위, 단위는 m와 s. 진행 방향 각도 `heading`은 라디안이고, 앞 방향은 `(sin h, 0, cos h)`다. `heading`이 커지면 왼쪽으로 돈다. 참고로 +Z를 보고 있을 때 오른쪽은 −X다.
- 커밋 메시지는 한국어 Conventional Commits(`feat:`, `test:`, `docs:` 등)로 쓴다.

### 기획 대비 변경 (이 계획에서 정한 것)

- **`ControlInput` 타입은 `packages/kart`에 둔다.** 주행 로직이 받는 입력의 형식이므로, 그 입력을 쓰는 쪽에서 정의한다. `controls`는 `import type { ControlInput } from '@winkrider/kart'`로 타입만 가져오고 런타임 의존은 없다. 그래서 기획 10.1 표에서 `controls`의 의존은 "없음"에서 "`kart` (타입만)"으로 바뀐다.
- **첫 트랙 이름은 "스카이웨이"(`id: 'skyway'`)로 정한다.** 기획 4장은 이름을 직접 만든다고만 정했다. 사용자가 바꾸고 싶으면 `packages/track/src/tracks/skyway.ts`의 `name`만 고치면 된다.
- **자동 주행(`autopilotInput`)을 `packages/kart`에 둔다.** 입력 재생 테스트의 기준 데이터를 만들고, E2E에서 키보드 모드를 대신 운전하는 데 쓴다. 게임에서는 `VITE_ENABLE_DEBUG=true`로 빌드했을 때만 주소 옵션 `?debug=autopilot`, `?laps=1`이 동작하고, 배포 빌드에서는 동작하지 않는다.
- **역주행 판정 기준을 10m로 정한다.** 기획 10.8은 "진행 거리가 계속 줄어들면"이라고만 했다.

## Review Focus

테스트가 직접 다루지는 않지만 사용자가 마주치기 쉬운 상황이다. 각 상황을 검증하는 테스트는 해당 작업에 넣어 두었다.

1. **카메라 권한을 거부했거나, 카메라가 없거나, 다른 앱이 카메라를 쓰고 있으면** 키보드 모드 안내가 나와야 한다. → Task 10 `classifyCameraError` 테스트
2. **탭을 오래 비웠다 돌아오면** 한 프레임 간격이 몇 초가 된다. 고정 간격 루프가 수백 틱을 몰아서 계산해 멈추거나, 카트가 벽을 뚫으면 안 된다. → Task 11 `advanceFixedStep` 최대 5틱 테스트
3. **사생활 보호 모드 등에서 localStorage가 예외를 던져도** 게임이 멈추면 안 된다. 기록만 저장되지 않는다. → Task 11 기록 저장 테스트
4. **보정 중에 얼굴이 잠깐 안 보이거나 윙크 범위가 부족하면**, 그 프레임은 평균에서 빼고 범위가 부족하다는 것을 정확히 알려야 한다. → Task 8 보정 테스트
5. **키를 누른 채 다른 창으로 포커스를 옮기면** 키가 눌린 상태로 남아 카트가 계속 달리면 안 된다. 또 Ctrl을 계속 누르고 있어도 부스트는 한 번만 나가야 한다. → Task 9 키보드 테스트

---

## 파일 구조

```
package.json, pnpm-workspace.yaml, nx.json, tsconfig.base.json, README.md, CREDITS.md
.github/workflows/ci.yml, .github/workflows/deploy.yml

packages/track/src/
  index.ts
  types.ts            Vec3, TrackDefinition, TrackSample, Track, TrackProjection
  vec3.ts             벡터 계산 유틸
  build-track.ts      buildTrack, sampleAt
  project.ts          projectToTrack (직전 위치 근처 탐색)
  race-progress.ts    체크포인트·랩·역주행
  tracks/skyway.ts    첫 트랙 데이터

packages/kart/src/
  index.ts
  types.ts            ControlInput, NO_INPUT, KartState
  config.ts           KartConfig, DEFAULT_KART_CONFIG, TICK_RATE, TICK_DT
  surface.ts          TrackSurface, createRibbonSurface (나중에 물리 엔진으로 바꿀 모듈)
  step-kart.ts        createKartState, stepKart
  autopilot.ts        autopilotInput
  replay.ts           runReplay
  fixtures/skyway-autopilot.json   입력 재생 기준 데이터

packages/controls/src/
  index.ts
  types.ts            BlendshapeName, FaceFrame, HandFrame, VisionFrame, Calibration
  config.ts           ControlsConfig, DEFAULT_CONTROLS_CONFIG
  calibration.ts      보정 계산
  face-controls.ts    VisionFrame → ControlInput
  keyboard.ts         키 상태 → ControlInput

apps/game/
  public/_headers
  public/models/face_landmarker-float16-1.task, gesture_recognizer-float16-1.task   (커밋)
  public/mediapipe/                  (빌드 전에 node_modules에서 복사, git 제외)
  public/sounds/, public/models3d/
  scripts/copy-mediapipe-wasm.mjs
  src/main.tsx, App.tsx
  src/i18n/ko.ts
  src/device/is-mobile.ts
  src/vision/protocol.ts, vision.worker.ts, vision-client.ts, head-roll.ts, camera-error.ts
  src/sim/fixed-step.ts
  src/race/session.ts
  src/records/records.ts
  src/scene/track-geometry.ts, GameScene.tsx, TrackMesh.tsx, Roadside.tsx, Kart.tsx, KartModel.tsx, ChaseCamera.tsx
  src/hud/Hud.tsx, InputIndicator.tsx, CameraPreview.tsx
  src/screens/StartScreen.tsx, CalibrationScreen.tsx, RaceScreen.tsx, ResultScreen.tsx, MobileNotice.tsx
  src/audio/engine-sound.ts, skid-sound.ts, sfx.ts, audio-settings.ts
  src/debug/debug-flags.ts
apps/game-e2e/src/keyboard-race.spec.ts
```

---

### Task 1: 워크스페이스, CI, README

**Files:**
- Create: 루트 `package.json`, `pnpm-workspace.yaml`, `nx.json`, `tsconfig.base.json`, `README.md`, `.gitignore`, `.github/workflows/ci.yml`
- Create (생성기 사용): `apps/game`, `apps/game-e2e`, `packages/track`, `packages/kart`, `packages/controls`

**Interfaces:**
- Produces: `pnpm nx run-many -t lint test typecheck build`가 통과하는 빈 워크스페이스. import 경로는 `@winkrider/track`, `@winkrider/kart`, `@winkrider/controls`.

- [ ] **Step 1: Nx 워크스페이스 구성**

이미 `docs/`가 있는 저장소 루트에 직접 구성한다. `package.json`(`"private": true`, `"packageManager": "pnpm@12.5.1"`), `pnpm-workspace.yaml`(`apps/*`, `packages/*`)을 만들고 다음을 실행한다.

```bash
pnpm add -D -w nx@24.0.0 @nx/js@24.0.0 @nx/react@24.0.0 @nx/vite@24.0.0 @nx/vitest@24.0.0 @nx/eslint@24.0.0 @nx/playwright@24.0.0
```

생성기 옵션은 `pnpm nx g <생성기> --help`로 확인한다. 추측하지 않는다.

- [ ] **Step 2: 패키지 3개와 앱 생성**

```bash
pnpm nx g @nx/js:lib packages/track --name=@winkrider/track --bundler=none --unitTestRunner=vitest --linter=eslint
pnpm nx g @nx/js:lib packages/kart --name=@winkrider/kart --bundler=none --unitTestRunner=vitest --linter=eslint
pnpm nx g @nx/js:lib packages/controls --name=@winkrider/controls --bundler=none --unitTestRunner=vitest --linter=eslint
pnpm nx g @nx/react:app apps/game --name=@winkrider/game --bundler=vite --unitTestRunner=vitest --e2eTestRunner=playwright --style=css --routing=false
```

- 생성기가 만든 예제 파일(예제 컴포넌트, 예제 함수와 그 테스트)은 지운다.
- `react`와 `react-dom`을 `19.3.1`로 고정한다.
- `apps/game`에 `three@0.186.1 @react-three/fiber@9.8.2 @react-three/drei@10.7.9 @mediapipe/tasks-vision@1.1.1 zzfx@1.4.0`을, dev 의존으로 `@types/three@0.186.0`을 추가한다.

- [ ] **Step 3: README와 CI 작성**

- `README.md`에 넣을 내용
  - 한 줄 소개: "윙크로 조향하고 입을 벌려 가속하는 3D 카트 레이싱 웹 게임"
  - 실행 방법: `pnpm install`, `pnpm nx dev @winkrider/game`
  - 기획 문서 링크
  - 문구: **"넥슨 및 카트라이더와 무관한 팬 프로젝트입니다"**
- `.github/workflows/ci.yml`: push(main)와 pull_request에서 checkout → pnpm/action-setup → setup-node 24(pnpm 캐시) → `pnpm install --frozen-lockfile` → `pnpm nx run-many -t lint test typecheck build`

- [ ] **Step 4: 확인**

Run: `pnpm nx run-many -t lint test typecheck build`
Expected: 모든 프로젝트 성공. `pnpm nx show projects`에 `@winkrider/game`, `@winkrider/game-e2e`, `@winkrider/track`, `@winkrider/kart`, `@winkrider/controls`가 나온다.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "chore: Nx 워크스페이스와 CI 구성"
```

---

### Task 2: track — 중심선 만들기와 위치 찾기

**Files:**
- Create: `packages/track/src/types.ts`, `vec3.ts`, `build-track.ts`, `project.ts`, `index.ts`
- Test: `packages/track/src/build-track.spec.ts`, `project.spec.ts`

**Interfaces:**
- Produces:
```ts
export interface Vec3 { x: number; y: number; z: number }
export interface TrackControlPoint { position: Vec3; width: number }   // width: 도로 폭(m)
export interface TrackDefinition {
  id: string; name: string; laps: number;
  controlPoints: TrackControlPoint[];   // 닫힌 곡선. 첫 점이 출발선
  checkpoints: number[];                // 출발선을 뺀 체크포인트. 진행 거리 비율(0~1), 오름차순
}
export interface TrackSample {
  s: number;          // 출발선부터의 진행 거리(m)
  position: Vec3;     // 중심선 위의 점
  tangent: Vec3;      // 진행 방향 단위 벡터
  right: Vec3;        // 진행 방향 기준 오른쪽. 수평 단위 벡터 = normalize(cross(tangent, (0,1,0)))
  up: Vec3;           // 노면 법선 단위 벡터 = normalize(cross(right, tangent)), up.y > 0
  width: number;
}
export interface Track { definition: TrackDefinition; length: number; spacing: number; samples: TrackSample[] }
export interface TrackProjection { s: number; lateral: number; sample: TrackSample }  // lateral: 오른쪽이 +
export function buildTrack(definition: TrackDefinition, spacing?: number): Track          // spacing 기본값 1m
export function sampleAt(track: Track, s: number): TrackSample                             // s를 length로 감싸고 인접 샘플을 선형 보간
export function projectToTrack(track: Track, point: Vec3, hintS: number, searchRadius?: number): TrackProjection  // searchRadius 기본값 30m
```

- [ ] **Step 1: 실패하는 테스트 작성**

테스트용 트랙은 반지름 100m 원 위의 점 8개(y = 0, 폭 10m)로 만든다.

```ts
it('원형 트랙의 길이는 원둘레에 가깝다', () => {
  expect(Math.abs(buildTrack(circle).length - 2 * Math.PI * 100)).toBeLessThan(5);
});
it('샘플 간격은 spacing을 따른다', () => {
  const t = buildTrack(circle, 1);
  expect(t.samples[1].s - t.samples[0].s).toBeCloseTo(1, 1);
});
it('sampleAt은 길이로 감싼다', () => {
  const t = buildTrack(circle);
  expect(sampleAt(t, t.length + 10).s).toBeCloseTo(10, 1);
  expect(sampleAt(t, -10).s).toBeCloseTo(t.length - 10, 1);
});
it('right는 수평이고 tangent와 수직이다', () => {
  const s = sampleAt(buildTrack(circle), 50);
  expect(s.right.y).toBeCloseTo(0, 5);
  expect(dot(s.right, s.tangent)).toBeCloseTo(0, 5);
});
it('경사 구간에서 up은 노면에 수직이고 위를 향한다', () => { /* 높이가 변하는 트랙: dot(up, tangent) ≈ 0, up.y > 0 */ });
it('중심선 오른쪽 3m 지점은 lateral +3', () => { /* ... */ });
it('projectToTrack은 hintS 근처에서만 찾는다', () => {
  // 두 구간이 수평으로 겹치고 높이만 10m 다른 트랙에서,
  // 아래 도로 위의 점을 위 도로 쪽 hintS로 찾으면 hintS ±30m 안의 s가 나온다.
});
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm nx test @winkrider/track`
Expected: FAIL (`buildTrack`이 없음)

- [ ] **Step 3: 구현**

- `buildTrack`: 제어점을 지나는 **닫힌 centripetal Catmull-Rom 곡선**을 촘촘히(제어점 사이마다 200등분) 계산한다. 누적 거리표를 만들고, 이를 이용해 `spacing` 간격으로 다시 뽑는다. `width`는 제어점 사이를 선형 보간한다.
- `projectToTrack`: `hintS ± searchRadius` 안의 샘플 사이 선분 중 가장 가까운 것을 찾아 그 선분 위로 투영한다. `lateral = dot(point - 투영점, right)`.

- [ ] **Step 4: 통과 확인** — `pnpm nx test @winkrider/track` → PASS

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(track): 중심선 생성과 직전 위치 근처 탐색"`

---

### Task 3: track — 체크포인트, 랩, 역주행

**Files:**
- Create: `packages/track/src/race-progress.ts`
- Test: `packages/track/src/race-progress.spec.ts`

**Interfaces:**
- Consumes: `Track` (Task 2)
- Produces:
```ts
export interface RaceProgress {
  completedLaps: number;
  nextCheckpoint: number;   // definition.checkpoints의 인덱스. 모두 지나면 checkpoints.length (다음은 출발선)
  lastS: number;
  reverseDistance: number;  // 연속으로 거꾸로 간 거리(m)
  wrongWay: boolean;        // reverseDistance > WRONG_WAY_DISTANCE
  finished: boolean;        // completedLaps === definition.laps
}
export const WRONG_WAY_DISTANCE = 10;
export function createRaceProgress(track: Track): RaceProgress   // lastS = 0
export function updateRaceProgress(track: Track, progress: RaceProgress, s: number): RaceProgress  // 순수 함수
```

- [ ] **Step 1: 실패하는 테스트 작성**

테스트용 트랙은 길이 L, `checkpoints: [0.25, 0.5, 0.75]`, `laps: 2`로 둔다. 헬퍼 `drive(progress, fromS, toS)`는 s를 1m씩 바꾸면서 `updateRaceProgress`를 반복 호출한다(길이를 넘으면 감싸기).

```ts
it('체크포인트를 순서대로 다 지나고 출발선을 넘으면 1랩', () => { /* 0 → L+1: completedLaps === 1 */ });
it('체크포인트를 건너뛰면 랩으로 인정하지 않는다', () => {
  // 출발하자마자 거꾸로 출발선을 넘었다가(0 → L-5) 다시 앞으로 넘어오면(L-5 → 5) completedLaps === 0
});
it('2랩을 마치면 finished', () => { /* 0 → 2L+1 */ });
it('10m 넘게 거꾸로 가면 wrongWay, 다시 앞으로 가면 풀린다', () => {
  // 100 → 89: wrongWay === true / 89 → 92: wrongWay === false, reverseDistance === 0
});
it('거꾸로 가서 체크포인트를 다시 지나도 중복 인정되지 않는다', () => {
  // 0.25L을 지나 nextCheckpoint === 1 → 0.25L 앞으로 후진 → 다시 앞으로 지나도 nextCheckpoint === 1
});
```

- [ ] **Step 2: 실패 확인** — `pnpm nx test @winkrider/track` → FAIL

- [ ] **Step 3: 구현**

이동량 `delta`는 `s - lastS`를 `(-L/2, L/2]` 범위로 감싼 값이다.
- `delta > 0`이면 `reverseDistance = 0`으로 되돌린다. 이번 이동 구간이 다음 체크포인트 위치(`checkpoints[i] * L`)를 앞으로 지나면 `nextCheckpoint++`. 체크포인트를 모두 지난 상태에서 출발선(s = 0)을 앞으로 지나면 `completedLaps++`, `nextCheckpoint = 0`.
- `delta < 0`이면 `reverseDistance += -delta`.

- [ ] **Step 4: 통과 확인** — PASS

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(track): 체크포인트·랩·역주행 판정"`

---

### Task 4: track — 첫 트랙 "스카이웨이"

**Files:**
- Create: `packages/track/src/tracks/skyway.ts`
- Modify: `packages/track/src/index.ts` (`skyway` 내보내기)
- Test: `packages/track/src/tracks/skyway.spec.ts`

**Interfaces:**
- Produces: `export const skyway: TrackDefinition` (`id: 'skyway'`, `name: '스카이웨이'`, `laps: 2`)

**구간 흐름 (기획 4장 오마주):** 출발 후 부스터를 모으기 좋은 커브 구간 → 오르막 → 긴 고가 직선 → 커브 → 급경사 내리막에서의 드리프트 → 출발선으로 복귀. 원본 배치를 베끼지 않는다.
- 길이: 한 바퀴 1분 안팎이 목표이므로, 최고 속도 30m/s 기준 약 1.5km (기획 10.9)
- 폭: 일반 구간 16m, 고가 구간 12m

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
const track = buildTrack(skyway);
it('한 바퀴 길이는 1.3~1.7km', () => { expect(track.length).toBeGreaterThan(1300); expect(track.length).toBeLessThan(1700); });
it('2랩, 체크포인트 3개 이상', () => { expect(skyway.laps).toBe(2); expect(skyway.checkpoints.length).toBeGreaterThanOrEqual(3); });
it('높이 10m 이상의 고가 직선이 300m 이상 이어진다', () => {
  // y >= 10이고, 구간 첫 샘플 대비 tangent 방향 변화가 5° 이하인 연속 구간의 최대 길이 >= 300
});
it('급경사 내리막이 있다 (경사 10~25%)', () => { /* 20m 구간 평균 경사의 최솟값이 -0.10 ~ -0.25 */ });
it('출발선 앞뒤 25m는 평지 직선이다', () => { /* s ∈ [-25, 25]: |y| < 0.5, 방향 변화 < 3° */ });
it('도로끼리 겹치는 곳은 높이 차이가 6m 이상이다', () => {
  // |Δs| > 50인 두 샘플의 수평 거리가 두 폭의 평균 이하이면 |Δy| >= 6
});
```

- [ ] **Step 2: 실패 확인** — FAIL

- [ ] **Step 3: 제어점 작성**

`skyway.ts`에 제어점 20~30개를 직접 배치해 위 테스트를 모두 통과시킨다. 커브 반지름은 30m 이상으로 둔다. 최대 회전 속도가 초당 90°이므로 30m/s에서 회전 반지름은 약 19m다. 드리프트 없이 돌 수 있는 커브와 드리프트가 필요한 커브를 섞는다.

- [ ] **Step 4: 통과 확인** — PASS (실제로 달릴 수 있는지는 Task 7에서 검증한다)

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(track): 첫 트랙 스카이웨이 추가"`

---

### Task 5: kart — 노면 모듈과 기본 주행

**Files:**
- Create: `packages/kart/src/types.ts`, `config.ts`, `surface.ts`, `step-kart.ts`, `index.ts`
- Modify: `packages/kart/package.json` (`@winkrider/track` 의존 추가)
- Test: `packages/kart/src/surface.spec.ts`, `step-kart.spec.ts`

**Interfaces:**
- Consumes: `Track`, `Vec3`, `projectToTrack`, `sampleAt` (Task 2)
- Produces:
```ts
export interface ControlInput {
  steer: number;      // -1 = 왼쪽 최대, 1 = 오른쪽 최대
  throttle: number;   // 0 ~ 1
  drift: boolean;     // 누르고 있는 동안 true
  boost: boolean;     // 부스트를 요청한 틱에만 true
}
export const NO_INPUT: ControlInput;   // { steer: 0, throttle: 0, drift: false, boost: false }

export interface SurfaceQuery { s: number; lateral: number; halfWidth: number; groundY: number; up: Vec3; right: Vec3; tangent: Vec3 }
export interface TrackSurface {
  readonly length: number;
  query(position: Vec3, hintS: number): SurfaceQuery;
  pointAt(s: number, lateral: number): Vec3;   // 중심선에서 오른쪽으로 lateral만큼 떨어진 노면 위의 점
}
export function createRibbonSurface(track: Track): TrackSurface;

export interface KartConfig {
  maxSpeed: number;             // 30 m/s
  accelTime: number;            // 4 s (정지 → 최고 속도)
  coastDecel: number;           // 5 m/s²
  maxYawRate: number;           // 초당 90° (라디안으로 저장)
  driftYawMultiplier: number;   // 1.5
  driftDecel: number;           // 2 m/s²
  maxDriftAngle: number;        // 30° (라디안)
  gaugePerSecond: number;       // 0.35
  maxBoosters: number;          // 2
  boostDuration: number;        // 1.5 s
  boostSpeedMultiplier: number; // 1.4
  wallSpeedFactor: number;      // 0.5
  kartHalfWidth: number;        // 0.8 m
}
export const DEFAULT_KART_CONFIG: KartConfig;
export const TICK_RATE = 60;
export const TICK_DT = 1 / 60;

export interface KartState {
  position: Vec3; heading: number; speed: number;
  s: number; lateral: number; up: Vec3;
  driftAngle: number; drifting: boolean;
  boostGauge: number; boosters: number; boostTimeLeft: number;
  touchingWall: boolean;
}
export function createKartState(surface: TrackSurface, s?: number): KartState;  // 중심선 위에서 진행 방향을 보고 정지
export function stepKart(state: KartState, input: ControlInput, surface: TrackSurface, config: KartConfig, dt: number): KartState; // 순수 함수. state를 바꾸지 않는다
```

- [ ] **Step 1: 실패하는 테스트 작성**

테스트 헬퍼로 Task 2의 원형 트랙(반지름 100m, 폭 10m)과 긴 직선 구간이 있는 닫힌 트랙을 둔다. `run(state, input, ticks)`는 `stepKart`를 `TICK_DT`로 반복한다.

```ts
it('pointAt(s, 3)을 query하면 lateral ≈ 3이고 groundY는 노면 높이', ...);
it('엑셀 1로 4초면 최고 속도 30m/s에 도달하고 넘지 않는다', () => {
  expect(run(start, { ...NO_INPUT, throttle: 1 }, 240).speed).toBeCloseTo(30, 0);
  expect(run(start, { ...NO_INPUT, throttle: 1 }, 600).speed).toBeLessThanOrEqual(30);
});
it('엑셀 0.5면 최고 속도의 절반까지만 오른다', ...);   // 목표 속도 = maxSpeed * throttle
it('엑셀을 떼면 초당 5m/s씩 감속하고 0 아래로 내려가지 않는다', ...);
it('속도 20에서 steer -1을 1초 유지하면 왼쪽(heading +)으로 약 90° 돈다', () => { /* 오차 ±2° */ });
it('정지 상태에서는 조향해도 heading이 거의 바뀌지 않는다', ...);  // 회전 속도 × min(1, speed / 5)
it('경사 구간에서 position.y는 노면 높이를 따른다', ...);
it('벽에 부딪히면 속도가 절반이 되고 도로 안에 머문다', () => {
  // 직선 구간에서 heading을 벽 쪽으로 60° 틀고 속도 20 → 닿은 틱에 speed ≈ 10, |lateral| <= halfWidth - 0.8
});
it('벽에 붙어 있는 동안에는 속도가 반복해서 깎이지 않는다', ...);  // touchingWall이 false → true로 바뀌는 틱에만 감속
it('같은 입력 순서면 결과가 완전히 같다', () => {
  // 고정 시드 의사 난수로 만든 입력 600틱을 두 번 실행해 toEqual
});
```

- [ ] **Step 2: 실패 확인** — `pnpm nx test @winkrider/kart` → FAIL

- [ ] **Step 3: 구현**

`stepKart`는 다음 순서로 계산한다.
1. **속도:** 목표 속도 `maxSpeed * throttle`까지 `maxSpeed / accelTime`으로 가속한다. 목표보다 빠르면 `coastDecel`로 감속한다.
2. **방향:** `heading += -steer * maxYawRate * min(1, speed / 5) * dt` (steer가 음수면 왼쪽, heading이 커짐)
3. **수평 이동:** heading 방향으로 이동한다. 드리프트 중이면 Task 6의 미끄러짐 각도만큼 틀어진 방향으로 이동한다.
4. **노면:** `surface.query(새 위치, state.s)`로 s, lateral, groundY, up을 갱신한다.
5. **벽:** `|lateral| > halfWidth - kartHalfWidth`이면 `pointAt`으로 경계까지 되돌린다. 이번 틱에 처음 닿았으면 `speed *= wallSpeedFactor`. 벽을 따라 미끄러지도록, heading을 벽을 향하는 성분이 0이 되게 tangent 쪽으로 돌린다.

- [ ] **Step 4: 통과 확인** — PASS

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(kart): 노면 모듈과 기본 주행 로직"`

---

### Task 6: kart — 드리프트와 부스트

**Files:**
- Modify: `packages/kart/src/step-kart.ts`
- Test: `packages/kart/src/drift-boost.spec.ts`

**Interfaces:**
- Consumes/Produces: Task 5의 `stepKart`, `KartState`, `KartConfig` (새 필드 없음)

**규칙 (기획 4장, 10.8, 10.9)**
- 드리프트로 게이지가 가득 차면 부스터 1개를 얻고, 최대 2개까지 모아 둔다. 부스트 입력 한 번에 1개를 쓴다.
- 드리프트는 `drift && |steer| > 0.1 && speed > 10`일 때만 성립한다.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
it('드리프트 중에는 회전 속도가 1.5배', ...);              // 속도 20, steer -1, drift → 1초에 약 135°
it('드리프트 중에는 엑셀과 관계없이 초당 2m/s 감속', ...);
it('드리프트 중 미끄러짐 각도는 30°를 넘지 않고, 드리프트를 풀면 0으로 돌아간다', ...);
it('약 3초 드리프트하면 부스터 1개를 얻는다', () => {
  // 초당 0.35 → 2.86초. 180틱 뒤 boosters === 1, boostGauge < 0.1
});
it('부스터는 최대 2개, 가득 차면 게이지는 1에서 멈춘다', ...);
it('boost 입력 한 틱에 부스터 1개를 쓰고 1.5초 동안 42m/s를 유지한다', () => {
  // 속도 30, boosters 1 → boost 틱 직후 speed === 42, boosters === 0
  // 89틱 뒤에도 speed === 42, 90틱 뒤 boostTimeLeft === 0
});
it('부스트가 끝나면 초당 5m/s로 30까지 줄어든다', ...);
it('부스트 중에 boost를 다시 넣어도 부스터를 쓰지 않는다', ...);
it('부스터가 없으면 boost 입력은 무시된다', ...);
it('속도 10 이하에서는 drift를 눌러도 드리프트가 성립하지 않는다', ...);
```

- [ ] **Step 2: 실패 확인** — FAIL

- [ ] **Step 3: 구현**

Task 5의 1~3단계에 다음을 넣는다.
- **드리프트:** 회전 배율, 감속, `driftAngle`(초당 60°로 `maxDriftAngle`까지 커지고, 풀리면 초당 90°로 0까지 돌아감)
- **부스트:** 시작할 때 `speed = max(speed, maxSpeed * boostSpeedMultiplier)`, 지속 중에는 그 속도를 유지하고, 끝나면 `coastDecel`로 감속

- [ ] **Step 4: 통과 확인** — PASS

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(kart): 드리프트와 부스트 게이지"`

---

### Task 7: kart — 자동 주행과 입력 재생 테스트

**Files:**
- Create: `packages/kart/src/autopilot.ts`, `replay.ts`, `fixtures/skyway-autopilot.json`
- Test: `packages/kart/src/replay.spec.ts`

**Interfaces:**
- Consumes: `stepKart`, `createKartState`, `createRibbonSurface` (Task 5), `buildTrack`, `skyway`, `createRaceProgress`, `updateRaceProgress` (Task 2~4)
- Produces:
```ts
export function autopilotInput(state: KartState, surface: TrackSurface): ControlInput;  // throttle 1, 앞쪽 중심선을 따라 조향. 드리프트·부스트는 쓰지 않음
export interface Replay { trackId: string; tickRate: number; inputs: ControlInput[]; finishTick: number }
export interface ReplayResult { finishTick: number | null; finalState: KartState; lapTicks: number[] }
export function runReplay(surface: TrackSurface, track: Track, inputs: ControlInput[]): ReplayResult;  // 입력이 끝나거나 완주하면 멈춤
```

기획 10.7에 따라, 녹화한 입력을 재생해 같은 기록이 나오는지 확인한다. 실제 플레이 녹화가 생기기 전에는 자동 주행으로 기준 데이터를 만든다.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
it('자동 주행은 스카이웨이 2랩을 완주하고, 한 바퀴는 45~75초', () => {
  // 최대 4분(14400틱) 동안 autopilotInput으로 주행. lapTicks 두 개 모두 2700~4500틱
});
it('기준 데이터를 재생하면 기록된 완주 틱과 정확히 같다', () => {
  const replay = JSON.parse(readFileSync(fixturePath, 'utf8')) as Replay;
  expect(runReplay(surface, track, replay.inputs).finishTick).toBe(replay.finishTick);
});
it.runIf(process.env.RECORD_REPLAY === '1')('기준 데이터 생성', () => {
  // 자동 주행 입력을 기록해 fixtures/skyway-autopilot.json에 쓴다
});
```

첫 번째 테스트는 **"한 바퀴 1분 안팎"(기획 4장)과 "트랙을 실제로 달릴 수 있는가"를 함께 검증**한다. 실패하면 Task 4의 제어점을 고친다.

- [ ] **Step 2: 실패 확인** — FAIL

- [ ] **Step 3: 구현**

`autopilotInput`: 현재 s보다 `max(10, speed * 0.6)`m 앞의 중심선 점을 목표로 잡고, heading과 목표 방향의 차이에 비례해 조향한다. 비례 계수는 테스트를 통과하는 값으로 고른다.

- [ ] **Step 4: 기준 데이터 생성 후 통과 확인**

Run: `RECORD_REPLAY=1 pnpm nx test @winkrider/kart && pnpm nx test @winkrider/kart`
Expected: PASS. 나중에 기준 데이터를 다시 만들면, 그 이유(주행 로직 변경 등)를 커밋 메시지에 적는다.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "test(kart): 자동 주행과 입력 재생 테스트"`

---

### Task 8: controls — 보정

**Files:**
- Create: `packages/controls/src/types.ts`, `config.ts`, `calibration.ts`, `index.ts`
- Test: `packages/controls/src/calibration.spec.ts`

**Interfaces:**
- Produces:
```ts
export type BlendshapeName = 'eyeBlinkLeft' | 'eyeBlinkRight' | 'jawOpen';
export type Blendshapes = Record<BlendshapeName, number>;
export interface FaceFrame { blendshapes: Blendshapes; headRollDeg: number }   // headRollDeg: 화면 기준 오른쪽으로 기울이면 +
export interface HandFrame { gesture: string; score: number }                  // MediaPipe 이름 그대로 ('Closed_Fist', 'Thumb_Up', 'None' 등)
export interface VisionFrame { timestamp: number; face: FaceFrame | null; hand: HandFrame | null; handEvaluated: boolean }

export interface Calibration {
  neutral: Blendshapes;
  max: Blendshapes;
  swapEyes: boolean;     // 실제 왼쪽 윙크에서 eyeBlinkRight가 더 오르면 true
}
export interface ControlsConfig {
  neutralSeconds: number;       // 3
  minRange: number;             // 0.15
  steerDeadzone: number;        // 0.15
  blinkIgnore: number;          // 0.5
  throttleLow: number;          // 0.1
  throttleHigh: number;         // 0.8
  tiltDeadzoneDeg: number;      // 5
  tiltFullDeg: number;          // 25
  smoothing: number;            // 0.3 (새 값의 비중)
  gestureMinScore: number;      // 0.6
  gestureStreak: number;        // 2
  faceLostPauseSeconds: number; // 0.5
}
export const DEFAULT_CONTROLS_CONFIG: ControlsConfig;

export function averageNeutral(frames: (FaceFrame | null)[]): Blendshapes | null;   // null 프레임은 빼고 평균. 유효 프레임이 없으면 null
export interface EyeCalibrationResult { swapEyes: boolean; maxLeft: number; maxRight: number; leftOk: boolean; rightOk: boolean }
export function calibrateEyes(neutral: Blendshapes, leftWink: (FaceFrame | null)[], rightWink: (FaceFrame | null)[], config: ControlsConfig): EyeCalibrationResult;
export function calibrateJaw(neutral: Blendshapes, open: (FaceFrame | null)[], config: ControlsConfig): { max: number; ok: boolean };
export function normalize(raw: number, neutral: number, max: number): number;   // (raw - neutral) / (max - neutral)을 0~1로 자름
```

**보정 절차 (기획 10.2):** 게임 화면을 보면서 평소 값 3초 → 왼쪽·오른쪽 윙크로 최대 값과 좌우 확인 → 입 벌리기로 최대 값. 범위(최대 값 − 평소 값)가 0.15 미만이면 실패다.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
it('averageNeutral은 얼굴이 없는 프레임을 빼고 평균낸다', () => { /* [f(0.3), null, f(0.4)] → 0.35 */ });
it('averageNeutral은 유효 프레임이 없으면 null', ...);
it('왼쪽 윙크에서 eyeBlinkLeft가 오르면 swapEyes false', () => {
  // 기획 8.1 실측값: 평소 0.33/0.33, 왼쪽 윙크 0.66/0.47 → swapEyes false, maxLeft 0.66, leftOk true
});
it('왼쪽 윙크에서 eyeBlinkRight가 더 오르면 swapEyes true이고, max를 실제 눈 기준으로 바꿔 담는다', ...);
it('범위가 0.15 미만이면 ok false', () => { /* 평소 0.33, 윙크 최대 0.45 → leftOk false */ });
it('normalize는 평소 값에서 0, 최대 값에서 1이고, 범위 밖은 자른다', ...);
it('normalize는 max <= neutral이면 0을 돌려준다 (0으로 나누지 않는다)', ...);
```

- [ ] **Step 2: 실패 확인** — `pnpm nx test @winkrider/controls` → FAIL
- [ ] **Step 3: 구현** — 위 시그니처대로 만든다. 윙크 단계의 최대 값은 그 단계 프레임들의 최댓값이다.
- [ ] **Step 4: 통과 확인** — PASS
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(controls): 표정 보정 계산"`

---

### Task 9: controls — 표정·손동작·키보드 → 조작 입력

**Files:**
- Create: `packages/controls/src/face-controls.ts`, `keyboard.ts`
- Modify: `packages/controls/package.json` (`@winkrider/kart`를 타입 전용으로 사용), `index.ts`
- Test: `packages/controls/src/face-controls.spec.ts`, `keyboard.spec.ts`

**Interfaces:**
- Consumes: `ControlInput`, `NO_INPUT` (Task 5), Task 8의 타입과 `normalize`
- Produces:
```ts
export type SteeringMode = 'wink' | 'headTilt';
export interface FaceControlsState { steer: number; throttle: number; fistStreak: number; thumbStreak: number; drifting: boolean; thumbActive: boolean }
export function createFaceControlsState(): FaceControlsState;
export function updateFaceControls(
  state: FaceControlsState, frame: VisionFrame, calibration: Calibration,
  mode: SteeringMode, tiltSign: 1 | -1, config: ControlsConfig,
): { state: FaceControlsState; input: ControlInput };

export interface KeyTracker { down(key: string): void; up(key: string): void; blur(): void; read(): ControlInput }
export function createKeyTracker(): KeyTracker;   // Ctrl이 새로 눌린 뒤 첫 read()에서만 boost: true
```

판정 기준은 기획 10.9를 따른다. 키보드는 기획 10.5를 따른다: ← → 조향, ↑ 엑셀, Shift 드리프트, Ctrl 부스트, 브레이크·후진 없음.

- [ ] **Step 1: 실패하는 테스트 작성**

헬퍼 `frame(left, right, jaw, hand?)`는 평소 값 0.3, 최대 값 0.8로 보정된 상태를 가정해 VisionFrame을 만든다. 스무딩의 영향을 피하려면 같은 프레임을 20번 넣는 `settle()`을 쓴다.

```ts
it('왼쪽 윙크는 왼쪽 조향(steer < 0)', ...);
it('swapEyes가 true면 방향이 바뀐다', ...);
it('두 눈 차이가 데드존 0.15 미만이면 조향 0', ...);
it('두 눈 모두 0.5 이상이면(깜빡임) 조향 0', ...);
it('jawOpen 보정값 0.1 미만은 엑셀 0, 0.8 이상은 1, 0.45는 0.5', ...);
it('스무딩: 조향 목표가 1일 때 첫 프레임 값은 0.3', ...);
it('얼굴이 없으면 조향·엑셀 0, 드리프트·부스트 false', ...);
it('headTilt 모드: 5° 미만은 0, 25° 이상은 최대, tiltSign으로 방향을 맞춘다', ...);
it('주먹은 점수 0.6 이상이 연속 2번이어야 드리프트', ...);
it('엄지 척은 인정되는 순간 한 번만 boost, 풀었다가 다시 해야 또 나간다', ...);
it('handEvaluated가 false인 프레임은 손 상태를 바꾸지 않는다', ...);  // CPU 격프레임 대응

// keyboard.spec.ts
it('↑는 throttle 1, ←는 steer -1, →는 steer 1, 둘 다 누르면 0', ...);
it('Shift를 누르고 있는 동안 drift', ...);
it('Ctrl을 계속 누르고 있어도 boost는 첫 read에서만 true', ...);
it('blur()하면 모든 키가 떼어진 상태가 된다', ...);
```

- [ ] **Step 2: 실패 확인** — FAIL
- [ ] **Step 3: 구현**

기획 10.9 표의 공식대로 만든다.
- **조향:** `d = normalize(left) - normalize(right)` (swapEyes면 좌우를 바꿔서 계산). 데드존 밖은 `sign(d) * (|d| - 0.15) / 0.85`로 다시 펼친다. 왼쪽 윙크가 왼쪽 조향이 되도록 `steer = -그 값`.
- **스무딩:** `prev + smoothing * (target - prev)`

- [ ] **Step 4: 통과 확인** — PASS
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(controls): 표정·손동작·키보드 입력 변환"`

---

### Task 10: game — MediaPipe Worker와 카메라

**Files:**
- Create: `apps/game/src/vision/protocol.ts`, `vision.worker.ts`, `vision-client.ts`, `head-roll.ts`, `camera-error.ts`, `apps/game/scripts/copy-mediapipe-wasm.mjs`, `CREDITS.md`
- Create: `apps/game/public/models/face_landmarker-float16-1.task`, `gesture_recognizer-float16-1.task` (아래 URL에서 받아 커밋)
- Modify: `apps/game/package.json` (Nx 타깃 `copy-wasm` 추가. `build`, `dev`, `serve`, `preview`가 `copy-wasm`에 의존), `.gitignore` (`apps/game/public/mediapipe/`)
- Test: `apps/game/src/vision/head-roll.spec.ts`, `camera-error.spec.ts`

**Interfaces:**
- Consumes: `VisionFrame`, `FaceFrame`, `HandFrame` (Task 8)
- Produces:
```ts
// protocol.ts
export type Delegate = 'GPU' | 'CPU';
export type ToWorker =
  | { type: 'init'; delegate: Delegate; wasmBase: string; faceModel: string; gestureModel: string }
  | { type: 'frame'; bitmap: ImageBitmap; timestamp: number; withHand: boolean };
export type FromWorker =
  | { type: 'ready'; delegate: Delegate }
  | { type: 'init-error'; delegate: Delegate; message: string }
  | { type: 'result'; frame: VisionFrame };

// camera-error.ts
export type CameraErrorKind = 'permission-denied' | 'no-camera' | 'camera-busy' | 'unknown';
export function classifyCameraError(error: unknown): CameraErrorKind;

// head-roll.ts
export function headRollDegFromMatrix(matrix: ArrayLike<number>): number;   // 4x4 열 우선 행렬에서 Z축 회전 각도(도)

// vision-client.ts
export type VisionStartError = { kind: CameraErrorKind } | { kind: 'model-load-failed' };
export interface VisionClient {
  readonly video: HTMLVideoElement;      // 카메라 미리보기에도 쓴다
  readonly delegate: Delegate;
  stop(): void;
}
export function startVision(onFrame: (frame: VisionFrame) => void): Promise<VisionClient>;  // 실패하면 VisionStartError로 reject
```

기획 8.1의 결정과 우회 처리를 그대로 구현한다.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
it('NotAllowedError → permission-denied', ...);
it('NotFoundError, OverconstrainedError → no-camera', ...);
it('NotReadableError → camera-busy', ...);
it('그 밖의 값 → unknown', ...);
it('headRollDegFromMatrix: 단위 행렬은 0°, Z축으로 +20° 회전한 행렬은 20°', ...);
```

- [ ] **Step 2: 실패 확인** — `pnpm nx test @winkrider/game` → FAIL

- [ ] **Step 3: 구현**

- **`copy-mediapipe-wasm.mjs`:** `node_modules/@mediapipe/tasks-vision/package.json`에서 버전을 읽어, `wasm/vision_wasm_module_internal.js`와 `.wasm` **두 파일만** `public/mediapipe/tasks-vision-<버전>/`에 복사한다. Worker는 ES 모듈용 로더만 쓰기 때문이다.
- **모델 파일:** 아래 URL에서 받아 커밋한다. `CREDITS.md`에 출처와 라이선스(Apache-2.0)를 적는다.
  - `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`
  - `https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task`
- **`vision.worker.ts`**
  1. `FilesetResolver.forVisionTasks(wasmBase, true)`를 부른다.
  2. 돌려받은 `wasmLoaderPath`를 직접 `import`해 기본 내보내기를 보관한다.
  3. **모델을 만들기 전마다 보관한 값을 `self.ModuleFactory`에 다시 넣는다.**
  4. FaceLandmarker(`numFaces: 1`, `outputFaceBlendshapes: true`, `outputFacialTransformationMatrixes: true`, `runningMode: 'VIDEO'`)와 GestureRecognizer(`numHands: 1`)를 만든다.
  5. 프레임을 처리한 뒤 `bitmap.close()`한다.
  - `wasmBase`는 메인 스레드가 `${location.origin}/mediapipe/tasks-vision-1.1.1`처럼 **전체 주소**로 넘긴다.
- **`vision-client.ts`**
  1. `getUserMedia({ video: { width: 640, height: 480 } })`로 카메라를 연다.
  2. Worker를 GPU로 init한다. `init-error`가 오면 Worker를 새로 만들어 CPU로 한 번 더 시도한다.
  3. `requestVideoFrameCallback`마다, Worker가 바쁘지 않으면 `createImageBitmap(video)`을 transfer로 보낸다.
  4. `withHand`는 GPU면 항상 true, CPU면 격프레임마다 true다.

- [ ] **Step 4: 통과 확인과 수동 확인**

Run: `pnpm nx test @winkrider/game` → PASS
수동: `onFrame` 결과를 1초에 한 번 콘솔에 찍고, `pnpm nx dev @winkrider/game`에서 윙크, 입, 주먹, 엄지 척에 따라 값이 바뀌는지 확인한다. 확인한 뒤 로그는 지운다.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(game): Web Worker에서 MediaPipe 인식"`

---

### Task 11: game — 고정 간격 루프, 레이스 세션, 기록 저장

**Files:**
- Create: `apps/game/src/sim/fixed-step.ts`, `apps/game/src/race/session.ts`, `apps/game/src/records/records.ts`
- Test: 각 파일 옆의 `fixed-step.spec.ts`, `session.spec.ts`, `records.spec.ts`

**Interfaces:**
- Consumes: `stepKart`, `createKartState`, `TICK_RATE`, `TICK_DT`, `TrackSurface`, `ControlInput`, `KartState` (Task 5), `Track`, `RaceProgress`, `createRaceProgress`, `updateRaceProgress` (Task 2·3)
- Produces:
```ts
// fixed-step.ts
export const MAX_TICKS_PER_FRAME = 5;
export function advanceFixedStep(accumulator: number, frameDt: number): { ticks: number; accumulator: number; alpha: number };
// alpha: 직전 틱과 다음 틱 사이의 보간 비율(0~1). ticks가 최대치에 걸리면 남은 시간은 버린다.

// session.ts
export type InputMode = 'camera' | 'keyboard';
export type RacePhase = 'countdown' | 'racing' | 'paused' | 'resuming' | 'finished';
export interface RaceSession {
  phase: RacePhase; phaseTime: number;          // 현재 단계에 들어온 뒤 지난 시간(s)
  raceTicks: number; lapTicks: number[];        // 기록은 틱 수로 센다
  kart: KartState; prevKart: KartState;         // prevKart는 보간용
  progress: RaceProgress; faceLostTime: number;
}
export const COUNTDOWN_SECONDS = 3;
export function createRaceSession(track: Track, surface: TrackSurface): RaceSession;
export function tickRaceSession(session: RaceSession, input: ControlInput, faceVisible: boolean, track: Track, surface: TrackSurface): RaceSession;
// 키보드 모드에서는 호출하는 쪽이 faceVisible을 항상 true로 넘긴다.

// records.ts
export interface BestRecord { bestTotalMs: number; bestLapMs: number }
export interface SaveOutcome { isBestTotal: boolean; isBestLap: boolean }
export function loadRecord(trackId: string, mode: InputMode, storage?: Storage): BestRecord | null;
export function saveResult(trackId: string, mode: InputMode, totalMs: number, lapMs: number[], storage?: Storage): SaveOutcome;
// 저장 키: 'winkrider:records:v1'. 저장소가 없거나 예외를 던지면 load는 null, save는 { isBestTotal: false, isBestLap: false }
```

**규칙**
- 카운트다운은 3초이고, 기록은 카운트다운이 끝나는 순간부터 잰다 (기획 10.2).
- 얼굴을 0.5초 넘게 놓치면 일시정지하고, 얼굴이 돌아오면 3초 카운트다운 후 재개한다 (기획 10.4).
- 기록 저장 (기획 10.6), 랩 수 (기획 10.8)

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// fixed-step
it('1/60초 프레임이면 1틱', ...);
it('1/120초 프레임 두 번이면 두 번째에 1틱, alpha는 0~1', ...);
it('탭을 비웠다 돌아와 frameDt가 10초여도 최대 5틱이고, 쌓인 시간은 버린다', ...);

// session
it('카운트다운 3초 동안 카트는 움직이지 않고 raceTicks는 0', ...);
it('카운트다운이 끝나면 racing이 되고, 이후 틱마다 raceTicks가 늘어난다', ...);
it('racing 중 얼굴을 0.5초 넘게 놓치면 paused, 그동안 raceTicks는 늘지 않는다', ...);
it('얼굴이 0.5초 안에 돌아오면 일시정지하지 않는다', ...);
it('paused에서 얼굴이 돌아오면 resuming 3초 뒤 racing', ...);
it('완주하면 finished이고, lapTicks 길이는 track.definition.laps', ...);

// records
it('처음 저장하면 isBestTotal, isBestLap 모두 true', ...);
it('더 느린 기록은 최고 기록을 덮어쓰지 않는다', ...);
it('camera와 keyboard 기록은 따로 저장된다', ...);
it('storage.getItem/setItem이 예외를 던져도 throw하지 않는다', ...);
it('저장된 JSON이 깨져 있어도 null을 돌려준다', ...);
```

- [ ] **Step 2: 실패 확인** — FAIL
- [ ] **Step 3: 구현** — 위 시그니처대로 만든다. 밀리초 기록은 `ticks * 1000 / TICK_RATE`.
- [ ] **Step 4: 통과 확인** — PASS
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(game): 고정 간격 루프, 레이스 세션, 기록 저장"`

---

### Task 12: game — 3D 장면, HUD, 키보드로 플레이 가능한 첫 버전

**Files:**
- Create: `apps/game/src/scene/track-geometry.ts`, `GameScene.tsx`, `TrackMesh.tsx`, `Roadside.tsx`, `Kart.tsx`, `ChaseCamera.tsx`, `apps/game/src/hud/Hud.tsx`, `InputIndicator.tsx`, `apps/game/src/screens/RaceScreen.tsx`, `apps/game/src/i18n/ko.ts`
- Modify: `apps/game/src/App.tsx` (일단 RaceScreen을 키보드 모드로 바로 띄움. Task 13에서 화면 흐름으로 바꿈)
- Test: `apps/game/src/scene/track-geometry.spec.ts`

**Interfaces:**
- Consumes: `skyway`, `buildTrack` (Task 4), `createRibbonSurface` (Task 5), `createKeyTracker` (Task 9), `advanceFixedStep`, `createRaceSession`, `tickRaceSession`, `InputMode`, `RaceSession` (Task 11)
- Produces:
```ts
// track-geometry.ts (순수 함수. Three.js 없이 배열만 만든다)
export interface RibbonGeometry { positions: Float32Array; normals: Float32Array; uvs: Float32Array; indices: Uint32Array }
export function buildRoadGeometry(track: Track): RibbonGeometry;                                 // 샘플마다 좌우 가장자리 2점, 닫힌 띠
export function buildRailPositions(track: Track, side: 1 | -1, height: number): Float32Array;   // 가드레일 선
export function pillarPositions(track: Track, minHeight: number, every: number): Vec3[];         // 고가 교각 위치 (y >= minHeight인 구간에 every m 간격)

// RaceScreen props
export interface RaceScreenProps { mode: InputMode; readInput: () => ControlInput; isFaceVisible: () => boolean; onFinish: (session: RaceSession) => void }
```

기획 7장(도로, 가드레일, 교각은 중심선 데이터로 코드에서 생성하고, 초기에는 단순한 도형 사용)과 10.3(HUD)을 따른다.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
it('도로 정점 수는 샘플 수 × 2, 삼각형은 샘플 수 × 2개', ...);
it('도로 정점은 중심선에서 폭의 절반만큼 좌우로 떨어져 있다', ...);
it('교각은 높이 minHeight 이상인 구간에만 every m 간격으로 놓인다', ...);
```

- [ ] **Step 2: 실패 확인** — FAIL
- [ ] **Step 3: 구현**

- **`GameScene`:** `<Canvas>` 안에 조명, `TrackMesh`(도로 + 가드레일), `Roadside`(교각, 바닥 평면), `Kart`(초기에는 1.6×0.6×2.4m 상자), `ChaseCamera`(카트 뒤 8m, 위 3m에서 부드럽게 따라감)를 둔다.
- **`RaceScreen`:** `useFrame`에서 `advanceFixedStep`으로 틱 수를 구해 `tickRaceSession`을 반복한다. `prevKart`와 `kart`를 `alpha`로 보간해 카트 mesh의 ref를 직접 바꾼다. 세션은 `useRef`에 둔다.
- **`Hud`:** 속도(km/h), 부스트 게이지와 보유 부스터 개수, 랩 n/2, 현재 랩 기록, 전체 기록, 카운트다운 숫자, "역주행" 경고. ref에서 **100ms마다 한 번** 읽어 갱신한다.
- **`InputIndicator`:** 조향 방향, 엑셀 세기, 드리프트, 부스트 아이콘
- 문구는 모두 `ko.ts`에서 가져온다.

- [ ] **Step 4: 통과 확인과 수동 확인**

Run: `pnpm nx test @winkrider/game` → PASS
수동: `pnpm nx dev @winkrider/game`에서 확인한다.
- 키보드로 2랩을 완주할 수 있다.
- 고가 직선과 내리막이 보인다.
- 벽에 부딪히면 감속한다.
- Ctrl을 누르고 있어도 부스트는 한 번만 나간다.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(game): 3D 장면과 HUD, 키보드로 주행"`

---

### Task 13: game — 화면 흐름과 카메라 조작 연결

**Files:**
- Create: `apps/game/src/screens/StartScreen.tsx`, `CalibrationScreen.tsx`, `ResultScreen.tsx`, `MobileNotice.tsx`, `apps/game/src/hud/CameraPreview.tsx`, `apps/game/src/device/is-mobile.ts`
- Modify: `apps/game/src/App.tsx`, `RaceScreen.tsx` (일시정지·재개 안내), `ko.ts`
- Test: `apps/game/src/device/is-mobile.spec.ts`

**Interfaces:**
- Consumes: Task 8 보정 함수, Task 9 `updateFaceControls`, Task 10 `startVision`, `VisionStartError`, Task 11 `saveResult`, `loadRecord`, Task 12 `RaceScreen`
- Produces:
```ts
export function isMobileDevice(nav?: { userAgent: string; userAgentData?: { mobile: boolean } }): boolean;
type Screen = 'start' | 'calibration' | 'race' | 'result';   // App 내부 상태
```

기획 10.2(화면 흐름), 10.3(카메라 미리보기 기본으로 켜짐), 10.4, 10.5, 10.11을 따른다.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
it('userAgentData.mobile이 true면 모바일', ...);
it('iPhone, Android 휴대폰 UA는 모바일', ...);
it('Mac Chrome UA는 모바일이 아니다', ...);
```

- [ ] **Step 2: 실패 확인** — FAIL
- [ ] **Step 3: 구현**

- **모바일이면** `MobileNotice`만 보여 준다("PC에서 플레이해 주세요").
- **`StartScreen`:** 게임 소개, 조작 방법, "카메라로 플레이"와 "키보드로 플레이" 버튼, 설정(조향 방식: 윙크/고개 기울이기, 카메라 미리보기 켜기/끄기), 트랙과 모드별 최고 기록
- **"카메라로 플레이"를 누르면** `startVision`을 부른다. 실패하면 `CameraErrorKind`별 안내와 "키보드로 플레이" 버튼을 보여 준다(기획 10.4). 모델 로딩 실패면 "다시 시도" 버튼을 보여 준다.
- **`CalibrationScreen`**
  1. 게임 화면을 보면서 평소 표정 3초
  2. 왼쪽 윙크 2초
  3. 오른쪽 윙크 2초
  4. 입 벌리기 2초
  5. 주먹
  6. 엄지 척
  - 5~6단계는 인정되면 다음으로 넘어간다. 10초 안에 인정되지 않으면 도움말과 "건너뛰기"를 보여 준다.
  - 범위가 부족하면 그 단계를 한 번 더 한다. 윙크가 두 번 실패하면 고개 기울이기 조향을 권한다.
  - 고개 기울이기 모드에서는 2~3단계 대신 "왼쪽으로 기울이기"로 `tiltSign`을 정한다.
- **레이스 중 카메라 모드:** 마지막 `VisionFrame`으로 `updateFaceControls`를 돌린 결과를 `readInput`으로, 얼굴이 보이는지를 `isFaceVisible`로 넘긴다. 일시정지 중에는 "얼굴이 보이지 않아요"라고 안내한다.
- **`ResultScreen`:** 전체 기록, 랩별 기록, 최고 기록 여부, 조작 방식(키보드 기록이면 "키보드 기록"으로 표시), "다시 하기"(보정 없이 바로 레이스), "처음으로"
- **`CameraPreview`:** `VisionClient.video`를 화면 구석에 거울처럼(`scaleX(-1)`) 작게 보여 준다.

- [ ] **Step 4: 통과 확인과 수동 확인**

Run: `pnpm nx test @winkrider/game` → PASS
수동으로 확인한다.
- 카메라 모드로 보정 → 2랩 완주 → 결과 → 다시 하기
- 레이스 중 얼굴을 화면 밖으로 빼면 0.5초 뒤 일시정지, 돌아오면 3초 뒤 재개
- 카메라 권한을 거부하면 키보드 모드 안내
- 브라우저 개발자 도구의 기기 모드(휴대폰)에서 모바일 안내

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(game): 화면 흐름과 카메라 조작 연결"`

---

### Task 14: game — 사운드

**Files:**
- Create: `apps/game/src/audio/engine-sound.ts`, `skid-sound.ts`, `sfx.ts`, `audio-settings.ts`, `apps/game/public/sounds/` (Kenney 음원)
- Modify: `RaceScreen.tsx`, `StartScreen.tsx` (음소거·음량), `CREDITS.md`
- Test: `apps/game/src/audio/engine-sound.spec.ts`, `audio-settings.spec.ts`

**Interfaces:**
- Produces:
```ts
export function enginePitchHz(speedRatio: number, boosting: boolean): number;   // 60 + 140 * speedRatio, 부스트 중에는 1.2배
export function engineGain(throttle: number): number;                           // 0.15 + 0.1 * throttle
export function createEngineSound(ctx: AudioContext, out: AudioNode): { update(speedRatio: number, throttle: number, boosting: boolean): void; stop(): void };
export function createSkidSound(ctx: AudioContext, out: AudioNode): { update(intensity: number): void; stop(): void };  // 노이즈 → 1.2kHz 대역 통과, 음량 0.2 * intensity
export type SfxName = 'countdownBeep' | 'countdownGo' | 'boosterGained' | 'boost' | 'wallHit' | 'uiClick' | 'finish';
export function playSfx(name: SfxName): void;
export interface AudioSettings { muted: boolean; volume: number }    // 기본값 { muted: false, volume: 0.8 }
export function loadAudioSettings(storage?: Storage): AudioSettings; // 예외가 나면 기본값
export function saveAudioSettings(settings: AudioSettings, storage?: Storage): void;
```

**소리별 방법 (기획 7장 사운드)**
- 엔진, 드리프트: Web Audio로 합성
- 카운트다운 삐 소리, 부스트, 부스터 획득: ZzFX
- `countdownGo`: Kenney Voiceover Pack에 "Go"가 있으면 그 음성, 없으면 ZzFX
- 벽 충돌: Kenney Impact Sounds
- UI: Kenney Interface Sounds
- `finish`: Kenney Music Jingles
- BGM은 없다. 카트라이더 소리를 흉내 내지 않는다.

- [ ] **Step 1: 실패하는 테스트 작성** — `enginePitchHz(0, false) === 60`, `enginePitchHz(1, false) === 200`, `enginePitchHz(1, true) === 240`, `engineGain(1) === 0.25`, 설정 저장소가 예외를 던지면 기본값
- [ ] **Step 2: 실패 확인** — FAIL
- [ ] **Step 3: 구현**
  - `AudioContext`는 시작 화면의 플레이 버튼을 누를 때 만든다.
  - Kenney 팩에서는 실제로 쓰는 파일만 `public/sounds/`에 넣고, `CREDITS.md`에 팩 이름, URL, 라이선스(CC0)를 적는다.
  - ZzFX 효과음 값은 ZzFX 웹 도구에서 고른 배열을 `sfx.ts`에 상수로 둔다.
- [ ] **Step 4: 통과 확인과 수동 확인** — PASS. 수동으로 확인한다: 속도에 따라 엔진음이 오르내리는지, 드리프트 중 마찰음이 나는지, 음소거가 새로고침 후에도 유지되는지
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(game): 엔진·드리프트 합성음과 효과음"`

---

### Task 15: game — 카트 모델과 배경 소품

**Files:**
- Create: `apps/game/public/models3d/` (압축한 glb), `apps/game/src/scene/KartModel.tsx`
- Modify: `Kart.tsx`, `Roadside.tsx`, `CREDITS.md`, `docs/planning.md` 11장 (카트 모델 결정 반영)

**Interfaces:**
- Consumes: Task 12 장면 컴포넌트

기획 7장(3D 에셋)과 11장 미정 사항("카트 모델 최종 선택")을 다룬다.

- [ ] **Step 1: 후보 정리 — 사용자 결정 필요**

Kenney Toy Car Kit과 Car Kit을 내려받아 다음을 표로 정리한다: glTF/GLB 포함 여부, 카트처럼 생긴 차가 있는지, 운전자 캐릭터가 있는지. **이 표를 사용자에게 보여 주고 고르게 한다.**

- [ ] **Step 2: 적용**

고른 모델과 City Kit 계열 소품(건물, 나무, 가로등)을 `gltf-transform`(`@gltf-transform/cli` 4.5.1)으로 압축해 `public/models3d/`에 두고, drei `useGLTF`로 불러온다. 소품은 트랙 바깥(중심선에서 `폭/2 + 6m` 이상 떨어진 곳)에 배치한다.

- [ ] **Step 3: 확인**

Run: `pnpm nx run-many -t test build` → PASS. 빌드 결과에서 3D 에셋 합계가 5MB 이하.
수동: 카트와 소품이 보이고, FPS가 Task 12보다 눈에 띄게 떨어지지 않는지 확인한다.

- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat(game): 카트 모델과 배경 소품 적용"`

---

### Task 16: E2E 테스트와 Cloudflare Pages 배포

**Files:**
- Create: `apps/game/src/debug/debug-flags.ts`, `apps/game-e2e/src/keyboard-race.spec.ts`, `apps/game/public/_headers`, `.github/workflows/deploy.yml`
- Modify:
  - `App.tsx`, `RaceScreen.tsx`: 디버그 자동 주행 연결. `laps` 옵션이 있으면 `{ ...skyway, laps }`로 트랙을 만든다.
  - `apps/game-e2e/playwright.config.ts`: 웹 서버를 `VITE_ENABLE_DEBUG=true`로 띄운다.
  - `README.md`: 배포 방법
- Test: `apps/game/src/debug/debug-flags.spec.ts`

**Interfaces:**
- Consumes: Task 7 `autopilotInput`, Task 12·13 화면
- Produces:
```ts
export interface DebugFlags { autopilot: boolean; laps: number | null }
export function readDebugFlags(search: string, enabled: boolean): DebugFlags;   // enabled = import.meta.env.VITE_ENABLE_DEBUG === 'true'
```

기획 10.7(키보드 모드 E2E 1개)과 7장(배포)을 다룬다.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
it('enabled가 false면 주소 옵션을 모두 무시한다', () => {
  expect(readDebugFlags('?debug=autopilot&laps=1', false)).toEqual({ autopilot: false, laps: null });
});
it('enabled면 ?debug=autopilot과 ?laps=1을 읽는다', ...);
it('laps가 1 미만이거나 숫자가 아니면 null', ...);
```

E2E(`keyboard-race.spec.ts`): `/?debug=autopilot&laps=1`에 접속 → "키보드로 플레이" 클릭 → 결과 화면의 "다시 하기" 버튼이 **150초 안에** 보인다.

- [ ] **Step 2: 실패 확인** — `pnpm nx test @winkrider/game` → FAIL
- [ ] **Step 3: 구현**

`_headers`:
```
/mediapipe/*
  Cache-Control: public, max-age=31536000, immutable
/models/*
  Cache-Control: public, max-age=31536000, immutable
/models3d/*
  Cache-Control: public, max-age=31536000, immutable
```

- **`deploy.yml`:** main에 push되면 CI와 같은 방식으로 설치 → `pnpm nx build @winkrider/game` → `pnpm dlx wrangler@4.151.3 pages deploy apps/game/dist --project-name=winkrider`. 비밀 값은 `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
- **`README.md`:** Cloudflare Pages 프로젝트 `winkrider`를 만들고 두 비밀 값을 등록하는 방법을 적는다. **이 두 작업은 사용자가 직접 해야 한다.** 가입할 때 무료 플랜의 대역폭 조건을 다시 확인한다(기획 7장 "확인할 것").

- [ ] **Step 4: 통과 확인**

Run: `pnpm nx test @winkrider/game && pnpm nx e2e @winkrider/game-e2e` → PASS
Run: `pnpm nx build @winkrider/game && ls -la apps/game/dist/mediapipe/tasks-vision-1.1.1 apps/game/dist/models` → 파일이 있고, 각각 25MiB 이하
배포는 사용자가 Cloudflare 설정을 마친 뒤 main에 푸시해서 확인한다. 배포된 주소(HTTPS)에서 카메라 권한 요청이 뜨는지 본다.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "ci: E2E 테스트와 Cloudflare Pages 배포"`

---

## 완료 후

- 이 문서의 "기획 대비 변경"(Global Constraints 아래)을 `docs/planning.md`에도 반영한다: 10.1 표의 `controls` 의존, 4장 트랙 이름, 10.8 역주행 기준.
- 출시 전에 다른 노트북에서 성능을 한 번 더 측정하고(기획 8.1 한계), BGM을 정한다(기획 11장).
