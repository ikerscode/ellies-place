import { defineConfig, devices, type Project } from '@playwright/test';

/**
 * Suites:
 * - `npm run e2e`   runs tests/e2e/**\/*.spec.ts
 * - `npm run shots` runs tests/e2e/**\/*.shots.ts (EP_SUITE=shots), writing reports/shots/<engine>/*.png
 *
 * Set EP_SKIP_WEBKIT=1 to drop the WebKit project (see reports/env.md for why it may be needed).
 */
const suite = process.env.EP_SUITE === 'shots' ? 'shots' : 'e2e';
const skipWebkit = process.env.EP_SKIP_WEBKIT === '1';
const PORT = 5199;

const projects: Project[] = [
  { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 800 } } },
];
if (!skipWebkit) {
  projects.push({
    name: 'webkit',
    use: { ...devices['Desktop Safari'], viewport: { width: 1440, height: 800 } },
  });
}

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: suite === 'shots' ? '**/*.shots.ts' : '**/*.spec.ts',
  outputDir: 'test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects,
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
