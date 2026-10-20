# Vikāsa Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.x (current prototype) | Security patches for credential handling only |

> **Note**: Vikāsa is a research prototype. No authentication or authorization is implemented on API endpoints. Do not deploy to untrusted networks without adding authentication.

---

## Credential Handling

### Firmware (ESP32-C3)

| File | Purpose | Status |
|------|---------|--------|
| `hardware/firmware/config/secrets.example.h` | Template — **committed** | Safe |
| `hardware/firmware/config/secrets.h` | Actual credentials — **gitignored** | Never commit |
| `hardware/firmware/secrets.h` | Legacy location — **gitignored** | Never commit |

**Setup**:
```bash
cd hardware/firmware
cp config/secrets.example.h config/secrets.h
# Edit config/secrets.h with your values
```

**Contents of `secrets.h`**:
```cpp
#define WIFI_SSID "your_wifi_ssid"
#define WIFI_PASSWORD "your_wifi_password"
#define API_BASE_URL "http://192.168.1.100:5000/api"
#define DEVICE_PLANT_ID "PLANT-001"
#define DEVICE_SESSION_ID "SESSION-2026-001"
#define DEVICE_OPERATOR_ID "OPERATOR-001"
#define DEVELOPMENT_MODE 0
```

**Protection**:
- `secrets.h` is included in `.gitignore` (two locations: `hardware/firmware/secrets.h` and `hardware/firmware/config/secrets.h`)
- `config.h` loads `secrets.h` via `#if __has_include("secrets.h")` — no hard-coded defaults for secrets
- Wi-Fi passwords **never logged** (firmware explicitly avoids printing credentials)

### Backend (Flask API)

| File | Purpose | Status |
|------|---------|--------|
| `.env` | Runtime configuration — **gitignored** | Never commit |
| `.env.example` | Template (if created) — **committed** | Safe |

**Current `.env` variables** (from repo inspection):
```bash
STORAGE_BACKEND=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
SUPABASE_TIMEOUT_SECONDS=10
```

**Protection**:
- `.env` is in root `.gitignore`
- `SUPABASE_SERVICE_ROLE_KEY` is a **service role key** (bypasses RLS) — treat as high-value secret
- For production: use Supabase `anon` key for client access, service role only on trusted backend

### Frontend (React Dashboard)

| File | Purpose | Status |
|------|---------|--------|
| `.env.local` | Local overrides — **gitignored** | Never commit |
| `.env.example` | Template — **committed** | Safe |

**Setup**:
```bash
cd frontend
cp .env.example .env.local
# Edit .env.local
```

**Contents**:
```bash
VITE_API_BASE_URL=http://127.0.0.1:5000
# VITE_DEMO_MODE=true
```

---

## Secrets in Version Control

### What is Gitignored

From `.gitignore`:
```gitignore
# Environment files
.env
.env.local
.env.*.local

# Firmware secrets and build outputs
hardware/firmware/secrets.h
hardware/firmware/config/secrets.h
hardware/firmware/.pio/
hardware/firmware/build/

# Firebase credentials (never commit)
firebase-credentials.json
service-account*.json
*firebase*credentials*.json

# Credential-containing prototype sketch (root-level)
/Arduino_sketch.ino
```

### What to Do If Secrets Are Accidentally Committed

1. **Immediately rotate** the compromised credentials:
   - Wi-Fi password
   - Supabase service role key → Regenerate in Supabase Dashboard → Settings → API
   - Firebase service account → Revoke and recreate in Firebase Console
   - Any API keys or tokens

2. **Purge from Git history** (if pushed):
   ```bash
   # Using git-filter-repo (recommended)
   pip install git-filter-repo
   git filter-repo --path .env --invert-paths
   git filter-repo --path hardware/firmware/config/secrets.h --invert-paths
   # Force push (coordinate with team)
   git push --force-with-lease origin main
   ```

3. **Verify removal**:
   ```bash
   git log --all --full-history -- .env
   git log --all --full-history -- hardware/firmware/config/secrets.h
   ```

---

## Vulnerability Reporting

### Reporting Process

1. **Do not** open a public GitHub issue for security vulnerabilities
2. Email: **security@nexovate.team** (or create a private GitHub Security Advisory)
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### Response Timeline

| Severity | Target Response | Target Fix |
|----------|-----------------|------------|
| Critical (RCE, auth bypass, secret leak) | 48 hours | 7 days |
| High (data exposure, DoS) | 72 hours | 14 days |
| Medium (logic flaws, info disclosure) | 1 week | 30 days |
| Low (minor issues) | 2 weeks | Next release |

### Scope

In-scope:
- Credential handling in firmware/backend/frontend
- API input validation (Pydantic schema enforcement)
- Storage access controls (Supabase RLS, Firebase rules)
- Firmware OTA update mechanism (when implemented)

Out-of-scope (prototype limitations):
- Lack of authentication on API endpoints (known, documented)
- No TLS enforcement in development (use reverse proxy in production)
- No rate limiting on API endpoints
- Physical device tampering

---

## Security Best Practices for Contributors

### Before Committing

- [ ] Run `git status` — verify no `.env`, `secrets.h`, or credential files are staged
- [ ] Run `git diff --cached` — inspect staged changes for accidental secrets
- [ ] Use `git commit -v` to review full diff in editor

### Pre-Commit Hook (Recommended)

Add to `.git/hooks/pre-commit`:
```bash
#!/bin/sh
# Block commits containing potential secrets
if git diff --cached --name-only | grep -E '\.(env|h)$' | xargs grep -l 'PASSWORD\|SECRET\|KEY\|TOKEN' 2>/dev/null; then
    echo "ERROR: Potential secrets detected in staged files"
    exit 1
fi
```

### Local Development

- Use `DEVELOPMENT_MODE=1` for firmware testing — generates `test_only: true` payloads
- Use `STORAGE_BACKEND=memory` for backend — no persistent data, no cloud credentials needed
- Frontend defaults to demo data provider — no API connection required

---

## Production Deployment Checklist

When moving beyond prototype:

- [ ] **Enable authentication** on all API endpoints (API keys, JWT, or mTLS)
- [ ] **Enforce HTTPS** — terminate TLS at reverse proxy (nginx, Traefik, Cloudflare Tunnel)
- [ ] **Restrict Supabase** — use `anon` key for clients; service role only on backend
- [ ] **Configure Supabase RLS** — policies per device/plant
- [ ] **Rotate all credentials** from development values
- [ ] **Add rate limiting** on `/api/readings` POST
- [ ] **Enable structured logging** with correlation IDs (no secrets in logs)
- [ ] **Implement OTA with signed firmware** — verify signatures on device
- [ ] **Network segmentation** — IoT VLAN, no direct internet access for devices
- [ ] **Regular dependency updates** — `pip-audit`, `npm audit`, PlatformIO library updates

---

## Known Prototype Limitations (Not Vulnerabilities)

| Limitation | Mitigation |
|------------|------------|
| No API authentication | Run only on trusted LAN; add auth before production |
| No TLS in development | Use SSH tunnel or Cloudflare Tunnel for remote access |
| Service role key in backend | Rotate before any shared deployment; use `anon` key for clients |
| No rate limiting | Add at reverse proxy or Flask middleware |
| Firmware OTA not implemented | Physical access required for updates |
| Device identity not cryptographically verified | Reading IDs are deterministic, not signed |

---

## Contact

- **Security email**: security@nexovate.team
- **GitHub Security Advisories**: https://github.com/uknowme-123/Vikasa/security/advisories
- **Maintainers**: Team Nexovate, Bangalore Institute of Technology

---

*Last updated: 2026-10-20. Review before each release.*