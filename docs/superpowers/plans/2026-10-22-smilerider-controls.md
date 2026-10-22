# SmileRider 조작 변경 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 조작을 고개 기울이기 조향, 자동 엑셀, 입 벌려 드리프트, 웃어서 부스트로 바꿉니다. 이름도 WinkRider에서 SmileRider로 바꿉니다.

**Architecture:**
- `packages/controls`에서 눈과 손 판정을 빼고 고개 기울기, `jawOpen`, `mouthSmile` 판정으로 바꿉니다. 순수 함수와 TDD는 그대로입니다.
- Worker는 FaceLandmarker 하나만 돌립니다.
- 주행 입력 형식(`ControlInput`)과 주행 로직(`packages/kart`)은 바꾸지 않습니다. 자동 엑셀은 입력을 만드는 쪽(카메라 판정, 키보드)이 `throttle: 1`을 넣는 것으로 처리합니다.

**Tech Stack:** Nx 24, pnpm 12, TypeScript 6, React 19, Vitest 5, Playwright 1.64, @mediapipe/tasks-vision 1.1.1

**Spec:** `docs/planning.md`
- 3장 조작, 3.1절 수치
- 10.2절 화면 흐름, 10.3절 HUD, 10.4절 인식이 끊길 때, 10.5절 키보드, 10.7절 테스트, 10.9절 조작 수치
- 9장 이름

## Global Constraints

- **판정 수치** (기획 10.9, 보정값 0~1 기준). 다른 값을 코드에 직접 쓰지 않습니다.

  | 항목 | 값 |
  |---|---|
  | 조향 데드존 / 최대 | 5° / 25° |
  | 스무딩 (새 값 비중) | 0.3 |
  | 드리프트 | 0.4 |
  | 부스트 발동 | 0.6 |
  | 부스트 재준비 | 0.45 미만 |
  | 확인 프레임 | 2 |
  | 평소 값 측정 | 3초 |
  | 보정 실패 기준 | 0.15 |
  | 얼굴 놓침 일시정지 | 0.5초 |

- **엑셀은 자동입니다.** 얼굴이 보이면 `throttle: 1`이고, 놓쳤거나 결과가 만료되면 `NO_INPUT`(throttle 0)입니다. 키보드는 항상 `throttle: 1`이고 ↑ 키는 쓰지 않습니다.
- **손동작은 쓰지 않습니다.** GestureRecognizer, `gesture_recognizer-float16-1.task`, `HandFrame`, `handEvaluated`, 윙크(`eyeBlink*`), `SteeringMode`, `swapEyes`를 모두 지웁니다.
- **화면 문구는 `apps/game/src/i18n/ko.ts`에만 둡니다** (기획 10.10).
- **이름:**
  - 패키지 범위: `@smilerider`
  - 화면 제목: `SmileRider`
  - 저장 키: `smilerider:records:v1`, `smilerider:audio:v1`
  - Cloudflare 프로젝트: `smilerider`
- **옛 저장 키(`winkrider:*`)는 옮기지 않습니다.** 옛 기록은 윙크 조작 기록이라 새 조작과 비교할 수 없기 때문입니다.
- **`packages/kart`는 이름 말고 바꾸지 않습니다.** 입력 재생 기준 데이터(`fixtures/skyway-autopilot.json`)도 그대로 통과해야 합니다.
- **새 의존성을 추가하지 않습니다.**
- **외부에 보이는 작업은 사람에게 확인받은 뒤에 합니다** (Task 7). GitHub 저장소 이름 변경, Cloudflare 프로젝트 생성·삭제, push가 여기에 해당합니다.
- **작업 브랜치는 `feat/smilerider`입니다.**

## Review Focus

1. **웃으면서 입을 크게 벌림(크게 웃음):** 드리프트만 나와야 하고 부스트가 나가면 안 됩니다. 테스트는 Task 3에 둡니다.
2. **"아!"에서 입을 다물며 바로 웃음:** 드리프트가 끝나고 2프레임 안에 부스트가 나와야 합니다. 측정에서 300ms 지연이 있었던 조합입니다. 테스트는 Task 3에 둡니다.
3. **웃는 중에 얼굴을 놓쳤다가 웃는 채로 돌아옴:** 부스트가 다시 나가면 안 됩니다. 재준비는 웃음이 0.45 아래로 내려가야만 됩니다. 테스트는 Task 3에 둡니다.
4. **평소에 고개가 8° 기울어진 사람:** 평소 각도를 0으로 보므로 가만히 있으면 조향 0이어야 합니다. 테스트는 Task 3에 둡니다.
5. **웃음 범위가 0.15보다 작은 사람:** 보정이 웃음 단계를 다시 하게 해야 합니다. 최대 값이 평소 값과 같은 채로 레이스에 들어가면 부스트를 영영 못 씁니다. 테스트는 Task 5에 둡니다.

---

### Task 1: 저장소 안의 이름을 SmileRider로 바꾸기

동작은 바꾸지 않습니다. 이름만 바꾸므로 기존 검사가 그대로 통과해야 합니다.

