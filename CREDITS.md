# Credits

WinkRider가 사용하는 외부 에셋과 그 출처, 라이선스입니다. CC0라서 표기 의무가 없는 에셋도 모두 기록합니다.

## 인식 모델

| 파일 | 출처 | 라이선스 |
|---|---|---|
| `apps/game/public/models/face_landmarker-float16-1.task` | [MediaPipe Face Landmarker](https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task) | Apache-2.0 |
| `apps/game/public/models/gesture_recognizer-float16-1.task` | [MediaPipe Gesture Recognizer](https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task) | Apache-2.0 |

MediaPipe WASM(`@mediapipe/tasks-vision`)은 npm 패키지에서 빌드할 때 복사합니다 (Apache-2.0).

## 소리

| 파일 | 원본 | 출처 | 라이선스 |
|---|---|---|---|
| `apps/game/public/sounds/wall-hit.ogg` | `impactMetal_heavy_000.ogg` | [Kenney Impact Sounds](https://kenney.nl/assets/impact-sounds) | CC0 |
| `apps/game/public/sounds/ui-click.ogg` | `click_001.ogg` | [Kenney Interface Sounds](https://kenney.nl/assets/interface-sounds) | CC0 |
| `apps/game/public/sounds/go.ogg` | `Female/go.ogg` | [Kenney Voiceover Pack](https://kenney.nl/assets/voiceover-pack) | CC0 |
| `apps/game/public/sounds/finish.ogg` | `8-Bit jingles/jingles_NES00.ogg` | [Kenney Music Jingles](https://kenney.nl/assets/music-jingles) | CC0 |

엔진음과 드리프트 마찰음은 Web Audio API로 합성하고, 카운트다운·부스트·부스터 획득 효과음은 [ZzFX](https://github.com/KilledByAPixel/ZzFX)(MIT)로 만듭니다.
