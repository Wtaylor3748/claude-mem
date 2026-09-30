#!/usr/bin/env node

/**
 * Test runner for browser automation scripts
 *
 * Usage:
 *   node test-run.mjs                    # Run all checks
 *   node test-run.mjs dlcp                # Run only DLCP check
 *   node test-run.mjs recorder            # Run only Recorder check
 *   node test-run.mjs agencies            # Run only agency portals check
 */

import { checkRecorderOfDeeds } from './recorder-property-check.mjs';
import { checkAgencyPortals } from './agency-portal-checker.mjs';
// import { checkDLCPDockets } from './dlcp-docket-checker.mjs'; // Requires user setup

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

  if (testType === 'dlcp' || testType === 'all') {
    console.log('\n' + '━'.repeat(60));
    console.log('⚖️ Testing DLCP (Requires Manual Setup)');
    console.log('━'.repeat(60));
    console.log('ℹ DLCP test requires:');
    console.log('  1. Your DLCP credentials in ~/.claude-mem/.env');
    console.log('  2. Playwright installed on your Mac via: claude mcp add playwright');
    console.log('  3. Run this script on your Mac (not in cloud session)');
    console.log('\nSkipping DLCP for now. Setup instructions are in README.md');
    results.dlcp = { status: 'not_run', reason: 'Requires manual setup on your Mac' };
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