**Files:**
- Modify (이름만 바꿈):
  - `package.json`, `tsconfig.base.json`
  - `apps/*/package.json`, `packages/*/package.json`
  - `packages/*/vitest.config.mts`, `apps/game/vite.config.mts`, `apps/game-e2e/playwright.config.mts`
  - `apps/game/index.html`
  - `apps/game/src/**/*.ts(x)`, `packages/*/src/**/*.ts`
  - `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`
  - `README.md`, `CREDITS.md`
- Regenerate: `pnpm-lock.yaml`
- 건드리지 않음: `docs/` (기획은 이미 반영함, MVP 계획은 당시 기록으로 둠)

**Interfaces:**
- Produces: 이후 모든 Task는 `@smilerider/controls`, `@smilerider/kart`, `@smilerider/track`, `@smilerider/game`, `@smilerider/game-e2e`를 씁니다.

- [ ] **Step 1: 브랜치 만들기**

```bash
git switch -c feat/smilerider
```

- [ ] **Step 2: 문자열 일괄 치환**

```bash
git grep -l -e winkrider -e WinkRider -- ':!docs' ':!pnpm-lock.yaml' \
  | xargs sed -i '' -e 's/winkrider/smilerider/g' -e 's/WinkRider/SmileRider/g'
```

이 치환은 README의 MVP 계획 링크까지 `2026-10-22-smilerider-mvp.md`로 바꿉니다. 실제 파일 이름은 그대로이므로 링크는 `docs/superpowers/plans/2026-10-22-winkrider-mvp.md`로 되돌립니다.

README 위쪽 소개 문구는 기획 첫 줄과 같게 바꿉니다:

> 고개를 기울여 조향하고, "아!" 하며 드리프트하고, 씩 웃으면 부스트하는 3D 카트 레이싱 웹 게임

- [ ] **Step 3: 남은 옛 이름 확인**

Run: `git grep -n -i winkrider -- ':!docs' ':!pnpm-lock.yaml'`
Expected: README의 MVP 계획 링크 한 줄만 나옵니다.

- [ ] **Step 4: 잠금 파일과 Nx 캐시 갱신**

```bash
pnpm install
pnpm nx reset
```

Expected: `pnpm-lock.yaml`의 `@winkrider/*`가 모두 `@smilerider/*`로 바뀝니다. `git grep -c winkrider pnpm-lock.yaml`의 결과는 0입니다.

- [ ] **Step 5: 전체 검사**

Run: `pnpm nx run-many -t lint test typecheck build`
Expected: 모두 성공합니다. 테스트 수는 바꾸기 전과 같습니다.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: 이름을 SmileRider로 변경"
```

---

### Task 2: controls 타입, 설정, 보정 함수

**Files:**
- Modify: `packages/controls/src/types.ts`, `packages/controls/src/config.ts`, `packages/controls/src/calibration.ts`
- Test: `packages/controls/src/calibration.spec.ts` (다시 씀)

**Interfaces:**
- Produces (`types.ts`):

```ts
export type BlendshapeName = 'jawOpen' | 'mouthSmile';
export type Blendshapes = Record<BlendshapeName, number>;
export interface FaceFrame {
  /** mouthSmile은 mouthSmileLeft와 mouthSmileRight의 평균 */
  blendshapes: Blendshapes;
  /** 화면 기준 오른쪽으로 기울이면 + (도) */
  headRollDeg: number;
}
export interface VisionFrame { timestamp: number; face: FaceFrame | null }
export interface NeutralPose { blendshapes: Blendshapes; rollDeg: number }
export interface Calibration {
  neutral: Blendshapes;
  max: Blendshapes;
  /** 평소 고개 기울기(도). 조향은 이 각도를 0으로 본다 */
  neutralRollDeg: number;
  /** 왼쪽으로 기울였을 때 steer가 음수가 되도록 곱하는 부호 */
  tiltSign: 1 | -1;
}
```

- Produces (`config.ts`), `ControlsConfig`의 필드와 `DEFAULT_CONTROLS_CONFIG`:

```ts
{ neutralSeconds: 3, minRange: 0.15, tiltDeadzoneDeg: 5, tiltFullDeg: 25, smoothing: 0.3,
  driftOn: 0.4, boostOn: 0.6, boostRearm: 0.45, confirmFrames: 2, faceLostPauseSeconds: 0.5 }
```

- Produces (`calibration.ts`):
  - `averageNeutral(frames: (FaceFrame | null)[]): NeutralPose | null`
  - `calibrateTilt(neutralRollDeg: number, frames: (FaceFrame | null)[], config: ControlsConfig): { tiltSign: 1 | -1; ok: boolean }`
  - `calibrateMax(neutral: Blendshapes, frames: (FaceFrame | null)[], name: BlendshapeName, config: ControlsConfig): { max: number; ok: boolean }`
  - `normalize(raw, neutral, max)`: 지금 그대로 둡니다.
- Removes: `calibrateEyes`, `EyeCalibrationResult`, `calibrateJaw`, `HandFrame`, `swapEyes`

- [ ] **Step 1: 실패하는 테스트 쓰기**

`calibration.spec.ts`를 다시 씁니다. `normalize`의 기존 두 테스트는 그대로 둡니다. 도우미 함수는 `f(jaw, smile, roll)`로 `FaceFrame`을 만듭니다.

```ts
it('DEFAULT_CONTROLS_CONFIG는 기획 10.9의 초기값', () => {
  expect(DEFAULT_CONTROLS_CONFIG).toEqual({ neutralSeconds: 3, minRange: 0.15, tiltDeadzoneDeg: 5, tiltFullDeg: 25,
    smoothing: 0.3, driftOn: 0.4, boostOn: 0.6, boostRearm: 0.45, confirmFrames: 2, faceLostPauseSeconds: 0.5 });
});

