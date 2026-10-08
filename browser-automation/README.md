# Capitol Vista Browser Automation

Automated Playwright scripts to pull live docket and property record data from D.C. court and agency portals.

## Setup

### 1. Install Playwright on Your Mac

Run this command on your Mac (not in this cloud session):

```bash
claude mcp add playwright -- npx @playwright/mcp@latest
```

This installs Playwright as an MCP server that Claude on your Mac can use.

### 2. Optional: `~/.claude-mem/.env` overrides

None of the scripts need a login. To point them at a different URL, create `~/.claude-mem/.env` on your Mac:

```
DC_COURT_PORTAL_URL=https://www.dccourts.gov/eAccess
DC_RECORDER_URL=https://washington.dc.publicsearch.us
```

The file lives outside the repo and is never committed.

### 3. Optional: Enable npm scripts

Add to `package.json` in the project root:

```json
{
  "scripts": {
    "test:recorder": "node browser-automation/test-run.mjs recorder",
    "test:agencies": "node browser-automation/test-run.mjs agencies",
    "test:dockets": "node browser-automation/test-run.mjs dlcp",
    "test:all": "node browser-automation/test-run.mjs all"
  }
}
```

Then run with:
```bash
npm run test:recorder
npm run test:agencies
npm run test:dockets  # Requires manual setup
npm run test:all
```

## Scripts

### `config.mjs`
Configuration and credential management.
- Loads credentials from `~/.claude-mem/.env`
- Manages session cookies for the court Portal (to skip a CAPTCHA after the first run)
- Exports case numbers and agency URLs

### `recorder-property-check.mjs`
Checks D.C. Recorder of Deeds for property records.
- Public access (no authentication)
- Searches for property at 810 New Jersey Ave NW
- Extracts ownership, liens, recent documents

### `agency-portal-checker.mjs`
Checks D.C. agency portals for violations and records.
- Checks OTR, DOB, DOEE (public or semi-public access)
- Looks for building violations, tax issues, environmental records
- Non-critical; gracefully handles sites that don't work

### `dlcp-docket-checker.mjs` ⚖️ **RUN ON YOUR MAC**
Checks the D.C. Superior Court **Odyssey Portal** (reached through https://www.dccourts.gov/eAccess) for Register of Actions entries. Despite the file name, it has nothing to do with DLCP, the licensing agency.
- No login needed for public case records. If a CAPTCHA appears, the first run pauses for you to solve it and saves the cookies.
- Searches Superior Court cases: 2023-LTB-006634, 2025-LTB-007644, 2024-CAB-004360
- DCCA appeal 26-CV-0411 is not on the Portal; check https://www.dccourts.gov/services/cases-online
- Selectors are unverified (`[verify selectors on live portal]`). Run it headed once and fix `SELECTORS` if it can't find the case-number field.
- Optional overrides in `~/.claude-mem/.env`: `DC_COURT_PORTAL_URL`, `DC_RECORDER_URL`

## CAPTCHA Handling

If the Portal shows a reCAPTCHA: Here's how it works:

1. **First run:** Browser opens, you see the CAPTCHA. Solve it manually, and Playwright saves the session cookies.
2. **Subsequent runs:** Saved cookies skip the CAPTCHA (until session expires, ~weeks).
3. **If cookies expire:** Browser pauses again; you solve CAPTCHA once more.

This is the most reliable approach without external CAPTCHA-solving services.

## Integration with 12:30 AM Nightly Sweep

These scripts will be called automatically by the `capitol-vista-nightly-1230am-sweep` Zapier skill:

1. **12:30 AM ET:** Zapier fires the nightly sweep Skill
2. **Nightly sweep runs all three scripts** (Recorder, Agencies, court dockets)
3. **Results update Notion** "Nightly Status" page
4. **Critical findings** (new lawsuit, lien, revocation) trigger Gmail draft alerts

## Testing

### Test Recorder of Deeds (public, no setup needed)
```bash
node browser-automation/test-run.mjs recorder
```

### Test Agency Portals (public, no setup needed)
```bash
node browser-automation/test-run.mjs agencies
```

### Test court dockets (run on your Mac; opens a browser)
```bash
# On your Mac, after installing Playwright and setting credentials:
node browser-automation/test-run.mjs dlcp
```

### Test All
```bash
node browser-automation/test-run.mjs all
```

## Troubleshooting

**"Missing credentials file"**
- Run `node browser-automation/test-run.mjs dlcp` once in a visible browser to confirm the Portal selectors

**"CAPTCHA timeout"**
- Browser window showed up but you didn't solve the CAPTCHA in time
- Run the script again; browser will open with CAPTCHA

**"Could not reach [agency URL]"**
- Agency portal may be down or blocking Playwright
- Script gracefully continues; check the agency portal manually

**"Failed to load Recorder of Deeds"**
- D.C. Recorder website layout may have changed
- The script uses generic selectors; may need adjustment based on actual site

## Future Enhancements

- [ ] Parallel execution (run all scripts at once)
- [ ] Diff-only reporting (only report changes, not full docket)
- [ ] Email alerts for critical findings
- [ ] Store docket history in Notion for trend analysis
- [ ] CAPTCHA-solving service fallback (2Captcha, etc.)
