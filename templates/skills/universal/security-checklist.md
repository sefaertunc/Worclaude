---
description: "OWASP-based security checklist any agent can reference when reviewing or writing code"
when_to_use: "When writing code that handles user input, authentication, authorization, file uploads, or external data"
version: "1.0.0"
paths:
  - "**/auth/**"
  - "**/security/**"
  - "**/*config*"
  - "**/*.env*"
  - "**/middleware/**"
---

# Security Checklist

## Purpose

This is a reference checklist, not an agent. Any agent — code-simplifier,
test-writer, verify-app, or the main session — can consult this when they
encounter security-relevant code. The dedicated security-reviewer agent
does deeper analysis; this checklist catches the obvious issues.

## Quick Scan (30 seconds)

Before committing any code that handles user input, authentication, or
external data, check these five things:

1. **No hardcoded secrets** — grep for API keys, passwords, tokens, connection strings
2. **Input is validated** — user input goes through validation before use
3. **Queries are parameterized** — no string concatenation in SQL/NoSQL queries
4. **Output is escaped** — user content is not rendered as raw HTML
5. **Auth is checked** — protected endpoints have authentication middleware

If any fail, stop and fix before committing.

## OWASP Top 10 Reference

### A01: Broken Access Control
- Every endpoint checks authentication AND authorization
- Users cannot access other users' resources by changing IDs in URLs
- File paths from user input are sanitized (no path traversal)
- CORS is configured to allow only expected origins
- Directory listing is disabled on static file servers

### A02: Cryptographic Failures
- Passwords hashed with bcrypt, scrypt, or argon2 — never MD5/SHA for passwords
- Sensitive data encrypted at rest (PII, payment info)
- HTTPS enforced in production — no mixed content
- API keys and secrets stored in environment variables, not source code
- Random values use crypto-secure generators, not Math.random()

### A03: Injection
- SQL: parameterized queries or ORM — never string concatenation
- NoSQL: no user input in $where, $regex operators
- OS commands: use dedicated libraries, not shell execution with user input
- LDAP: parameterized queries if applicable
- Template engines: auto-escaping enabled by default

### A04: Insecure Design
- Rate limiting on authentication endpoints
- Account lockout after repeated failures
- No sensitive data in URLs or query parameters
- Session tokens regenerated after login
- Passwords have minimum complexity requirements

### A05: Security Misconfiguration
- Debug mode disabled in production
- Default credentials changed
- Security headers set: X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security
- Error messages don't expose stack traces or internal details to users
- Unused features and endpoints removed

### A06: Vulnerable Components
- Dependencies up to date — no known CVEs
- Lock files committed (package-lock.json, yarn.lock, etc.)
- Dependency audit clean: `npm audit`, `pip audit`, `cargo audit`
- No abandoned packages with no maintenance

### A07: Authentication Failures
- Passwords not stored in plaintext
- JWT tokens validated on every request (signature, expiry, issuer)
- Session management uses secure cookies (HttpOnly, Secure, SameSite)
- Password reset tokens are single-use and time-limited
- Multi-factor authentication available for sensitive operations

### A08: Data Integrity Failures
- Deserialization of user input uses safe libraries
- CI/CD pipelines verify integrity of dependencies
- Software updates use signed packages

### A09: Logging Failures
- Security events are logged (login attempts, access denied, input validation failures)
- Logs do NOT contain passwords, tokens, or PII
- Log injection is prevented (user input in logs is sanitized)
- Alerts configured for suspicious patterns

### A10: Server-Side Request Forgery (SSRF)
- URLs from user input are validated against an allowlist
- Internal network addresses blocked (127.0.0.1, 10.x, 169.254.x, etc.)
- DNS rebinding protection if URL resolution is involved
- Response from fetched URLs is not returned raw to the user

## When to Consult This

- Writing code that handles user input
- Implementing authentication or authorization
- Adding new API endpoints
- Handling file uploads
- Integrating with external services
- Updating dependencies
- Before any release

## Common False Positives

Not everything is a security issue:
- Test credentials in test files (clearly marked as test-only)
- Public API keys that are designed to be public (e.g., Stripe publishable key)
- SHA-256/MD5 used for checksums or cache keys (not for password hashing)
- Environment variables in .env.example (templates, not real secrets)
- Self-signed certificates in development environments
