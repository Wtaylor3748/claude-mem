import { chromium } from 'playwright';

/**
 * D.C. Recorder of Deeds Property Checker
 *
 * Pulls property records for 810 New Jersey Ave NW, Washington DC 20001
 * (public access, no authentication required).
 *
 * Searches for: ownership info, liens, recent recorded documents, conveyances.
 */

const RECORDER_URL = 'https://www.dccourts.us/dc-recorder-of-deeds';
const SEARCH_URL = `${RECORDER_URL}/search/web-search`; // Adjusted URL; may need update based on actual interface

export async function checkRecorderOfDeeds() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const results = {
    address: '810 New Jersey Ave NW, Washington, DC 20001',
    checkedAt: new Date().toISOString(),
    records: [],
    error: null,
  };

  try {
    // Navigate to Recorder's Office search
    console.log(`\n→ Navigating to ${SEARCH_URL}...`);
    await page.goto(SEARCH_URL, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {
      // Fallback to main URL if search page doesn't exist
      return page.goto(RECORDER_URL, { waitUntil: 'networkidle' });
    });

    // Look for search input (selectors may vary; this is a template)
    const searchInput = await page.$('input[placeholder*="address"], input[placeholder*="property"], input[id*="search"]');
    if (!searchInput) {
      console.log('⚠ Could not find search input on Recorder site. Attempting direct document search...');
      // Alternative: try to extract info from page if already loaded
      const pageContent = await page.content();
      results.records = [{
        type: 'page_source',
        content: pageContent.substring(0, 500), // First 500 chars as sample
      }];
    } else {
      // Fill search and submit
      await searchInput.fill('810 New Jersey Ave NW');

      // Look for submit button
      const submitBtn = await page.$('button[type="submit"], button:has-text("Search")').catch(() => null);
      if (submitBtn) {
        await submitBtn.click();
        await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
      }

      // Wait a bit for results to load
      await page.waitForTimeout(2000);

      // Extract record data (template selectors)
      const records = await page.evaluate(() => {
        const recordRows = document.querySelectorAll('tr, div[class*="record"], div[class*="document"]');
        const extracted = [];
        recordRows.forEach((row) => {
          const text = row.textContent?.trim();
          if (text && text.length > 10) {
            extracted.push(text);
          }
        });
        return extracted;
      });

      results.records = records.slice(0, 20); // Limit to 20 records
      console.log(`✓ Found ${records.length} records for property`);
    }

  } catch (error) {
    console.error(`✗ Error checking Recorder of Deeds: ${error.message}`);
    results.error = error.message;
  } finally {
    await browser.close();
  }

  return results;
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const results = await checkRecorderOfDeeds();
    console.log('\n--- Recorder of Deeds Results ---');
    console.log(JSON.stringify(results, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
