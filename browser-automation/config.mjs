import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const CLAUDE_MEM_DIR = join(homedir(), '.claude-mem');
const SESSION_DIR = join(CLAUDE_MEM_DIR, 'browser-sessions');
const ENV_FILE = join(CLAUDE_MEM_DIR, '.env');

/**
 * Load credentials from ~/.claude-mem/.env
 * Expected format:
 *   DLCP_USERNAME=user@example.com
 *   DLCP_PASSWORD=your_password
 */
export function loadCredentials() {
  if (!existsSync(ENV_FILE)) {
    throw new Error(`Missing credentials file: ${ENV_FILE}\nCreate it with your DLCP_USERNAME and DLCP_PASSWORD`);
  }

  const content = readFileSync(ENV_FILE, 'utf-8');
  const creds = {};

  content.split('\n').forEach((line) => {
    const [key, ...valueParts] = line.split('=');
    if (key && key.trim()) {
      creds[key.trim()] = valueParts.join('=').trim();
    }
  });

  if (!creds.DLCP_USERNAME || !creds.DLCP_PASSWORD) {
    throw new Error('Missing DLCP_USERNAME or DLCP_PASSWORD in ~/.claude-mem/.env');
  }

  return creds;
}

/**
 * Save session cookies to persistent storage for reuse
 */
export function saveCookies(cookieArray, serviceName) {
  const sessionFile = join(SESSION_DIR, `${serviceName}-cookies.json`);
  try {
    if (!existsSync(SESSION_DIR)) {
      require('child_process').execSync(`mkdir -p ${SESSION_DIR}`);
    }
    writeFileSync(sessionFile, JSON.stringify(cookieArray, null, 2));
    console.log(`✓ Saved ${serviceName} session cookies to ${sessionFile}`);
    return sessionFile;
  } catch (e) {
    console.warn(`Failed to save cookies for ${serviceName}: ${e.message}`);
    return null;
  }
}

/**
 * Load previously saved session cookies
 */
export function loadCookies(serviceName) {
  const sessionFile = join(SESSION_DIR, `${serviceName}-cookies.json`);
  if (existsSync(sessionFile)) {
    try {
      const cookies = JSON.parse(readFileSync(sessionFile, 'utf-8'));
      console.log(`✓ Loaded ${serviceName} session cookies (${cookies.length} cookies)`);
      return cookies;
    } catch (e) {
      console.warn(`Failed to load cookies for ${serviceName}: ${e.message}`);
      return null;
    }
  }
  return null;
}

/**
 * Parse environment for case numbers (from capitalized env vars or hardcoded defaults)
 */
export function getCaseNumbers() {
  return {
    primary: '2023-LTB-006634',
    consolidated: '2025-LTB-007644',
    cab: '2024-CAB-004360',
    appeal: '24-CV-0537',
  };
}

/**
 * Get D.C. agency portal URLs
 */
export function getAgencyUrls() {
  return {
    dlcp: 'https://dlcp.dcourt.dc.gov',
    recorder: 'https://www.dccourts.us/dc-recorder-of-deeds',
    otr: 'https://otr.dc.gov',
    dob: 'https://dbh.dc.gov',
    doee: 'https://doee.dc.gov',
  };
}
