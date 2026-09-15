import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const BASE_URL = process.env.SCREENSHOT_BASE_URL ?? 'https://forzaai.app';
const EMAIL = process.env.SCREENSHOT_EMAIL;
const PASSWORD = process.env.SCREENSHOT_PASSWORD;
const OUT_DIR = 'store-assets/app-store-screenshots';

if (!EMAIL || !PASSWORD) {
  console.error(
    'Faltan credenciales: definí SCREENSHOT_EMAIL y SCREENSHOT_PASSWORD (cuenta demo) como variables de entorno.',
  );
  process.exit(1);
}

// iPhone 6.7" class (iPhone 14/15 Pro Max): 1290x2796 @ 3x — one of Apple's
// currently accepted App Store screenshot sizes for apps without iPad support.
const VIEWPORT = { width: 430, height: 932 };
const DEVICE_SCALE_FACTOR = 3;

const SCREENS = [
  { path: '/dashboard', name: '01-dashboard' },
  { path: '/nutrition?date=2026-09-07', name: '02-nutrition' },
  { path: '/training', name: '03-training' },
  { path: '/coach', name: '04-coach', afterLoad: scrollToTop },
  { path: '/progress', name: '05-progress' },
  { path: '/calendar', name: '06-calendar', afterLoad: clickCalendarDay(7) },
];

async function scrollToTop(page) {
  await page.evaluate(() => window.scrollTo(0, 0));
}

function clickCalendarDay(day) {
  return async (page) => {
    await page.getByText(String(day), { exact: true }).first().click();
  };
}

mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: VIEWPORT,
  deviceScaleFactor: DEVICE_SCALE_FACTOR,
  isMobile: true,
  hasTouch: true,
  locale: 'es-MX',
});
const page = await context.newPage();

console.log(`Login as ${EMAIL} @ ${BASE_URL} ...`);
await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
await page.locator('#email').fill(EMAIL);
await page.locator('#password').fill(PASSWORD);
await page.locator('button[type="submit"]').click();
await page.waitForURL(/\/dashboard/, { timeout: 20000 });
console.log('Logged in.');

for (const screen of SCREENS) {
  const url = `${BASE_URL}${screen.path}`;
  console.log(`Capturing ${url} ...`);
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800); // let charts/animations settle
  if (screen.afterLoad) {
    await screen.afterLoad(page);
    await page.waitForTimeout(400);
  }
  const outPath = `${OUT_DIR}/${screen.name}.png`;
  await page.screenshot({ path: outPath });
  console.log(`  -> ${outPath}`);
}

await browser.close();
console.log('Done.');
