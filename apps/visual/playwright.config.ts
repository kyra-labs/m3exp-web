import { defineConfig, devices } from '@playwright/test';

// Fixtures are the docs/playground pages (one DOM contract for elements + react).
// Baselines are generated on Linux (CI and the Playwright Docker image) and committed;
// local Windows/macOS snapshots are git-ignored.
const browsers = {
  chromium: devices['Desktop Chrome'],
  firefox: devices['Desktop Firefox'],
  webkit: devices['Desktop Safari'],
} as const;
const schemes = ['light', 'dark'] as const;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: Boolean(process.env['CI']),
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['github'], ['html', { open: 'never' }]] : 'list',
  expect: { toHaveScreenshot: { animations: 'disabled', caret: 'hide' } },
  use: { baseURL: 'http://localhost:4321', trace: 'retain-on-failure' },
  projects: Object.entries(browsers).flatMap(([name, device]) =>
    schemes.map((colorScheme) => ({
      name: `${name}-${colorScheme}`,
      use: { ...device, colorScheme },
    })),
  ),
  webServer: {
    command: 'pnpm --filter @kyralabs/docs preview --port 4321',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});
