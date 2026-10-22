# Credits

SmileRider가 사용하는 외부 에셋과 그 출처, 라이선스입니다. CC0라서 표기 의무가 없는 에셋도 모두 기록합니다.

## 인식 모델

| 파일 | 출처 | 라이선스 |
|---|---|---|
| `apps/game/public/models/face_landmarker-float16-1.task` | [MediaPipe Face Landmarker](https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task) | Apache-2.0 |

MediaPipe WASM(`@mediapipe/tasks-vision`)은 npm 패키지에서 빌드할 때 복사합니다 (Apache-2.0).

## 3D 모델

`apps/game/public/models3d/`의 모델은 원본 GLB에 텍스처를 넣고 `@gltf-transform/cli` 4.5.1의 `optimize`(압축 없음)로 정리했습니다.

| 파일 | 원본 | 출처 | 라이선스 |
|---|---|---|---|
| `kart-oopi.glb` | `kart-oopi.glb` | [Kenney Car Kit](https://kenney.nl/assets/car-kit) | CC0 |
| `building-a.glb`, `building-c.glb`, `building-f.glb`, `building-k.glb` | `building-type-a/c/f/k.glb` | [Kenney City Kit (Suburban)](https://kenney.nl/assets/city-kit-suburban) | CC0 |
| `tree-large.glb`, `tree-small.glb` | `tree-large.glb`, `tree-small.glb` | [Kenney City Kit (Suburban)](https://kenney.nl/assets/city-kit-suburban) | CC0 |
| `street-light.glb` | `light-square.glb` | [Kenney City Kit (Roads)](https://kenney.nl/assets/city-kit-roads) | CC0 |

도로, 가드레일, 고가 교각은 에셋 없이 트랙 중심선 데이터로 코드에서 만듭니다.

## 소리

| 파일 | 원본 | 출처 | 라이선스 |
|---|---|---|---|
| `apps/game/public/sounds/wall-hit.ogg` | `impactMetal_heavy_000.ogg` | [Kenney Impact Sounds](https://kenney.nl/assets/impact-sounds) | CC0 |
| `apps/game/public/sounds/ui-click.ogg` | `click_001.ogg` | [Kenney Interface Sounds](https://kenney.nl/assets/interface-sounds) | CC0 |
| `apps/game/public/sounds/go.ogg` | `Female/go.ogg` | [Kenney Voiceover Pack](https://kenney.nl/assets/voiceover-pack) | CC0 |
| `apps/game/public/sounds/finish.ogg` | `8-Bit jingles/jingles_NES00.ogg` | [Kenney Music Jingles](https://kenney.nl/assets/music-jingles) | CC0 |

엔진음과 드리프트 마찰음은 Web Audio API로 합성하고, 카운트다운·부스트·부스터 획득 효과음은 [ZzFX](https://github.com/KilledByAPixel/ZzFX)(MIT)로 만듭니다.