it('averageNeutral: 얼굴이 없는 프레임을 빼고 표정 수치와 기울기를 평균낸다', () => {
  const r = averageNeutral([f(0.02, 0, 1), null, f(0.06, 0.1, 3)])!;
  expect(r.blendshapes.jawOpen).toBeCloseTo(0.04, 6);
  expect(r.blendshapes.mouthSmile).toBeCloseTo(0.05, 6);
  expect(r.rollDeg).toBeCloseTo(2, 6);
  expect(averageNeutral([null])).toBeNull();
});

it('calibrateTilt: 평소 각도에서 왼쪽 기울기가 +쪽이면 tiltSign -1, -쪽이면 1', () => {
  expect(calibrateTilt(0, [f(0, 0, 20), f(0, 0, 24)], cfg)).toEqual({ tiltSign: -1, ok: true });
  expect(calibrateTilt(0, [f(0, 0, -20)], cfg)).toEqual({ tiltSign: 1, ok: true });
});

it('calibrateTilt: 평소 각도 기준 5° 미만이면 ok false (평소 8°, 측정 11°)', () => {
  expect(calibrateTilt(8, [f(0, 0, 11)], cfg).ok).toBe(false);
  expect(calibrateTilt(8, [null], cfg).ok).toBe(false);
});

it('calibrateMax: 그 표정의 최댓값과 범위 확인', () => {
  const neutral = { jawOpen: 0.04, mouthSmile: 0 };
  expect(calibrateMax(neutral, [f(0.5, 0), null, f(0.79, 0)], 'jawOpen', cfg)).toEqual({ max: 0.79, ok: true });
  expect(calibrateMax(neutral, [f(0, 0.83)], 'mouthSmile', cfg)).toEqual({ max: 0.83, ok: true });
  expect(calibrateMax(neutral, [f(0, 0.1)], 'mouthSmile', cfg).ok).toBe(false);
  expect(calibrateMax(neutral, [null], 'jawOpen', cfg)).toEqual({ max: 0.04, ok: false });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `pnpm nx test @smilerider/controls -- calibration`
Expected: FAIL. `calibrateTilt` 등이 정의되지 않았거나 설정 값이 다르다는 오류가 납니다.

- [ ] **Step 3: 구현**

- 위 Interfaces대로 `types.ts`, `config.ts`, `calibration.ts`를 바꿉니다.
- `calibrateTilt`는 얼굴이 보인 프레임의 `headRollDeg` 평균에서 `neutralRollDeg`를 뺀 값을 씁니다.
  - 그 크기가 `tiltDeadzoneDeg`보다 작으면 `ok: false`입니다. 프레임이 없을 때도 같습니다.
  - 그 값이 양수면 `tiltSign: -1`입니다. 기존 `flow.ts`의 `tiltLeft` 규칙을 옮긴 것입니다.
- `config.ts`의 주석은 각 필드가 무엇을 판정하는지 한 줄씩 씁니다(기존 스타일).

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm nx test @smilerider/controls -- calibration`
Expected: PASS. `face-controls.spec.ts`는 Task 3 전까지 깨져 있어도 됩니다.

- [ ] **Step 5: Commit**

```bash
git add packages/controls/src/types.ts packages/controls/src/config.ts packages/controls/src/calibration.ts packages/controls/src/calibration.spec.ts
git commit -m "feat(controls): 고개 기울기·입·웃음 보정"
```

---

### Task 3: 얼굴 판정과 키보드 자동 엑셀

**Files:**
- Modify: `packages/controls/src/face-controls.ts`, `packages/controls/src/keyboard.ts`
- Test: `packages/controls/src/face-controls.spec.ts` (다시 씀), `packages/controls/src/keyboard.spec.ts`

**Interfaces:**
- Consumes: Task 2의 `Calibration`, `VisionFrame`, `ControlsConfig`, `normalize`
- Produces:

```ts
export interface FaceControlsState {
  steer: number;
  /** 입 벌림이 드리프트 기준 이상인 연속 프레임 수 */
  jawStreak: number;
  /** 드리프트 중이 아니면서 웃음이 발동 기준 이상인 연속 프레임 수 */
  smileStreak: number;
  /** false면 웃음이 재준비 기준 아래로 내려가야 다음 부스트가 나간다 */
  boostArmed: boolean;
}
export function createFaceControlsState(): FaceControlsState; // { steer: 0, jawStreak: 0, smileStreak: 0, boostArmed: true }
export function updateFaceControls(
  state: FaceControlsState, frame: VisionFrame, calibration: Calibration, config: ControlsConfig,
): { state: FaceControlsState; input: ControlInput };
```

- Removes: `SteeringMode`. `createKeyTracker()`의 시그니처는 그대로 둡니다.

**판정 규칙 (한 프레임):**
- 얼굴이 있으면 `jaw = normalize(jawOpen)`, `smile = normalize(mouthSmile)`를 구합니다.
- `jawStreak`: `jaw >= driftOn`이면 1 늘리고, 아니면 0으로 돌립니다. `drift = jawStreak >= confirmFrames`입니다.
- `smileStreak`: `smile >= boostOn && jaw < driftOn`이면 1 늘리고, 아니면 0으로 돌립니다.
- 부스트:
  - `boostArmed`이고 `smileStreak >= confirmFrames`이면 `boost = true`, `boostArmed = false`입니다.
  - `smile < boostRearm`이면 `boostArmed = true`입니다.
- `steer`:
  - 목표값은 `rescale((headRollDeg - neutralRollDeg) * tiltSign, tiltDeadzoneDeg, tiltFullDeg)`입니다. 기존 `rescale`을 그대로 씁니다.
  - 이 목표값에 스무딩 0.3을 적용합니다.
  - `throttle: 1`입니다.
- 얼굴이 없으면:
  - 입력은 `NO_INPUT`과 같은 값(`{ steer: 0, throttle: 0, drift: false, boost: false }`)입니다.
  - 상태는 `steer`, `jawStreak`, `smileStreak`를 0으로 돌리고, **`boostArmed`는 그대로 둡니다.**

- [ ] **Step 1: 실패하는 테스트 쓰기**

`face-controls.spec.ts`의 기준값과 도우미 함수는 다음과 같습니다.
- 보정값: `neutral: { jawOpen: 0, mouthSmile: 0 }`, `max: { jawOpen: 1, mouthSmile: 1 }`, `neutralRollDeg: 0`, `tiltSign: 1`. 그러면 원값이 곧 보정값입니다.
- `frame({ jaw, smile, roll })`: 빈 값은 0입니다.
- `face: null` 프레임: `lost()`
- `feed(frames, calibration = cal, start = createFaceControlsState())`와 `settle(frame, calibration = cal)`를 씁니다. 기존 도우미에서 `options`를 `calibration`으로 바꾼 것입니다.

```ts
describe('조향', () => {
  it('5° 미만 0, 15°는 0.5, 25° 이상 최대, 부호는 tiltSign을 따른다', () => {
    expect(settle(frame({ roll: 3 })).steer).toBe(0);
    expect(settle(frame({ roll: 15 })).steer).toBeCloseTo(0.5, 2);
    expect(settle(frame({ roll: 30 })).steer).toBeGreaterThan(0.99);
    expect(settle(frame({ roll: 30 }), { ...cal, tiltSign: -1 }).steer).toBeLessThan(-0.99);
  });
  it('평소 각도를 0으로 본다: 평소 8°인 사람이 8°면 0, 23°면 0.5', () => {
    const tilted = { ...cal, neutralRollDeg: 8 };
    expect(settle(frame({ roll: 8 }), tilted).steer).toBe(0);
    expect(settle(frame({ roll: 23 }), tilted).steer).toBeCloseTo(0.5, 2);
  });
  it('스무딩: 목표가 1일 때 첫 프레임 값은 0.3', () => {
    expect(feed([frame({ roll: 30 })]).last.steer).toBeCloseTo(0.3, 6);
  });
});

describe('엑셀', () => {
  it('얼굴이 보이면 항상 1', () => {
    expect(feed([frame({})]).last.throttle).toBe(1);
    expect(feed([frame({ jaw: 0.9 })]).last.throttle).toBe(1);
  });
});

describe('드리프트', () => {
  it('입 벌림 0.4 이상이 연속 2프레임이어야 시작, 0.4 미만이면 바로 끝', () => {
    expect(feed([frame({ jaw: 0.5 })]).last.drift).toBe(false);
    expect(feed([frame({ jaw: 0.5 }), frame({ jaw: 0.5 })]).last.drift).toBe(true);
    expect(feed([frame({ jaw: 0.5 }), frame({ jaw: 0.5 }), frame({ jaw: 0.3 })]).last.drift).toBe(false);
    expect(feed([frame({ jaw: 0.39 }), frame({ jaw: 0.39 })]).last.drift).toBe(false);
  });
});

describe('부스트', () => {
  it('웃음 0.6 이상이 연속 2프레임이면 한 번만 나가고, 0.45 미만으로 내려가야 다시 나간다', () => {
    const { inputs } = feed([0.9, 0.9, 0.9, 0.5, 0.9, 0.3, 0.9, 0.9].map((smile) => frame({ smile })));
    expect(inputs.map((i) => i.boost)).toEqual([false, true, false, false, false, false, false, true]);
  });
  it('크게 웃어 입이 0.4 이상 벌어지면 드리프트만 나가고 부스트는 안 나간다', () => {
    const { inputs } = feed(Array(5).fill(frame({ jaw: 0.5, smile: 0.9 })));
    expect(inputs.some((i) => i.boost)).toBe(false);
    expect(inputs[4].drift).toBe(true);
  });
  it('"아!"에서 입을 다물며 웃으면 2프레임째에 부스트', () => {
    const { inputs } = feed([
      ...Array(3).fill(frame({ jaw: 0.6 })),
      frame({ jaw: 0.1, smile: 0.9 }),
      frame({ jaw: 0.1, smile: 0.9 }),
    ]);
    expect(inputs.map((i) => i.boost)).toEqual([false, false, false, false, true]);
  });
  it('웃는 중에 얼굴을 놓쳤다가 웃는 채로 돌아와도 부스트가 다시 나가지 않는다', () => {
    const { inputs } = feed([frame({ smile: 0.9 }), frame({ smile: 0.9 }), lost(),
      frame({ smile: 0.9 }), frame({ smile: 0.9 })]);
    expect(inputs.map((i) => i.boost)).toEqual([false, true, false, false, false]);
  });
});

describe('보정 적용', () => {
  it('평소 0.04, 최대 0.79인 입: 원값 0.35는 드리프트(보정값 0.41), 0.3은 아님(0.35)', () => {
    const real = { ...cal, neutral: { jawOpen: 0.04, mouthSmile: 0 }, max: { jawOpen: 0.79, mouthSmile: 0.78 } };
    expect(feed([frame({ jaw: 0.35 }), frame({ jaw: 0.35 })], real).last.drift).toBe(true);
    expect(feed([frame({ jaw: 0.3 }), frame({ jaw: 0.3 })], real).last.drift).toBe(false);
  });
});

describe('얼굴을 놓쳤을 때', () => {
  it('입력 없음', () => {
    const { state } = feed(Array(5).fill(frame({ roll: 30, jaw: 0.9 })));
    expect(feed([lost()], cal, state).last).toEqual({ steer: 0, throttle: 0, drift: false, boost: false });
  });
});
```

`keyboard.spec.ts`도 고칩니다.
- 첫 테스트의 기대값을 `{ steer: 0, throttle: 1, drift: false, boost: false }`로 바꿉니다.
- 두 번째 테스트는 이름을 `'←는 steer -1, →는 steer 1, 둘 다 누르면 0, ↑는 아무 효과 없음'`으로 바꿉니다.
  - `keys.down('ArrowUp')` 뒤의 기대값은 `read()`가 `{ steer: 0, throttle: 1, drift: false, boost: false }`인 것입니다.
- `blur` 테스트의 기대값도 `throttle: 1`로 바꿉니다.

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `pnpm nx test @smilerider/controls`
Expected: FAIL. face-controls 시그니처와 동작이 다르고, keyboard의 throttle 기대값이 다릅니다.

- [ ] **Step 3: 구현**

- `face-controls.ts`는 위 판정 규칙대로 다시 씁니다.
- `keyboard.ts`는 `throttle: 1`로 고정합니다. 문서 주석은 다음으로 바꿉니다.
  > ← → 조향, Shift 드리프트, Ctrl 부스트 (기획 10.5). 엑셀은 자동이고 브레이크와 후진은 없다

- [ ] **Step 4: 테스트, 타입 검사 통과 확인**

Run: `pnpm nx run-many -t test typecheck lint -p @smilerider/controls`
Expected: 모두 PASS입니다. `@smilerider/game`의 타입 검사는 Task 5 전까지 깨져 있어도 됩니다.

- [ ] **Step 5: Commit**

```bash
git add packages/controls/src
git commit -m "feat(controls): 고개 기울이기 조향, 입 벌려 드리프트, 웃어서 부스트, 자동 엑셀"
```

---

### Task 4: Worker에서 손동작 모델 빼고 웃음 수치 읽기

**Files:**
- Create: `apps/game/src/vision/face-frame.ts`, `apps/game/src/vision/face-frame.spec.ts`
- Modify:
  - `apps/game/src/vision/vision.worker.ts`, `apps/game/src/vision/protocol.ts`, `apps/game/src/vision/vision-client.ts`
  - `apps/game/src/vision/frame-gate.spec.ts`: `VisionFrame` 예시 값에서 `hand`, `handEvaluated`를 뺍니다.
  - `CREDITS.md`: 손동작 모델 줄을 지웁니다.
- Delete: `apps/game/public/models/gesture_recognizer-float16-1.task`

**Interfaces:**
- Consumes: Task 2의 `FaceFrame`
- Produces:
  - `toFaceFrame(categories: { categoryName: string; score: number }[] | undefined, matrix: ArrayLike<number> | undefined): FaceFrame | null`
  - `ToWorker` init에서 `gestureModel`을, frame에서 `withHand`를 뺍니다.
  - `MEDIAPIPE_PATHS`에서 `gestureModel`을 뺍니다.

- [ ] **Step 1: 실패하는 테스트 쓰기 (`face-frame.spec.ts`)**

```ts
it('categories가 없으면 null', () => expect(toFaceFrame(undefined, undefined)).toBeNull());

it('mouthSmile은 좌우 평균, 없는 값은 0, 행렬이 없으면 기울기 0', () => {
  const frame = toFaceFrame([
    { categoryName: 'jawOpen', score: 0.5 },
    { categoryName: 'mouthSmileLeft', score: 0.8 },
    { categoryName: 'mouthSmileRight', score: 0.6 },
  ], undefined);
  expect(frame!.blendshapes.jawOpen).toBe(0.5);
  expect(frame!.blendshapes.mouthSmile).toBeCloseTo(0.7, 6);
  expect(frame!.headRollDeg).toBe(0);
  expect(toFaceFrame([], undefined)!.blendshapes).toEqual({ jawOpen: 0, mouthSmile: 0 });
});

it('행렬이 있으면 headRollDegFromMatrix로 기울기를 읽는다', () => {
  const m = [Math.cos(Math.PI / 6), Math.sin(Math.PI / 6), 0, 0, -Math.sin(Math.PI / 6), Math.cos(Math.PI / 6), 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  expect(toFaceFrame([], m)!.headRollDeg).toBeCloseTo(30, 6);
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `pnpm nx test @smilerider/game -- face-frame`
Expected: FAIL. `face-frame` 모듈이 없습니다.

- [ ] **Step 3: 구현**

- `face-frame.ts`에 `toFaceFrame`을 만듭니다. 내부에서 `headRollDegFromMatrix`를 씁니다.
- `vision.worker.ts`:
  - `GestureRecognizer` import와 생성, `recognizeForVideo`를 지웁니다.
  - `ModuleFactory` 재주입은 모델이 하나뿐이어도 그대로 둡니다. 첫 모델에도 필요하고, GPU 실패 뒤 CPU로 다시 만들 때도 쓰기 때문입니다.
  - 주석에서 "두 번째 모델부터"라는 설명을 "다시 만들 때"로 고칩니다.
  - 결과는 `{ type: 'result', frame: { timestamp, face: toFaceFrame(...) } }`로 보냅니다.
- `vision-client.ts`: `frameCount`와 `withHand` 계산을 지웁니다.
- 모델 파일을 지웁니다.

```bash
git rm apps/game/public/models/gesture_recognizer-float16-1.task
```

- [ ] **Step 4: 테스트 통과와 남은 참조 확인**

Run: `pnpm nx test @smilerider/game -- face-frame frame-gate head-roll`
Expected: PASS

Run: `git grep -n -i -e gesture -e handEvaluated -e withHand -- apps/game/src apps/game/public CREDITS.md`
Expected: `calibration/flow.ts`, `flow.spec.ts`, `race/camera-input.spec.ts`, `screens/CalibrationScreen.tsx`, `i18n/ko.ts`에만 남습니다. 이 파일들은 Task 5에서 지웁니다.

- [ ] **Step 5: Commit**

```bash
git add -A apps/game/src/vision apps/game/public/models CREDITS.md
git commit -m "feat(game): 손동작 모델을 빼고 웃음 수치를 읽는다"
```

---

### Task 5: 보정 흐름, 카메라 입력, 화면 연결

**Files:**
- Modify:
  - `apps/game/src/calibration/flow.ts`, `apps/game/src/screens/CalibrationScreen.tsx`
  - `apps/game/src/race/camera-input.ts`, `apps/game/src/App.tsx`, `apps/game/src/screens/StartScreen.tsx`
  - `apps/game/src/hud/InputIndicator.tsx`, `apps/game/src/i18n/ko.ts`
- Test: `apps/game/src/calibration/flow.spec.ts` (다시 씀), `apps/game/src/race/camera-input.spec.ts`, `apps/game/src/App.spec.tsx`

**Interfaces:**
- Consumes:
  - Task 2: `averageNeutral`, `calibrateTilt`, `calibrateMax`, `Calibration`, `NeutralPose`
  - Task 3: `updateFaceControls(state, frame, calibration, config)`
- Produces:

```ts
// flow.ts
export type FlowStep = 'neutral' | 'tiltLeft' | 'jaw' | 'smile' | 'done';
export type FlowNotice = 'noFace' | 'retry' | 'tiltTooSmall' | null;
export const STEP_SECONDS: Record<Exclude<FlowStep, 'done'>, number>; // neutral: neutralSeconds(3), tiltLeft: 2, jaw: 2, smile: 2
export function createFlow(): FlowState;
export function advanceFlow(state: FlowState, frame: VisionFrame): FlowState;
export function flowResult(state: FlowState): Calibration; // done 전이면 throw
// camera-input.ts
export function createCameraInput(calibration: Calibration, config: ControlsConfig): CameraInput;
```

- Removes:
  - `FlowResult`, `skipStep`, `switchToHeadTilt`, `GESTURE_HELP_SECONDS`
  - `App`의 `steering` 상태
  - `StartScreen`의 `steering`, `onSteeringChange` props와 조향 방식 라디오
  - `ko.start.steering*`, `ko.input.throttle`, `ko.calibration.switchToTilt`, `ko.calibration.skip`
  - `ko.calibration`의 `winkLeft`, `winkRight`, `fist`, `thumb`, `suggestHeadTilt`, `gestureHelp`
- `App`의 `calibration` 상태 타입은 `Calibration | null`이 됩니다.

**보정 흐름:**

| 단계 | 끝나면 |
|---|---|
| `neutral` 3초 | `averageNeutral`이 null이면 `noFace`로 다시 합니다. |
| `tiltLeft` 2초 | `calibrateTilt`가 실패하면 `tiltTooSmall`로 다시 합니다. |
| `jaw` 2초 | `calibrateMax(…'jawOpen')`가 실패하면 `retry`로 다시 합니다. |
| `smile` 2초 | `calibrateMax(…'mouthSmile')`가 실패하면 `retry`로 다시 합니다. |
| `done` | |

**문구 (`ko.ts`):**
- `start.tagline`: `고개를 기울여 조향하고, "아!" 하며 드리프트하고, 씩 웃으면 부스트하는 3D 카트 레이싱`
- `start.howTo`:

  | 조작 | 카메라 | 키보드 |
  |---|---|---|
  | 조향 | 고개 기울이기 | ← → |
  | 엑셀 | 자동 | 자동 |
  | 드리프트 | 입 크게 벌리기 ("아!") | Shift |
  | 부스트 | 씩 웃기 | Ctrl |

- `calibration.steps`:
  - `neutral`: `게임 화면을 보면서 평소 얼굴을 유지해 주세요`
  - `tiltLeft`: `고개를 왼쪽으로 기울여 주세요`
  - `jaw`: `입을 크게 벌려 "아!" 해 주세요 (드리프트)`
  - `smile`: `씩 웃어 주세요 (부스트)`
  - `done`: `준비 완료!`
- `calibration.notices`: `noFace`, `retry`, `tiltTooSmall`의 기존 문구를 그대로 둡니다.

- [ ] **Step 1: 실패하는 테스트 쓰기**

`flow.spec.ts`를 다시 씁니다.
- 기존 `clock`, `FRAME_MS`, `hold` 도우미는 그대로 둡니다.
- `Pose`는 `{ jaw?, smile?, roll?, face? }`이고 기본값은 jaw 0.04, smile 0, roll 0입니다.
- 끝까지 가는 기본 경로는 `neutral` 3초 → `roll: 20` 2초 → `jaw: 0.79` 2초 → `smile: 0.8` 2초입니다.

```ts
it('평소 얼굴 3초를 재고 고개 기울이기로 넘어간다');                 // step === 'tiltLeft', notice null
it('평소 단계에서 얼굴이 한 번도 안 보이면 다시 잰다');              // step 'neutral', notice 'noFace'
it('왼쪽으로 +20° 기울이면 tiltSign -1로 입 벌리기로 넘어간다');     // step 'jaw'
it('기울기가 평소 각도 기준 5° 미만이면 tiltTooSmall로 다시 한다');  // roll 3 → step 'tiltLeft', notice 'tiltTooSmall'
it('입 범위가 0.15 미만이면 입 벌리기를 다시 한다');                // jaw 0.1 → step 'jaw', notice 'retry'
it('웃음 범위가 0.15 미만이면 웃기를 다시 한다');                   // smile 0.1 → step 'smile', notice 'retry'
it('네 단계를 마치면 done이고 보정값이 나온다', () => {
  // flowResult(s)의 neutral.jawOpen ≈ 0.04, max: { jawOpen: 0.79, mouthSmile: 0.8 }, neutralRollDeg ≈ 0, tiltSign -1
});
it('done 전에 flowResult를 부르면 throw');
```

`camera-input.spec.ts`:
- 보정값을 Task 3 테스트와 같은 원값=보정값 형태로 바꿉니다.
- `thumb` 대신 `smile: 0.9` 프레임으로 부스트를 냅니다.
- `make = () => createCameraInput(calibration, DEFAULT_CONTROLS_CONFIG)`
- 기존 테스트는 이름과 기대값을 그대로 둡니다. `throttle > 0`은 이제 1입니다.

`App.spec.tsx`의 키보드 테스트는 이름을 `'키보드로 플레이하면 엑셀은 자동이고 키 입력을 레이스 화면에 전달하며, 포커스를 잃으면 키가 풀린다'`로 바꿉니다.

```ts
expect(captured?.readInput().throttle).toBe(1);
fireEvent.keyDown(window, { key: 'ArrowRight' });
expect(captured?.readInput().steer).toBe(1);
fireEvent.blur(window);
expect(captured?.readInput()).toEqual({ steer: 0, throttle: 1, drift: false, boost: false });
```

시작 화면 테스트에는 `expect(screen.queryByText('조향 방식')).toBeNull()`을 추가합니다.

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `pnpm nx test @smilerider/game -- flow camera-input App`
Expected: FAIL

- [ ] **Step 3: 구현**

- `flow.ts`: 위 보정 흐름대로 다시 씁니다. `FlowState`에서 눈과 손 관련 필드를 지우고, `neutral: NeutralPose | null`, `tiltSign`, `jawMax`, `smileMax`를 둡니다.
- `camera-input.ts`: 시그니처만 바꿉니다. 만료와 부스트 한 번 전달 규칙은 그대로입니다.
- `CalibrationScreen.tsx`:
  - props에서 `steering`을 지웁니다.
  - 건너뛰기와 고개 기울이기 전환 버튼을 지웁니다.
  - 디버그 줄은 `roll {headRollDeg.toFixed(1)}° · jawOpen {..toFixed(2)} · mouthSmile {..toFixed(2)}`로 바꿉니다.
  - 진행 막대는 `STEP_SECONDS`만 씁니다.
  - 문서 주석은 "평소 얼굴 → 고개 왼쪽 → 입 → 웃음"으로 바꿉니다.
- `App.tsx`:
  - `steering` 상태를 지웁니다.
  - `createCameraInput(cal, DEFAULT_CONTROLS_CONFIG)`를 씁니다.
  - `onDone`은 `Calibration`을 받습니다.
- `StartScreen.tsx`: 조향 방식 라디오를 지우고, 미리보기 체크박스는 남깁니다.
- `InputIndicator.tsx`: 엑셀 칸을 지웁니다(기획 10.3).
- `ko.ts`: 위 문구로 바꾸고, 쓰지 않는 키를 지웁니다.

- [ ] **Step 4: 전체 검사**

Run: `pnpm nx run-many -t lint test typecheck build`
Expected: 모두 PASS입니다. 여기서부터 워크스페이스 전체가 다시 통과합니다.

Run: `git grep -n -i -e gesture -e handEvaluated -e eyeBlink -e wink -e SteeringMode -e 엄지 -e 주먹 -e 윙크 -- apps packages`
Expected: 결과가 없습니다.

- [ ] **Step 5: Commit**

```bash
git add -A apps/game/src
git commit -m "feat(game): 새 조작에 맞춘 보정 흐름과 화면"
```

---

### Task 6: E2E와 직접 플레이 확인

**Files:**
- 바꿀 파일 없음. 문제가 있으면 해당 Task의 파일을 고칩니다.

- [ ] **Step 1: E2E**

Run: `pnpm nx e2e @smilerider/game-e2e`
Expected: PASS. 키보드 자동 주행으로 1랩을 돌면 결과 화면이 나옵니다.

- [ ] **Step 2: 입력 재생 기준이 바뀌지 않았는지 확인**

Run: `pnpm nx test @smilerider/kart -- replay`
Expected: PASS이고 finishTick은 6376 그대로입니다.

- [ ] **Step 3: 사람이 카메라로 직접 플레이 (사람에게 요청)**

`pnpm nx dev @smilerider/game`을 띄우고 아래를 확인받습니다. 문제가 있으면 수치는 `packages/controls/src/config.ts`에서만 조정합니다. 조정했다면 Task 2의 설정 테스트와 기획 10.9도 같이 바꿉니다.
- 보정 네 단계가 순서대로 끝납니다.
- 왼쪽으로 기울이면 왼쪽으로 갑니다.
- "아!"로 드리프트하고, 웃으면 부스트가 나갑니다.
- 말하거나 평소 표정일 때 드리프트나 부스트가 잘못 나가지 않습니다.
- 얼굴을 가리면 일시정지됩니다.

- [ ] **Step 4: 조정했다면 Commit**

```bash
git add -A packages/controls docs/planning.md
git commit -m "tune(controls): 직접 플레이 결과로 판정 수치 조정"
```

---

### Task 7: 외부 이름 변경과 배포 (각 단계마다 사람에게 확인)

코드 변경은 없고, 되돌리기 어렵거나 외부에 보이는 작업만 있습니다. **각 Step 전에 사람에게 확인받습니다.**

- [ ] **Step 1: main에 병합.** superpowers:finishing-a-development-branch를 따릅니다.

- [ ] **Step 2: GitHub 저장소 이름 변경**

```bash
gh repo rename SmileRider -R junjuny0227/WinkRider --yes
git remote set-url origin https://github.com/junjuny0227/SmileRider.git
```

Expected: `gh repo view junjuny0227/SmileRider`가 성공합니다. 옛 주소는 GitHub가 새 주소로 넘겨 줍니다. Actions 시크릿(`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`)은 저장소에 붙어 있으므로 그대로 남습니다.

- [ ] **Step 3: Cloudflare Pages 프로젝트 `smilerider` 만들기 (사람이 직접)**

대시보드에서 Direct Upload로 만들거나 다음 명령을 씁니다. 토큰은 채팅에 붙여 넣지 않습니다.

```bash
pnpm dlx wrangler@4.151.3 pages project create smilerider --production-branch=main
```

- [ ] **Step 4: push하고 배포 확인**

Run: `git push origin main`
Expected: Actions의 Deploy가 성공합니다. 그다음 아래를 확인합니다.
- `curl -sI https://smilerider.pages.dev/`가 200을 돌려줍니다.
- `curl -sI https://smilerider.pages.dev/models/face_landmarker-float16-1.task`에 `cache-control: public, max-age=31536000, immutable`가 있습니다.

- [ ] **Step 5: 옛 Cloudflare 프로젝트 `winkrider` 지우기 (사람이 직접, 새 주소 확인 뒤)**

- [ ] **Step 6: 로컬 폴더 이름 변경 (사람이 직접, 이 세션을 끝낸 뒤)**

`~/Documents/WinkRider`를 `~/Documents/SmileRider`로 바꿉니다. 작업 중인 세션의 작업 폴더가 바뀌므로 마지막에 합니다.
