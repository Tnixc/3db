# Security Audit Report - 3db

**Date:** 2025-11-17
**Auditor:** Claude (Automated Security Analysis)
**Project:** 3db - GitHub Repository File Storage System
**Version:** 0.0.1

## Executive Summary

This security audit identified **multiple critical and high-severity vulnerabilities** in the 3db application that require immediate attention. The application stores GitHub Personal Access Tokens in localStorage, lacks essential security headers, and has insufficient input validation. While the codebase shows good practices in some areas (no innerHTML/eval usage, path encoding), significant security improvements are needed before production use.

**Risk Level:** 🔴 **HIGH**

---

## Critical Vulnerabilities

### 1. 🔴 Insecure Token Storage (CRITICAL)

**Location:** `src/lib/stores/auth.ts:24, 43`

**Issue:**
GitHub Personal Access Tokens are stored in browser localStorage in plaintext:
```typescript
localStorage.setItem(GITHUB_TOKEN_KEY, token);
```

**Risk:**
- **XSS Vulnerability:** Any XSS attack can exfiltrate the token
- **Browser Extensions:** Malicious extensions can read localStorage
- **Persistent Storage:** Token remains even after browser restart
- **No Encryption:** Stored in plaintext

**Impact:** Complete account compromise - attackers can access all repositories, create/delete files, and perform any action the token permits.

**Recommendation:**
1. **Immediate:** Switch to httpOnly cookies with SameSite=Strict
2. **Short-term:** Implement a server-side session layer
3. **Consider:** Moving to OAuth flow instead of PAT
4. **Add:** Token rotation and expiration handling

**Example Fix:**
```typescript
// Use SvelteKit's server-side cookies instead
// In hooks.server.ts
export const handle: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get('github_token'); // httpOnly cookie
  // ...
};
```

---

### 2. 🔴 Missing Security Headers (CRITICAL)

**Location:** `src/hooks.server.ts`

**Issue:**
No security headers are configured. Current implementation only filters response headers but doesn't add security headers.

**Missing Headers:**
- Content-Security-Policy (CSP)
- X-Frame-Options
- X-Content-Type-Options
- Referrer-Policy
- Permissions-Policy
- Strict-Transport-Security (HSTS)

**Risk:**
- XSS attacks are easier to execute
- Clickjacking vulnerabilities
- MIME-type sniffing attacks
- Cross-origin data leaks

**Recommendation:**
Implement comprehensive security headers in `hooks.server.ts`:

```typescript
export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range';
    }
  });

  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.github.com;"
  );

  return response;
};
```

---

### 3. 🔴 No File Upload Validation (CRITICAL)

**Location:** `src/lib/components/file-upload-dialog.svelte`

**Issue:**
File uploads accept ANY file type with no validation:
```typescript
<Input id="file-input" type="file" multiple disabled={loading} />
```

**Missing Validations:**
- No file type restrictions
- No file size limits (client-side)
- No MIME type validation
- No content scanning
- No filename sanitization

**Risk:**
- Malicious files (malware, scripts) can be uploaded
- Excessively large files could exhaust quota
- Filename injection attacks
- Content-type confusion attacks

**Recommendation:**
```typescript
// Add validation before upload
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_EXTENSIONS = ['.jpg', '.png', '.pdf', '.txt', '.md', '.json'];

function validateFile(file: File): { valid: boolean; error?: string } {
  // Size check
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File too large (max 100MB)' };
  }

  // Extension check
  const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `File type not allowed: ${ext}` };
  }

  // Filename sanitization
  if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
    return { valid: false, error: 'Invalid filename' };
  }

  return { valid: true };
}
```

---

## High Severity Issues

### 4. 🟠 No CSRF Protection (HIGH)

**Location:** All state-changing operations

**Issue:**
No CSRF tokens on destructive operations:
- File deletion (`deleteFile`, `deleteFolder`)
- Repository creation (`createRepository`)
- Repository deletion (`deleteRepository`)

**Risk:**
Attacker can trick authenticated users into performing unwanted actions through malicious websites.

**Recommendation:**
Implement SvelteKit's built-in CSRF protection:
```typescript
// In svelte.config.js
export default {
  kit: {
    csrf: {
      checkOrigin: true,
    }
  }
};
```

---

### 5. 🟠 Dependency Vulnerability (HIGH)

**Location:** `package.json` - cookie package

**Issue:**
NPM audit reports vulnerability in `cookie` package (GHSA-pxg6-pf52-xh8x):
- CVE: Cookie accepts name, path, domain with out-of-bounds characters
- Severity: Low (but should still be fixed)
- Affected: cookie < 0.7.0

