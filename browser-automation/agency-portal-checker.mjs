import { chromium } from 'playwright';
import { getAgencyUrls } from './config.mjs';

/**
 * D.C. Agency Portal Checker
 *
 * Checks public D.C. agency portals for Capitol Vista-related records:
 * - OTR (Office of Tax and Revenue): tax records, property status
 * - DOB (Department of Buildings): building violations, permits, complaints
 * - DOEE (Dept of Energy & Environment): environmental violations, hazardous materials
 *
 * This is a template; actual agency URLs and search interfaces vary and may change.
 */

const PROPERTY = '810 New Jersey Ave NW, Washington, DC 20001';

export async function checkAgencyPortals() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/opt/pw-browsers/chromium'
  });
  const urls = getAgencyUrls();
  const results = {
    property: PROPERTY,
    checkedAt: new Date().toISOString(),
    agencies: {},
  };

  // Check each agency
  for (const [agency, baseUrl] of Object.entries(urls)) {
    if (agency === 'dlcp' || agency === 'recorder') {
      // Skip DLCP and Recorder; they have dedicated scripts
      continue;
    }

    console.log(`\n→ Checking ${agency.toUpperCase()}...`);
    results.agencies[agency] = { url: baseUrl, status: 'pending', records: [] };

    const page = await browser.newPage().catch(() => null);
    if (!page) {
      results.agencies[agency].status = 'error';
      results.agencies[agency].error = 'Failed to create page';
      continue;
    }

    try {
      // Navigate to agency site
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {
        // Site may not load; record the error but continue
        throw new Error(`Could not reach ${baseUrl}`);
      });

      // Look for search input or property lookup
      const searchInputs = await page.$$('input[type="text"], input[placeholder*="address"], input[placeholder*="property"]');

      if (searchInputs.length > 0) {
        // Try first search input
        await searchInputs[0].fill(PROPERTY);
        await page.waitForTimeout(500);

        // Look for search button
        const searchBtn = await page.$('button[type="submit"], button:has-text("Search"), button:has-text("Find")').catch(() => null);
        if (searchBtn) {
          await searchBtn.click();
          await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
        }

        // Extract any visible results (template; adjust based on actual site layout)
        const visibleText = await page.evaluate(() => {
          return document.body.innerText.substring(0, 1000); // First 1000 chars
        });

        results.agencies[agency].status = 'found_data';
        results.agencies[agency].records = [{ summary: visibleText }];
      } else {
        // No obvious search interface; just record that we checked
        results.agencies[agency].status = 'checked_no_search';
      }

      console.log(`✓ ${agency.toUpperCase()}: ${results.agencies[agency].status}`);

    } catch (error) {
      results.agencies[agency].status = 'error';
      results.agencies[agency].error = error.message;
      console.log(`✗ ${agency.toUpperCase()}: ${error.message}`);
    } finally {
      await page.close().catch(() => {});
    }
  }

  await browser.close();
  return results;
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const results = await checkAgencyPortals();
    console.log('\n--- Agency Portal Check Results ---');
    console.log(JSON.stringify(results, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
