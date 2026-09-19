import puppeteer from 'puppeteer-core';

const base = 'http://localhost:5174';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`));
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`[console] ${msg.text()}`); });
await page.setViewport({ width: 1200, height: 1000 });

async function clickText(text) {
  await page.evaluate((t) => {
    const el = Array.from(document.querySelectorAll('button, a')).find((b) => b.textContent?.trim().includes(t));
    if (!el) throw new Error(`Not found: ${t}`);
    el.scrollIntoView({ block: 'center' });
    el.click();
  }, text);
}

await page.goto(`${base}/reservar`, { waitUntil: 'networkidle0' });
await clickText('Jaén');
await new Promise((r) => setTimeout(r, 150));
await clickText('Continuar');
await new Promise((r) => setTimeout(r, 250));
await clickText('Sé qué especialidad necesito');
await new Promise((r) => setTimeout(r, 200));
await clickText('Odontología general');
await new Promise((r) => setTimeout(r, 150));
await clickText('Continuar');
await new Promise((r) => setTimeout(r, 250));
await clickText('Cualquier profesional disponible');
await new Promise((r) => setTimeout(r, 150));
await clickText('Continuar');
await new Promise((r) => setTimeout(r, 400));
await page.evaluate(() => {
  const buttons = Array.from(document.querySelectorAll('button')).filter(
    (b) => /^\d+$/.test(b.textContent?.trim() ?? '') && !b.disabled,
  );
  buttons[0]?.click();
});
await new Promise((r) => setTimeout(r, 500));
await page.evaluate(() => {
  const buttons = Array.from(document.querySelectorAll('button')).filter((b) => /^\d{2}:\d{2}$/.test(b.querySelector('span')?.textContent?.trim() ?? ''));
  buttons[0]?.click();
});
await new Promise((r) => setTimeout(r, 150));
await clickText('Continuar');
await new Promise((r) => setTimeout(r, 400));
console.log('After step 4 (should be /reservar/datos):', page.url());
await page.screenshot({ path: 'C:/Users/YEINER/AppData/Local/Temp/shots/nv-01-patient-data.png' });

await page.type('input[name="firstName"]', 'Ana');
await page.type('input[name="lastName"]', 'Torres');
await page.type('input[name="dni"]', '87654321');
await page.type('input[name="phone"]', '912345678');
await page.type('input[name="email"]', 'ana.torres@example.com');
await clickText('Continuar');
await new Promise((r) => setTimeout(r, 400));
console.log('After patient data (should be /reservar/confirmar, skipping verify):', page.url());
await page.screenshot({ path: 'C:/Users/YEINER/AppData/Local/Temp/shots/nv-02-summary.png' });

await clickText('Confirmar cita');
await new Promise((r) => setTimeout(r, 500));
console.log('After confirm (should be /reservar/exito):', page.url());
await page.screenshot({ path: 'C:/Users/YEINER/AppData/Local/Temp/shots/nv-03-success.png' });

const whatsappHref = await page.evaluate(() => document.querySelector('a[href*="wa.me"]')?.getAttribute('href'));
console.log('WhatsApp link:', whatsappHref);

console.log('ERRORS:', JSON.stringify(errors, null, 2));
await browser.close();
