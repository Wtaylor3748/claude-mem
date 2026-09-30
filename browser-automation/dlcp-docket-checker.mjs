import { chromium } from 'playwright';
import { loadCredentials, saveCookies, loadCookies, getCaseNumbers, getAgencyUrls } from './config.mjs';

/**
 * DLCP Docket Checker
 *
 * Logs into D.C. Superior Court eAccess (DLCP) and pulls current docket info
 * for all Capitol Vista cases.
 *
 * WARNING: DLCP has a CAPTCHA. The first run will PAUSE and wait for manual CAPTCHA entry.
 * Subsequent runs will use saved session cookies to skip CAPTCHA (until expiry).
 */

const DLCP_URL = 'https://dlcp.dcourt.dc.gov';
const CASE_SEARCH_URL = `${DLCP_URL}/ccis/case-search`;

export async function checkDLCPDockets() {
  const browser = await chromium.launch({
    headless: true, // Cloud environment requires headless mode
    executablePath: '/opt/pw-browsers/chromium'
  });
  const context = await browser.newContext();

  const creds = loadCredentials();
  const cases = getCaseNumbers();

  // Try to use saved cookies to skip CAPTCHA
  const savedCookies = loadCookies('dlcp');
  if (savedCookies) {
    await context.addCookies(savedCookies);
    console.log('ℹ Using saved session cookies (CAPTCHA should be skipped)');
  } else {
    console.log('⚠ No saved cookies found. You will need to solve the CAPTCHA manually.');
  }

  const page = await context.newPage();
  const results = {};

  try {
    // Navigate to case search
    console.log(`\n→ Navigating to ${CASE_SEARCH_URL}...`);
    await page.goto(CASE_SEARCH_URL, { waitUntil: 'networkidle' });

    // Check if login is required (CAPTCHA present)
    const captchaPresent = await page.$('iframe[title*="reCAPTCHA"]') !== null;
    if (captchaPresent && !savedCookies) {
      throw new Error(
        'DLCP CAPTCHA required. No saved session cookies found.\n' +
        'First-time setup: Visit https://dlcp.dcourt.dc.gov manually in your browser, log in with your DLCP credentials, solve the CAPTCHA, and wait for cookies to be saved to ~/.claude-mem/browser-sessions/dlcp.json\n' +
        'Once saved, this script will use them for future runs.'
      );
    }

    // Search for each case
    for (const [caseType, caseNo] of Object.entries(cases)) {
      console.log(`\n→ Searching for case: ${caseNo}`);

      // Clear search field
      await page.fill('input[name="caseNumber"]', '');
      await page.fill('input[name="caseNumber"]', caseNo);

      // Submit search
      await page.click('button[type="submit"]');
      await page.waitForNavigation({ waitUntil: 'networkidle' });

      // Extract docket info (basic structure; adjust selectors based on actual DLCP UI)
      const docketInfo = await page.evaluate(() => {
        const rows = document.querySelectorAll('table tr');
        const docket = [];
        rows.forEach((row) => {
          const cells = row.querySelectorAll('td');
          if (cells.length > 0) {
            docket.push({
              date: cells[0]?.textContent?.trim() || '',
              event: cells[1]?.textContent?.trim() || '',
              documents: cells[2]?.textContent?.trim() || '',
            });
          }
        });
        return docket;
      });

      results[caseNo] = {
        caseType,
        entries: docketInfo,
        checkedAt: new Date().toISOString(),
      };

      console.log(`✓ Found ${docketInfo.length} docket entries for ${caseNo}`);
    }

  } catch (error) {
    console.error(`✗ Error checking DLCP dockets: ${error.message}`);
    results.error = error.message;
  } finally {
    await context.close();
    await browser.close();
  }

  return results;
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const results = await checkDLCPDockets();
    console.log('\n--- DLCP Docket Check Results ---');
    console.log(JSON.stringify(results, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
