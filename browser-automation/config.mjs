import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const CLAUDE_MEM_DIR = join(homedir(), '.claude-mem');
const SESSION_DIR = join(CLAUDE_MEM_DIR, 'browser-sessions');
const ENV_FILE = join(CLAUDE_MEM_DIR, '.env');

/**
 * Read ~/.claude-mem/.env as key/value pairs without requiring any key.
 * Returns {} when the file is missing.
 */
export function loadEnv() {
  if (!existsSync(ENV_FILE)) return {};
  const env = {};
  readFileSync(ENV_FILE, 'utf-8').split('\n').forEach((line) => {
    const [key, ...valueParts] = line.split('=');
    if (key && key.trim() && !key.trim().startsWith('#')) {
      env[key.trim()] = valueParts.join('=').trim();
    }
  });
  return env;
}

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
      mkdirSync(SESSION_DIR, { recursive: true });
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
  // Superior Court cases only; these are on the Odyssey Portal.
  return {
    primary: '2023-LTB-006634',
    consolidated: '2025-LTB-007644',
    cab: '2024-CAB-004360',
  };
}

/**
 * D.C. Court of Appeals cases. These are not on the Superior Court Portal;
 * check them at https://www.dccourts.gov/services/cases-online.
 */
export function getAppealNumbers() {
  return {
    protectiveOrderAppeal: '26-CV-0411',
    // 24-CV-0537 is closed (affirmed July 31, 2025; mandate issued).
  };
}

/**
 * Get D.C. agency portal URLs
 */
export function getAgencyUrls() {
  const env = loadEnv();
  return {
    // Superior Court civil, L&T, and CAB dockets moved to the Odyssey Portal on
    // Oct 31, 2022; dccourts.gov/eAccess links to it. Override with
    // DC_COURT_PORTAL_URL once the direct Portal URL is confirmed.
    courtPortal: env.DC_COURT_PORTAL_URL || 'https://www.dccourts.gov/eAccess',
    // Department of Licensing and Consumer Protection (licenses, CorpOnline).
    dlcp: 'https://dlcp.dc.gov',
    // Recorder of Deeds public search (GovOS/Neumo).
    recorder: env.DC_RECORDER_URL || 'https://washington.dc.publicsearch.us',
    otr: 'https://otr.dc.gov',
    // Department of Buildings (dbh.dc.gov is Behavioral Health).
    dob: 'https://dob.dc.gov',
    doee: 'https://doee.dc.gov',
  };
}
