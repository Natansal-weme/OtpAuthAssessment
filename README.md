# Full-Stack Assessment Boilerplate

This repository provides the foundational scaffolding for the full-stack assessment, including routing, API wiring, mock services, and UI components.

## Getting Started

Requirements: Node.js 24+ (`nvm use` picks it up from `.nvmrc`).

```bash
npm install
npm run dev        # backend on :3000, frontend on http://localhost:5173
```

The SMS service is a mock: **Any OTP codes generated will be printed in the backend terminal** (`[SMS SERVICE] Sending OTP ...`).

The monorepo is orchestrated with [Turborepo](https://turborepo.com) (`turbo.json`). Root scripts run the matching script in every app, in dependency order and with caching:

| Script              | What it does                                    |
| ------------------- | ----------------------------------------------- |
| `npm run dev`       | Runs backend (watch mode) and frontend together |
| `npm run typecheck` | Type-checks both apps                           |
| `npm test`          | Runs backend unit tests (Jest)                  |
| `npm run build`     | Production build of both apps                   |

Run a single app with `npm run dev:backend` or `npm run dev:frontend`, or execute any task with a filter, e.g., `npx turbo run test --filter=backend`.

## Project Structure

```text
apps/
├── backend/                       NestJS
│   └── src/
│       ├── main.ts                bootstrap (global `/api` prefix, CORS)
│       ├── app.module.ts
│       ├── auth/
│       │   ├── auth.service.ts    
│       │   ├── auth.controller.ts HTTP endpoints 
│       │   └── auth.service.spec.ts 
│       ├── database/
│       │   ├── database.schema.ts table definitions as zod schemas (empty for now)
│       │   ├── database.service.ts JSON file DB (provided)
│       │   └── table.ts           typed table API (provided)
│       └── sms/sms.service.ts     mock SMS sender (provided)
└── frontend/                      React + React Router + MUI
    └── src/
        ├── pages/                 
        ├── components/            page layout (provided)
        └── router.tsx             routes / guards
```

## Architecture & Communication

The backend is a plain NestJS application relying on standard modules, controllers, and services. The `AuthController` exposes the REST API endpoints.

The frontend contains stub pages and components only; connecting it to the backend is part of the task.

## The Database

`DatabaseService` is a JSON file database built on [`@loewen-digital/flatdb`](https://github.com/loewen-digital/flatdb). Every row is stored as a JSON file in `apps/backend/data/<table>/<id>.json` (override with `DATABASE_DIR`), so data survives restarts; delete the folder to start fresh. Unit tests that provide `DatabaseService` directly keep their data in memory.

It has no tables initialized out of the box. You can define them as [zod](https://zod.dev) object schemas inside `apps/backend/src/database/database.schema.ts` (instructions are available in that file). Every write is validated against the schema:

```ts
export const databaseSchema = {
  examples: z.object({ title: z.string(), dueAt: z.coerce.date() }),
} satisfies Record<string, TableSchema>;

const examples = this.db.table('examples'); // fully typed, every call is async
await examples.insert({ ... });
await examples.findOne({ ... });
```