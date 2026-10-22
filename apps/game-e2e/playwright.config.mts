import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { getReadyUrl, workspaceRoot } from '@nx/devkit';

// getReadyUrl moves the address to the port the server task reported.
// 디버그 옵션(VITE_ENABLE_DEBUG)은 개발 서버에서만 켤 수 있으므로 CI에서도 dev 서버를 쓴다.
// preview는 배포용 빌드를 그대로 띄워 자동 주행 옵션이 꺼져 있다.
const webServerAddress = getReadyUrl('http://localhost:4200');

// For CI, you may want to set BASE_URL to the deployed application.
const baseURL = process.env['BASE_URL'] || webServerAddress;

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import 'dotenv/config';

/**
 * See https://playwright.dev/docs/test-configuration.
 *
 * Generated as a .mts file so Node forces ESM regardless of workspace
 * `type`. Playwright routes `.mts` through its ESM loader (dynamic import,
 * bypassing the pirates CJS-compile path), and Nx's native TS strip loads
 * `.mts` directly. Playwright's configLoader auto-discovers
 * `playwright.config.mts` via its extension list
 * (.ts/.js/.mts/.mjs/.cts/.cjs).
 */
export default defineConfig({
  ...nxE2EPreset(import.meta.dirname, { testDir: './src' }),
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'pnpm exec nx run @winkrider/game:dev',
    url: webServerAddress,
    reuseExistingServer: true,
    cwd: workspaceRoot,
    // 디버그 빌드에서만 ?debug=autopilot, ?laps= 옵션이 동작한다
    env: { VITE_ENABLE_DEBUG: 'true' },
  },
  projects: [
    // 1랩을 끝까지 달리는 테스트라 Chromium 하나로만 돌린다
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // Uncomment for mobile browsers support
    /* {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    }, */

    // Uncomment for branded browsers
    /* {
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
    {
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    } */
  ],
});
