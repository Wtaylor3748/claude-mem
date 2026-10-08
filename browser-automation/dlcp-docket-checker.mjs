import { chromium } from 'playwright';
import { saveCookies, loadCookies, getCaseNumbers, getAgencyUrls } from './config.mjs';

/**
 * Superior Court Docket Checker
 *
 * Pulls Register of Actions entries for the Capitol Vista Superior Court cases
 * from the D.C. Superior Court Odyssey Portal (civil, L&T, and CAB cases since
 * Oct 31, 2022). The file keeps its old name so existing callers still work.
 * DLCP is the licensing agency, not the court; no DLCP login is used.
 *
 * Public case records are viewable without an account. If the Portal shows a
 * CAPTCHA, the first run pauses for manual entry and saves session cookies.
 *
 * DCCA appeals (26-CV-0411) are not on this Portal; see getAppealNumbers().
 */

const PORTAL_URL = getAgencyUrls().courtPortal;

// [verify selectors on live portal] The Odyssey Portal case search has not been
// inspected from this repo. Confirm each selector in a headed run and update.
const SELECTORS = {
  caseNumberInput: 'input[name="caseNumber"], input[id*="CaseNumber" i], input[placeholder*="case number" i]',
  submit: 'button[type="submit"], input[type="submit"]',
  resultLink: 'a[href*="CaseDetail" i], a.caseLink',
  rows: 'table tr',
};

export async function checkDLCPDockets() {
  const browser = await chromium.launch({ headless: false }); // Show browser for CAPTCHA
  const context = await browser.newContext();

  const cases = getCaseNumbers();

  // Try to use saved cookies to skip CAPTCHA
  const savedCookies = loadCookies('court-portal');
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
    console.log(`\n→ Navigating to ${PORTAL_URL}...`);
    await page.goto(PORTAL_URL, { waitUntil: 'networkidle' });

    // Check if login is required (CAPTCHA present)
    const captchaPresent = await page.$('iframe[title*="reCAPTCHA"]') !== null;
    if (captchaPresent && !savedCookies) {
      console.log('\n⚠ CAPTCHA detected. Waiting for manual entry (you have 5 minutes)...');
      console.log('   Please solve the CAPTCHA in the browser window.');

      // Wait for user to solve CAPTCHA and navigate
      await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 5 * 60 * 1000 }).catch(() => {
        throw new Error('CAPTCHA timeout: Please solve manually and refresh.');
      });

      // Save cookies for future runs
      const cookies = await context.cookies();
      await saveCookies(cookies, 'court-portal');
    }

    // Search for each case
    for (const [caseType, caseNo] of Object.entries(cases)) {
      console.log(`\n→ Searching for case: ${caseNo}`);

      const input = await page.$(SELECTORS.caseNumberInput);
      if (!input) {
        throw new Error(`Case-number field not found at ${page.url()}; update SELECTORS.caseNumberInput`);
      }
      await input.fill('');
      await input.fill(caseNo);

      await Promise.all([
        page.waitForLoadState('networkidle'),
        page.click(SELECTORS.submit),
      ]);

      // Odyssey lists matching cases first; open the case if a link is shown.
      const caseLink = await page.$(SELECTORS.resultLink);
      if (caseLink) {
        await Promise.all([page.waitForLoadState('networkidle'), caseLink.click()]);
      }

      const docketInfo = await page.evaluate((rowSelector) => {
        const rows = document.querySelectorAll(rowSelector);
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
      }, SELECTORS.rows);

      results[caseNo] = {
        caseType,
        entries: docketInfo,
        checkedAt: new Date().toISOString(),
      };

      console.log(`✓ Found ${docketInfo.length} docket entries for ${caseNo}`);
    }

  } catch (error) {
    console.error(`✗ Error checking court dockets: ${error.message}`);
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
    console.log('\n--- Superior Court Docket Check Results ---');
    console.log(JSON.stringify(results, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

export { checkDLCPDockets as checkCourtDockets };
