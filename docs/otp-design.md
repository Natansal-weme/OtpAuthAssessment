# OTP Auth Design

Decisions agreed on 2026-10-21. Security is the top priority; deliberate compromises are listed at the
end rather than left implicit.

## Phone numbers

- Input: Israeli local format. Spaces and dashes are stripped, then `0` + 8–9 digits (landlines,
  mobiles and VoIP; some landlines receive SMS as voice).
- Stored canonical as E.164 (`+972…`, the leading `0` dropped). Local format only at the UI edge.

## OTP challenges (`otpChallenges` table)

- At most one challenge per phone; requesting a new code replaces the code (only the latest works).
- 6 digits from `crypto.randomInt`. Stored as `HMAC-SHA256(OTP_SECRET, phone:code)`, compared in
  constant time. A plain hash of a 6-digit code is brute-forceable from a DB leak; the HMAC secret is not
  in the DB.
- Expires after 5 minutes. Max 3 wrong attempts, then the challenge is dead (a new code is required).
- Send limits per phone: 30 s cooldown between sends, max 5 sends per rolling hour window
  (`sendCount` + `windowStartedAt` on the challenge row). Responses: `429` + `Retry-After`.
- Per-IP limit: in-house `IpRateLimitGuard`, 10 requests/minute on the three auth mutations (in
  memory). `@nestjs/throttler` was dropped: it breaks the repo's npm hoisting.
- `request-otp` never reveals whether the phone is registered.

## Concurrency

The JSON DB has no atomic updates, so every read-modify-write for a phone (challenge, registration)
runs under an in-process per-key lock (`KeyedMutex`). Correct for a single instance only.

## New users: registration ticket

`verify-otp` for an unknown phone issues a registration ticket: random 32-byte token in an httpOnly
cookie scoped to `/api/auth`, stored as SHA-256 with the phone, single-use, 15 minutes.
`complete-registration` consumes it, creates the user and a session. Users exist only with a complete
profile.

## Sessions

Opaque random 32-byte token in an httpOnly cookie, stored as SHA-256 in `sessions`. Absolute expiry of
7 days (no sliding). Logout deletes the row. A successful login revokes the session cookie it replaces.

## Cookies & CSRF

`HttpOnly`, `SameSite=Lax`, `Secure` when `NODE_ENV=production`. CORS restricted to `CLIENT_ORIGIN`.
Mutating requests must be `application/json` (`415` otherwise), so cross-site forms cannot reach the API.

## Users

`phone` (canonical, unique), `name` (trimmed, 1–100), `email` (validated, lowercased, not unique: phone
is the identity).

## API (prefix `/api/auth`)

| Endpoint | Body | Success | Failures |
|---|---|---|---|
| `POST request-otp` | `{phone}` | `202 {resendAvailableAt}` | `400`, `429` + `Retry-After` |
| `POST verify-otp` | `{phone, code}` | `200 {status:'authenticated', user}` + session cookie, or `200 {status:'registration_required'}` + ticket cookie | `400`, `401 {reason:'invalid_code', attemptsRemaining}`, `401 {reason:'expired_or_locked'}` |
| `POST complete-registration` | `{name, email}` | `201 {user}` + session cookie | `400`, `401 {reason:'registration_expired'}`, `409 {reason:'already_registered'}` |
| `GET me` | — | `200 {user}` | `401` |
| `POST logout` | — | `204` | — |

## Cleanup

Expired rows are deleted lazily when read. No scheduled sweep.

## Frontend

- Routes: `/`, `/verify`, `/register` (guests only), `/home` (requires a session). Guards are React
  Router loaders using a cached `/auth/me`.
- Pending phone + flow stage kept in `sessionStorage`; the server stays authoritative.
- Vite proxies `/api` to the backend, so cookies are same-origin in dev.

## Deliberate compromises (production considerations)

- In-memory lock and throttler: single instance only. Multi-instance needs Redis or a DB with atomic
  updates/transactions.
- Per-IP limit trusts the socket address (no `X-Forwarded-For`); behind a real proxy configure
  `trust proxy`.
- No CSRF token (SameSite + JSON-only + strict CORS). Add double-submit if form posts or legacy browsers
  must be supported.
- Phone validation is a regex, not `libphonenumber-js`; Israel only.
- Expired rows are only deleted when touched; a sweep job would bound storage.
- Validation schemas live in the backend only; a shared contracts package pays off with more endpoints.
- No frontend tests.