**Recommendation:**
```bash
npm audit fix
```

---

### 6. 🟠 Path Traversal Risk (MEDIUM-HIGH)

**Location:** `src/lib/services/github.ts`, `src/lib/components/file-upload-dialog.svelte:45`

**Issue:**
While `encodeURIComponent` is used in some places (file-browser.svelte:64), file paths are constructed without consistent validation:

```typescript
const path = currentPath ? `${currentPath}/${file.name}` : file.name;
```

**Risk:**
If filenames contain `../` sequences, could potentially access unintended directories.

**Recommendation:**
Add path sanitization:
```typescript
function sanitizePath(path: string): string {
  // Remove any path traversal attempts
  return path.replace(/\.\./g, '').replace(/^\/+/, '');
}

function sanitizeFilename(filename: string): string {
  // Remove path separators and dangerous characters
  return filename.replace(/[\/\\]/g, '_').replace(/\.\./g, '');
}
```

---

### 7. 🟠 No Rate Limiting (HIGH)

**Location:** All API calls

**Issue:**
No client-side or server-side rate limiting implemented. GitHub API has rate limits, but the app doesn't handle or prevent abuse.

**Risk:**
- API quota exhaustion
- Denial of service
- Accidental or malicious bulk operations

**Recommendation:**
1. Implement client-side throttling for API calls
2. Add loading states to prevent double-submissions
3. Handle GitHub rate limit responses (429)
4. Consider implementing exponential backoff

```typescript
// Example rate limiter
class RateLimiter {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private minDelay = 100; // ms between requests

  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.process();
    });
  }

  private async process() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift()!;
      await task();
      await new Promise(r => setTimeout(r, this.minDelay));
    }

    this.processing = false;
  }
}
```

---

## Medium Severity Issues

### 8. 🟡 No Token Expiration Handling (MEDIUM)

**Location:** `src/lib/stores/auth.ts`

**Issue:**
Tokens are stored indefinitely with no expiration check or refresh mechanism.

**Recommendation:**
- Store token timestamp
- Check expiration before API calls
- Prompt user to re-authenticate when expired
- Clear invalid tokens automatically

---

### 9. 🟡 Unsafe Base64 Decoding (MEDIUM)

**Location:** `src/lib/services/service.ts:75, 146`

**Issue:**
Using `atob()` without validation:
```typescript
const configContent = atob(fileContent.content);
return JSON.parse(configContent);
```

**Risk:**
- Invalid base64 can crash the app
- Malformed JSON can cause errors
- No error handling

**Recommendation:**
```typescript
try {
  const configContent = atob(fileContent.content.replace(/\s/g, ''));
  const config = JSON.parse(configContent);
  // Validate config structure
  if (!config.connectedRepos || !Array.isArray(config.connectedRepos)) {
    throw new Error('Invalid config format');
  }
  return config;
} catch (error) {
  console.error('Failed to parse config:', error);
  return DEFAULT_SERVICE_CONFIG;
}
```

---

### 10. 🟡 Insufficient Error Handling (MEDIUM)

**Location:** Multiple locations with `console.error()`

**Issue:**
Error messages and stack traces exposed to console may leak sensitive information.

**Examples:**
- `github.ts:46` - Logs API error responses
- `file-browser.svelte:91` - Logs failed file loads
- `init.ts:55` - Logs initialization errors

**Recommendation:**
- Implement structured error logging
- Sanitize error messages for users
- Use environment-based logging (dev vs. prod)
- Consider error reporting service (Sentry, etc.)

---

### 11. 🟡 No Input Validation on Repository Names (MEDIUM)

**Location:** `src/lib/components/create-repo-dialog.svelte:30`

**Issue:**
Repository names are only trimmed, not validated:
```typescript
const newRepo = await createRepository(config, repoName.trim());
```

**Recommendation:**
Add validation:
```typescript
function validateRepoName(name: string): { valid: boolean; error?: string } {
  if (name.length === 0) return { valid: false, error: 'Name required' };
  if (name.length > 100) return { valid: false, error: 'Name too long' };
  if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
    return { valid: false, error: 'Invalid characters in name' };
  }
  if (name.startsWith('.') || name.startsWith('-')) {
    return { valid: false, error: 'Name cannot start with . or -' };
  }
  return { valid: true };
}
```

---

## Low Severity Issues

### 12. ⚪ Missing Audit Logging (LOW)

