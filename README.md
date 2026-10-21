# OTP Auth

Sign in / sign up with an Israeli phone number and a one-time SMS code (NestJS + React).
Design decisions and trade-offs: [docs/otp-design.md](docs/otp-design.md).

## Getting Started

Requirements: Node.js 24+ (`nvm use` picks it up from `.nvmrc`).

```bash
npm install
cp apps/backend/.env.example apps/backend/.env
# set OTP_SECRET in apps/backend/.env (at least 32 characters), e.g. the output of:
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
npm run dev        # backend on :3000, frontend on http://localhost:5173
```

The backend refuses to start without `OTP_SECRET`.

The SMS service is a mock: **Any OTP codes generated will be printed in the backend terminal** (`[SMS SERVICE] Sending OTP ...`).

The monorepo is orchestrated with [Turborepo](https://turborepo.com) (`turbo.json`). Root scripts run the matching script in every app, in dependency order and with caching:

| Script              | What it does                                    |
| ------------------- | ----------------------------------------------- |
| `npm run dev`       | Runs backend (watch mode) and frontend together |
| `npm run typecheck` | Type-checks both apps                           |
| `npm test`          | Runs backend unit + HTTP e2e tests (Jest)       |
| `npm run build`     | Production build of both apps                   |

Run a single app with `npm run dev:backend` or `npm run dev:frontend`, or execute any task with a filter, e.g., `npx turbo run test --filter=backend`.

## Project Structure

```text
apps/
├── backend/                         NestJS
│   └── src/
│       ├── main.ts, app.setup.ts    bootstrap: /api prefix, CORS, cookies, JSON-only
│       ├── auth/                    endpoints, flow orchestration, request schemas, e2e tests
│       ├── otp/                     code issuing/verification, expiry, attempt and send limits
│       ├── sessions/                sessions, registration tickets, cookies, SessionGuard
│       ├── users/                   user records
│       ├── common/                  config, clock, per-key lock, phone parsing, zod pipe, IP limiter
│       ├── database/                JSON file DB (provided) + table schemas
│       └── sms/sms.service.ts       mock SMS sender (provided)
└── frontend/                        React + React Router + MUI
    └── src/
        ├── api.ts                   typed API client
        ├── auth.ts                  cached /me + pending sign-in state (sessionStorage)
        ├── loaders.ts               route guards
        ├── pages/                   Login, Verify, Register, Home
        └── router.tsx
```

## API

All under `/api/auth`. Mutations must be sent as `application/json`.

| Endpoint | Body | Success | Errors |
| --- | --- | --- | --- |
| `POST request-otp` | `{phone}` | `202 {resendAvailableAt}` | `400`, `429` + `Retry-After` |
| `POST verify-otp` | `{phone, code}` | `200 {status:'authenticated', user}` + session cookie, or `200 {status:'registration_required'}` + ticket cookie | `400`, `401` (`invalid_code` + `attemptsRemaining`, or `expired_or_locked`), `429` |
| `POST complete-registration` | `{name, email}` | `201 {user}` + session cookie | `400`, `401 registration_expired`, `409 already_registered`, `429` |
| `GET me` | | `200 {user}` | `401` |
| `POST logout` | | `204` | |

Phones are local Israeli numbers (`050-123-4567`, landlines included), stored as E.164 (`+972…`).

## Security Model

- 6-digit codes from `crypto.randomInt`, stored as HMAC-SHA256 with a secret kept outside the DB, compared in constant time.
- Codes expire after 5 minutes; 3 wrong attempts kill the code. Per phone: 30 s resend cooldown and at most 5 codes per hour. Per IP: 10 auth mutations per minute.
- `request-otp` answers identically for registered and unknown phones (no account enumeration).
- New users get a single-use, 15-minute registration ticket (httpOnly cookie). Users only exist once their profile is complete.
- Sessions: opaque 32-byte tokens stored as SHA-256, in httpOnly + `SameSite=Lax` cookies (`Secure` in production), 7-day absolute expiry, revoked on logout.
- CSRF: SameSite cookies, CORS restricted to `CLIENT_ORIGIN`, JSON-only mutations (`415` otherwise).
- All operations on a phone are serialized with an in-process lock, so parallel requests can't bypass the limits.

### Production Considerations (deliberate compromises)

- The lock and the IP limiter live in memory: correct for a single instance only. Scaling out needs Redis or a DB with atomic updates.
- The IP limiter uses the socket address; behind a reverse proxy, configure Express `trust proxy`.
- No CSRF token; add double-submit if form posts or legacy browsers must be supported.
- Phone validation is a regex (Israel only), not `libphonenumber-js`.
- Expired rows are deleted lazily when read; there is no sweep job.
- The SMS provider is a mock; a real one needs delivery-failure handling and SMS-pumping monitoring.
- `@nestjs/throttler` is not used: adding it breaks the existing npm hoisting (pre-existing peer conflicts keep Nest nested under `apps/backend`), so the IP limiter is a small in-house guard.
- No frontend tests. The backend has unit tests (fake clock, fake SMS) and HTTP e2e tests (supertest).

## The Database

`DatabaseService` is a JSON file database built on [`@loewen-digital/flatdb`](https://github.com/loewen-digital/flatdb). Every row is stored as a JSON file in `apps/backend/data/<table>/<id>.json` (override with `DATABASE_DIR`), so data survives restarts; delete the folder to start fresh. Tests keep their data in memory.

Tables (`users`, `otpChallenges`, `registrationTickets`, `sessions`) are defined as [zod](https://zod.dev) object schemas in `apps/backend/src/database/database.schema.ts`. Every write is validated against the schema.
