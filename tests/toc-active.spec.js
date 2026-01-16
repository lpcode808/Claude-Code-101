// Regression: scroll through the "Fundamental Shift" section and assert TOC highlight updates.
const path = require('path');
const { pathToFileURL } = require('url');
const { test, expect } = require('@playwright/test');

const headingsToCheck = [
  'The Fundamental Shift: Chat vs Agent',
  'The Old Way: AI as a Chat Partner',
  'The New Way: AI as an Agent',
  'What "Agentic" Actually Means',
  'Why This Matters Beyond Coding',
  'The Mental Model Shift',
  'When to Use Which',
  'The Catch: Trust and Verification',
  'The Future State',
  'What This Means for You',
];

function normalizeText(text) {
  return text.replace(/\s+/g, ' ').trim();
}

test('toc highlights headings through fundamental shift section', async ({ page }) => {
  const docPath = path.resolve(__dirname, '..', 'claude-code-guide.html');
  const docUrl = pathToFileURL(docPath).href;
  await page.goto(docUrl);
  await page.waitForSelector('#toc-nav a');

  async function waitForHeadingId(text) {
    await page.waitForFunction((targetText) => {
      const normalize = (value) => value.replace(/\s+/g, ' ').trim();
      const target = normalize(targetText);
      const heading = Array.from(document.querySelectorAll('.main-content h2, .main-content h3'))
        .find((el) => normalize(el.textContent) === target);
      return heading && heading.id;
    }, text);

    return page.evaluate((targetText) => {
      const normalize = (value) => value.replace(/\s+/g, ' ').trim();
      const target = normalize(targetText);
      const heading = Array.from(document.querySelectorAll('.main-content h2, .main-content h3'))
        .find((el) => normalize(el.textContent) === target);
      return heading ? heading.id : null;
    }, text);
  }

  async function expectActiveHeading(text) {
    const headingId = await waitForHeadingId(text);
    expect(headingId, `Missing heading id for: ${text}`).toBeTruthy();

    const heading = page.locator(`#${headingId}`);
    await heading.evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await page.evaluate(() => {
      window.dispatchEvent(new Event('scroll'));
    });
    await page.evaluate(() => new Promise(requestAnimationFrame));
    await page.evaluate(() => {
      if (typeof window.__updateActiveSection === 'function') {
        window.__updateActiveSection();
      }
    });

    await page.waitForFunction((id) => {
      const link = document.querySelector(`#toc-nav a[data-id="${id}"]`);
      return link
        && link.classList.contains('active')
        && window.__tocActiveId === id;
    }, headingId);

    const activeLink = page.locator(`#toc-nav a[data-id="${headingId}"]`);
    await expect(activeLink).toHaveClass(/active/);
    await expect(activeLink).toBeVisible();
  }

  for (const text of headingsToCheck) {
    const normalized = normalizeText(text);
    await test.step(`active: ${normalized}`, async () => {
      await expectActiveHeading(normalized);
    });
  }
});
