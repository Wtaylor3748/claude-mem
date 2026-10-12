#!/usr/bin/env node

/**
 * Test runner for browser automation scripts
 *
 * Usage:
 *   node test-run.mjs                    # Run all checks
 *   node test-run.mjs dlcp                # Run only the Superior Court docket check (headed browser; run on your Mac)
 *   node test-run.mjs recorder            # Run only Recorder check
 *   node test-run.mjs agencies            # Run only agency portals check
 */

import { checkRecorderOfDeeds } from './recorder-property-check.mjs';
import { checkAgencyPortals } from './agency-portal-checker.mjs';
import { checkCourtDockets } from './dlcp-docket-checker.mjs';

const testType = process.argv[2] || 'all';

async function runTests() {
  console.log('🚀 Capitol Vista Browser Automation Tests');
  console.log(`📅 ${new Date().toISOString()}\n`);

  const results = {};

  if (testType === 'recorder' || testType === 'all') {
    console.log('━'.repeat(60));
    console.log('📋 Testing Recorder of Deeds (Public Access)');
    console.log('━'.repeat(60));
    try {
      results.recorder = await checkRecorderOfDeeds();
      console.log('\n✓ Recorder check completed');
    } catch (error) {
      console.error(`✗ Recorder check failed: ${error.message}`);
      results.recorder = { error: error.message };
    }
  }

  if (testType === 'agencies' || testType === 'all') {
    console.log('\n' + '━'.repeat(60));
    console.log('🏛️ Testing Agency Portals (Public Access)');
    console.log('━'.repeat(60));
    try {
      results.agencies = await checkAgencyPortals();
      console.log('\n✓ Agency portals check completed');
    } catch (error) {
      console.error(`✗ Agency portals check failed: ${error.message}`);
      results.agencies = { error: error.message };
    }
  }

  // The docket check opens a visible browser (possible CAPTCHA), so it runs only
  // when asked for by name, not under 'all'.
  if (testType === 'dlcp') {
    console.log('\n' + '━'.repeat(60));
    console.log('⚖️ Testing Superior Court Portal dockets');
    console.log('━'.repeat(60));
    try {
      results.dockets = await checkCourtDockets();
      if (results.dockets.error) throw new Error(results.dockets.error);
      console.log('\n✓ Docket check completed');
    } catch (error) {
      console.error(`✗ Docket check failed: ${error.message}`);
      results.dockets = { error: error.message };
    }
  }

  console.log('\n' + '━'.repeat(60));
  console.log('📊 Test Summary');
  console.log('━'.repeat(60));
  console.log(JSON.stringify(results, null, 2));

  process.exit(Object.values(results).some((r) => r.error) ? 1 : 0);
}

runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