**Issue:** No logging of security-relevant events (login, file deletion, etc.)

**Recommendation:** Implement audit trail for compliance and incident response

---

### 13. ⚪ No Subresource Integrity (LOW)

**Issue:** External resources loaded without SRI checks

**Recommendation:** Add SRI hashes to external scripts/styles

---

### 14. ⚪ Browser Compatibility (LOW)

**Issue:** Uses `atob()`, `btoa()` which may not work in all environments

**Recommendation:** Add polyfills or use libraries like `base64-js`

---

## Positive Security Findings ✅

The audit also identified several good security practices:

1. ✅ **No dangerous HTML rendering** - No `{@html}` or `innerHTML` usage found
2. ✅ **No eval usage** - No `eval()` or `Function()` constructors
3. ✅ **Environment variables properly ignored** - `.env` files in `.gitignore`
4. ✅ **URL encoding** - Uses `encodeURIComponent` for API paths (file-browser.svelte:64)
5. ✅ **Type safety** - TypeScript used throughout
6. ✅ **No SQL injection risk** - No database, only GitHub API calls
7. ✅ **Password input type** - Token input uses `type="password"` (token-login.svelte:42)

---

## Compliance & Best Practices

### OWASP Top 10 (2021) Assessment

| Vulnerability | Status | Notes |
|--------------|--------|-------|
| A01: Broken Access Control | 🟠 | Token in localStorage, no CSRF |
| A02: Cryptographic Failures | 🔴 | Plaintext token storage |
| A03: Injection | 🟢 | No SQL/command injection risk |
| A04: Insecure Design | 🟡 | Missing security architecture |
| A05: Security Misconfiguration | 🔴 | Missing security headers |
| A06: Vulnerable Components | 🟡 | Cookie vulnerability (low) |
| A07: Auth/AuthZ Failures | 🔴 | Insecure token storage |
| A08: Software/Data Integrity | 🟡 | No SRI checks |
| A09: Logging/Monitoring | 🟡 | Limited logging |
| A10: Server-Side Request Forgery | 🟢 | Not applicable |

---

## Recommended Remediation Priority

### Phase 1: Immediate (This Week)
1. ✅ Implement security headers
2. ✅ Add file upload validation
3. ✅ Fix cookie vulnerability (`npm audit fix`)
4. ✅ Add CSRF protection

### Phase 2: Short-term (Next 2 Weeks)
1. ⚠️ **CRITICAL:** Migrate token storage from localStorage to httpOnly cookies
2. ⚠️ Implement rate limiting
3. ⚠️ Add input validation for all user inputs
4. ⚠️ Improve error handling and sanitization

### Phase 3: Medium-term (Next Month)
1. 📋 Add audit logging
2. 📋 Implement token expiration/refresh
3. 📋 Add comprehensive monitoring
4. 📋 Security testing (penetration test)

### Phase 4: Long-term (Next Quarter)
1. 🔄 Consider OAuth flow instead of PAT
2. 🔄 Add security scanning to CI/CD
3. 🔄 Implement bug bounty program
4. 🔄 Regular security audits

---

## Testing Recommendations

1. **Manual Testing:**
   - Test XSS payloads in filename inputs
   - Test path traversal attempts (`../`, etc.)
   - Test CSRF attacks
   - Test with expired/invalid tokens

2. **Automated Testing:**
   - Set up dependency scanning (Dependabot, Snyk)
   - Add SAST tools (ESLint security plugins)
   - Implement pre-commit hooks for secret scanning

3. **Security Tools:**
   ```bash
   # Install security tools
   npm install --save-dev eslint-plugin-security
   npm install --save-dev @typescript-eslint/eslint-plugin

   # Run security scans
   npm audit
   npx eslint . --ext .ts,.js,.svelte
   ```

---

## Conclusion

The 3db application has **critical security vulnerabilities** that must be addressed before any production use. The primary concerns are:

1. **Insecure token storage** in localStorage (critical)
2. **Missing security headers** (critical)
3. **No file upload validation** (critical)
4. **No CSRF protection** (high)

While the codebase follows some good practices (TypeScript, no innerHTML, etc.), the fundamental security architecture needs significant improvement. The current state is suitable for experimental/personal use only, as stated in the README.

**Recommendation:** Do not use for production or sensitive data until critical issues are resolved.

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [SvelteKit Security](https://kit.svelte.dev/docs/security)
- [GitHub Token Security](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/about-authentication-to-github)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

---

**Report Generated:** 2025-11-17
**Next Audit Recommended:** After critical fixes are implemented
