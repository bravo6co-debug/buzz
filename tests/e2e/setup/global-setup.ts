import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Wait for API server to be ready
  let apiReady = false;
  let attempts = 0;
  while (!apiReady && attempts < 30) {
    try {
      await page.goto('http://localhost:8083/health');
      const response = await page.waitForResponse('http://localhost:8083/health', { timeout: 2000 });
      if (response.ok()) {
        apiReady = true;
        console.log('✅ API server is ready');
      }
    } catch (error) {
      attempts++;
      console.log(`⏳ Waiting for API server... (attempt ${attempts}/30)`);
      await page.waitForTimeout(2000);
    }
  }

  if (!apiReady) {
    throw new Error('❌ API server failed to start within timeout period');
  }

  // Wait for frontend apps to be ready
  const apps = [
    { name: 'Buzz App', url: 'http://localhost:8106' },
    { name: 'Buzz-Biz App', url: 'http://localhost:8105' },
    { name: 'Buzz-Admin App', url: 'http://localhost:8104' }
  ];

  for (const app of apps) {
    let appReady = false;
    attempts = 0;
    while (!appReady && attempts < 20) {
      try {
        const response = await page.goto(app.url, { waitUntil: 'networkidle' });
        if (response && response.ok()) {
          appReady = true;
          console.log(`✅ ${app.name} is ready`);
        }
      } catch (error) {
        attempts++;
        console.log(`⏳ Waiting for ${app.name}... (attempt ${attempts}/20)`);
        await page.waitForTimeout(2000);
      }
    }

    if (!appReady) {
      console.warn(`⚠️  ${app.name} may not be ready, but continuing with tests`);
    }
  }

  await browser.close();
}

export default globalSetup;