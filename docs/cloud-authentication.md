# Skylos Cloud Authentication Guide

Complete guide to authenticating with Skylos Cloud, including the new browser-based authentication and legacy manual token methods.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [New Method: Browser Authentication](#new-method-browser-authentication)
3. [Old Method: Manual Tokens](#old-method-manual-tokens)
4. [CI/CD Setup](#cicd-setup)
5. [Migration Guide](#migration-guide)
6. [Multi-Project Management](#multi-project-management)
7. [Headless Environments](#headless-environments)
8. [Token Storage & Priority](#token-storage--priority)
9. [Security Notes](#security-notes)
10. [Troubleshooting](#troubleshooting)
11. [FAQ](#faq)

---

## Quick Start

Get scan results in the cloud dashboard in under 60 seconds:

```bash
skylos . --upload
```

**First run:**
1. ✓ Browser opens automatically
2. ✓ Pick/create a project (one click)
3. ✓ Results upload to dashboard
4. ✓ Future uploads work automatically

**No API keys to copy, no config files, no manual setup.**

---

## New Method: Browser Authentication

### What Changed in v3.3.0?

Skylos now offers **seamless browser-based authentication** similar to tools like Snyk, GitHub CLI, and Vercel.

**Before (Manual Token):**
- Visit dashboard → Create project → Copy token → Set env var → Upload
- ~5 minutes, 6+ manual steps

**After (Browser Auth):**
- Run `skylos . --upload`
- ~30 seconds, 1 command

### How It Works

The new flow uses OAuth-style browser authentication:

1. CLI opens your browser to Skylos Cloud
2. You log in with GitHub (if not already logged in)
3. You select an existing project or create a new one
4. CLI automatically receives the token and saves it
5. You're ready to upload — no copy/pasting required

### Terminal Output Example

```bash
$ skylos . --upload

Scanning Python files...
✓ Found 15 issues

No Skylos token found. Let's connect to Skylos Cloud.

Opening browser to connect to Skylos Cloud...
If the browser doesn't open, visit:
  https://skylos.dev/cli/connect?port=54321&repo=myproject

Waiting for authentication (press Ctrl+C to cancel)...

✓ Connected to Skylos Cloud!
  Project:      my-project
  Organization: My Team
  Plan:         Pro

Uploading scan results...
✓ Upload complete! View at https://skylos.dev/dashboard
```

### Explicit Login Command

For more control, use the dedicated login command:

```bash
skylos login
```

**Use cases:**
- Switch to a different project
- Set up before running scans
- Prefer explicit authentication steps

---

## Old Method: Manual Tokens

The previous authentication method is still fully supported for backward compatibility.

### Steps

1. Visit https://skylos.dev/dashboard
2. Create a project manually
3. Go to Settings → API Keys
4. Copy the API token
5. Set environment variable:
   ```bash
   export SKYLOS_TOKEN=sky_live_xxx...
   ```
6. Run scan with upload:
   ```bash
   skylos . --upload
   ```

### When to Use Manual Tokens

- **CI/CD pipelines** where you want explicit token management
- **Automation scripts** that need predictable behavior
- **Shared environments** where browser auth isn't practical
- **Air-gapped systems** without internet access to Skylos Cloud

---

## CI/CD Setup

### GitHub Actions (Tokenless OIDC) ✨

**No secrets required!** GitHub Actions can authenticate using OpenID Connect:

```yaml
name: Skylos Scan
on: [pull_request]

permissions:
  contents: read
  id-token: write  # Enables tokenless auth

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install skylos
      - run: skylos . --danger --upload  # No token needed!
```

**How it works:**
1. GitHub Actions generates a short-lived OIDC token
2. Token contains claims: `repository`, `actor`, `ref`, `sha`
3. Skylos verifies the token against GitHub's JWKS
4. Skylos matches repository to project in database
5. Upload proceeds without any secrets

**Benefits:**
- ✅ Zero secrets to manage
- ✅ Short-lived tokens (expire in minutes)
- ✅ Cryptographically signed by GitHub
- ✅ Bound to your repository (can't be stolen/reused)

### Other CI Systems (Manual Token)

For GitLab CI, CircleCI, Jenkins, etc., use explicit tokens:

1. Get your token: https://skylos.dev/dashboard/settings
2. Add as secret: `SKYLOS_TOKEN`
3. Use in workflow:

**GitLab CI:**
```yaml
skylos:
  script:
    - pip install skylos
    - skylos . --danger --upload
  variables:
    SKYLOS_TOKEN: $SKYLOS_TOKEN
```

**CircleCI:**
```yaml
- run:
    name: Skylos Scan
    command: skylos . --danger --upload
    environment:
      SKYLOS_TOKEN: $SKYLOS_TOKEN
```

---

## Migration Guide

### For Local Development

#### Quick Migration (Recommended)

Remove your old token and let browser auth take over:

```bash
# Remove environment variable
unset SKYLOS_TOKEN

# Remove from shell profile
# Edit ~/.bashrc, ~/.zshrc, or ~/.bash_profile and delete the SKYLOS_TOKEN line

# Run upload - browser auth kicks in automatically
skylos . --upload
```

#### Keep Both Methods

You can keep `SKYLOS_TOKEN` and use browser auth selectively:

```bash
# In ~/.bashrc (keep this for scripts/CI)
export SKYLOS_TOKEN=sky_live_abc123...

# When you want browser auth, temporarily override:
(unset SKYLOS_TOKEN && skylos login)
```

Environment variables always take priority, so existing scripts keep working.

### For GitHub Actions

**Before (Manual Token):**
```yaml
- name: Scan and Upload
  env:
    SKYLOS_TOKEN: ${{ secrets.SKYLOS_TOKEN }}
  run: skylos . --danger --upload
```

**After (Tokenless OIDC):**
```yaml
# Add to top of workflow file
permissions:
  contents: read
  id-token: write

# Update step (remove SKYLOS_TOKEN)
- name: Scan and Upload
  run: skylos . --danger --upload
```

**Migration steps:**
1. Add `id-token: write` permission to workflow
2. Remove `SKYLOS_TOKEN` from workflow
3. Done! (Keep the secret around for rollback if needed)

### For Other CI

**No migration needed.** Continue using `SKYLOS_TOKEN` as before. Browser auth only affects local CLI usage.

---

## Multi-Project Management

### Before (Manual Tokens)

Managing multiple projects required changing environment variables:

```bash
# Project A
export SKYLOS_TOKEN=sky_live_projectA...
cd ~/projectA && skylos . --upload

# Project B
export SKYLOS_TOKEN=sky_live_projectB...
cd ~/projectB && skylos . --upload
```

### After (Browser Auth)

Automatic token management per repository:

```bash
# Project A - authenticate once
cd ~/projectA
skylos login  # Pick "Project A" in browser
skylos . --upload

# Project B - authenticate once
cd ~/projectB
skylos login  # Pick "Project B" in browser
skylos . --upload

# Future uploads work automatically!
cd ~/projectA && skylos . --upload  # Uses Project A token
cd ~/projectB && skylos . --upload  # Uses Project B token
```

The CLI remembers which project each repository is linked to via `.skylos/link.json`.

### Switching Projects

Want to upload to a different project?

```bash
skylos login  # Browser opens → pick different project
```

Or use an explicit token:

```bash
SKYLOS_TOKEN=sky_live_xxx skylos . --upload
```

---

## Headless Environments

### SSH / Remote Servers

When running over SSH without display access, the CLI automatically falls back to manual token entry:

```bash
$ skylos login

Browser auth unavailable: No display available

Manual connection
Get your API key at: https://skylos.dev/dashboard/settings

Paste your API token: [paste here]

✓ Connected to Skylos Cloud!
  Project:      My Project
  Organization: My Team
```

**Steps:**
1. Open https://skylos.dev/dashboard/settings in your local browser
2. Copy the API token for your project
3. Paste it into the terminal prompt
4. CLI verifies the token and saves it

### Docker / CI Environments

The CLI detects CI environments and provides appropriate instructions. For GitHub Actions specifically, it suggests using OIDC (tokenless) if `id-token: write` permission isn't set.

---

## Token Storage & Priority

### Where Credentials Are Stored

#### Global Credentials
**Location:** `~/.skylos/credentials.json`

Contains API tokens for all your projects:

```json
{
  "tokens": {
    "proj_abc123": {
      "token": "sky_live_xxx...",
      "project_name": "My Project",
      "org_name": "My Team"
    },
    "proj_def456": {
      "token": "sky_live_yyy...",
      "project_name": "Another Project",
      "org_name": "Another Team"
    }
  }
}
```

#### Per-Repository Link
**Location:** `.skylos/link.json` (in your git repository root)

Links the current repository to a specific project:

```json
{
  "project_id": "proj_abc123",
  "project_name": "My Project",
  "org_name": "My Team",
  "linked_at": "2025-02-15T10:30:00Z"
}
```

**Note:** Add `.skylos/` to `.gitignore` if you don't want to commit project links.

### Token Priority (Resolution Order)

The CLI checks for tokens in this order:

1. **`SKYLOS_TOKEN` environment variable** (highest priority)
2. **GitHub Actions OIDC** (tokenless, only in GitHub Actions with `id-token: write`)
3. **Linked project token** (from `.skylos/link.json` + `~/.skylos/credentials.json`)
4. **Legacy global token** (deprecated: `~/.skylos/credentials.json` top-level `token` field)
5. **System keyring** (macOS Keychain, Windows Credential Manager, Linux Secret Service)

This means you can override the linked project by setting `SKYLOS_TOKEN` for one-off scans:

```bash
SKYLOS_TOKEN=sky_live_xxx skylos . --upload
```

---

## Security Notes

### Token Security

**Browser Auth vs Manual Tokens:**

| Aspect | Manual Tokens | Browser Auth |
|--------|---------------|--------------|
| **Storage** | Environment variable (visible in `env`, process list) | File with 600 permissions (owner-only) |
| **Visibility** | Visible in shell history if set inline | Never visible in shell history |
| **Rotation** | Manual (must update everywhere) | Automatic (re-run `skylos login`) |
| **Multi-project** | One token = one project | Manages all projects automatically |

**Recommendation:** Browser auth is more secure for local development because tokens aren't exposed in environment variables.

### Token Scopes

Skylos API tokens are **project-scoped**:
- Each token grants access to one project only
- Tokens cannot access other projects in your organization
- Tokens can be revoked individually from the dashboard

### OIDC Security (GitHub Actions)

**Manual tokens:**
- ❌ Long-lived (valid until revoked)
- ❌ Must be stored as secrets
- ❌ Can be stolen and reused

**OIDC tokens:**
- ✅ Short-lived (expire in minutes)
- ✅ No secrets to store
- ✅ Cryptographically bound to your repo
- ✅ Can't be reused outside GitHub Actions

**Recommendation:** Use OIDC for GitHub Actions for better security.

### File Permissions

- Tokens are stored with `600` permissions (owner read/write only)
- On macOS/Windows, tokens can optionally use system keyring
- Never commit `~/.skylos/credentials.json` or `.skylos/link.json` to version control

---

## Troubleshooting

### Browser doesn't open

**Symptom:** CLI prints URL but browser doesn't launch

**Solution:** Manually open the printed URL in your browser:
```
Opening browser to connect to Skylos Cloud...
If the browser doesn't open, visit:
  https://skylos.dev/cli/connect?port=54321&repo=myproject
```

### "Already connected" message

**Symptom:** Running `skylos login` shows you're already connected

**Solution:** You're good! Just run `skylos . --upload`. To reconnect:
1. When prompted "Reconnect with a different project? [y/N]", type `y`
2. Or delete `.skylos/link.json` first

### "Invalid token" error

**Symptom:** Upload fails with 401 Unauthorized

**Possible causes:**
1. Token expired or was revoked
2. Project was deleted
3. Organization changed

**Solution:**
```bash
rm ~/.skylos/credentials.json .skylos/link.json
skylos login  # Re-authenticate
```

### CI upload fails with "No token found"

**For GitHub Actions:**
- Ensure workflow has `id-token: write` permission
- Check that you're using Skylos CLI v3.3.0 or later
- Verify project has correct repo URL in dashboard

**For other CI:**
- Verify `SKYLOS_TOKEN` secret is set correctly
- Check secret isn't masked/redacted in logs (first 4 chars should show as `sky_`)

### SSH/Headless: "Browser auth unavailable"

**This is expected behavior.** The CLI automatically falls back to manual token entry. Follow the printed instructions to paste your token.

### Disconnecting

Remove the connection:

```bash
rm .skylos/link.json              # Disconnect this project
rm ~/.skylos/credentials.json     # Remove all credentials
```

Or use the sync command:
```bash
skylos sync disconnect
```

---

## FAQ

### Can I use both methods simultaneously?

**Yes!** The new browser auth doesn't break existing token-based workflows. Environment variables (`SKYLOS_TOKEN`) always take priority.

### Do I need to re-authenticate often?

**No.** Tokens are saved permanently until you explicitly disconnect or they're revoked. You authenticate once per project.

### Can I script the login flow?

For automation, use the old method with `SKYLOS_TOKEN`. Browser auth is designed for interactive CLI usage.

### Does this work offline?

No, browser auth requires internet to connect to Skylos Cloud. For offline scans (without `--upload`), no authentication is needed.

### What about team sharing?

Each developer authenticates individually. The `.skylos/link.json` file can optionally be committed to share the project ID across the team, but tokens are always stored in `~/.skylos/credentials.json` (user-specific, never committed).

### How do I audit token usage?

Visit https://skylos.dev/dashboard/settings → API Keys to see:
- When each token was last used
- Which IP addresses accessed your project
- Option to revoke tokens

### Will my team's workflows break?

No. Browser auth is opt-in for local development. CI/CD keeps using `SKYLOS_TOKEN` or OIDC.

### What if I have 10+ projects?

Browser auth handles this perfectly. Each repo gets linked to its project automatically. Manual tokens required managing 10+ environment variables.

### Can I keep using the old method?

**Absolutely!** The manual token method is still fully supported. Set `SKYLOS_TOKEN` and it takes priority over browser auth.

---

## Comparison Table

| Aspect | Old Method | New Method |
|--------|-----------|------------|
| **Steps to authenticate** | 6 steps (manual) | 1 command (automatic) |
| **Token management** | Manual env var setup | Automatic credential storage |
| **Project switching** | Change env var | `skylos login` re-auth |
| **First-time setup** | ~5 minutes | ~30 seconds |
| **CI/CD** | Set `SKYLOS_TOKEN` secret | Tokenless (GitHub) or secret |
| **Multi-project support** | One token per project | Automatic token mapping |
| **Browser required?** | No | Yes (falls back to manual) |
| **Headless support** | Yes | Yes (automatic fallback) |
| **Security** | Env var (visible) | File (600 perms) |

---

## Getting Help

- **Documentation:** https://docs.skylos.dev
- **GitHub Issues:** https://github.com/skylos-dev/skylos/issues
- **Email Support:** support@skylos.dev

---

## Summary

**For local development:** Just run `skylos . --upload` — browser handles the rest! ✨

**For CI (GitHub Actions):** Use tokenless OIDC with `id-token: write` permission.

**For CI (other):** Continue using `SKYLOS_TOKEN` secrets.

**For SSH/headless:** Manual token fallback works automatically.

The new browser auth eliminates 90% of the friction in getting started with Skylos Cloud, while maintaining full backward compatibility with existing workflows.
