# SmileRider

고개를 기울여 조향하고, "아!" 하며 드리프트하고, 씩 웃으면 부스트하는 3D 카트 레이싱 웹 게임

> 넥슨 및 카트라이더와 무관한 팬 프로젝트입니다.

## 실행

```bash
pnpm install
pnpm nx dev @smilerider/game
```

## 테스트

```bash
pnpm nx run-many -t lint test typecheck build
pnpm nx e2e @smilerider/game-e2e   # 키보드 모드 자동 주행으로 1랩 완주 (약 1분)
```

## 배포

`main`에 push하면 GitHub Actions(`.github/workflows/deploy.yml`)가 검사·빌드한 뒤 Cloudflare Pages에 올립니다. 처음 한 번은 직접 준비해야 합니다.

1. Cloudflare 대시보드에서 Pages 프로젝트 `smilerider`를 만듭니다 (Direct Upload). 무료 플랜의 대역폭 조건도 이때 확인합니다.
2. Cloudflare에서 Pages 편집 권한이 있는 API 토큰을 만듭니다.
3. GitHub 저장소 Settings → Secrets and variables → Actions에 `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`를 등록합니다.

카메라는 HTTPS에서만 열리므로, 배포된 주소(`*.pages.dev`)에서 카메라 권한 요청이 뜨는지 확인합니다.

## 문서

- [기획](docs/planning.md)
- [MVP 구현 계획](docs/superpowers/plans/2026-10-22-winkrider-mvp.md)
