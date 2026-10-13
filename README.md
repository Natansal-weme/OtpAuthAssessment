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
│       │   ├── auth.types.ts      API contract, shared with the frontend
│       │   ├── auth.service.ts    
│       │   ├── auth.controller.ts HTTP endpoints 
│       │   └── auth.service.spec.ts 
│       ├── database/
│       │   ├── database.schema.ts table definitions (empty for now)
│       │   ├── database.service.ts in-memory DB (provided)
│       │   └── in-memory-table.ts typed table API (provided)
│       └── sms/sms.service.ts     mock SMS sender (provided)
└── frontend/                      React + React Router + TanStack Query + MUI
    └── src/
        ├── api/
        │   ├── http.ts            axios instance (base URL `/api`)
        │   └── hooks.ts           
        ├── pages/                 
        ├── components/            page layout (provided)
        └── router.tsx             routes / guards
```

## Architecture & Communication

The backend is a plain NestJS application relying on standard modules, controllers, and services. The `AuthController` exposes the REST API endpoints.

These endpoints rely on data transfer objects and types located in `apps/backend/src/auth/auth.types.ts`. The frontend imports these **type-only** (`import type ... from '@backend/auth/auth.types'`), meaning both sides strictly share a single contract. In development, Vite is configured to proxy `/api/*` to the backend, meaning the browser and API share an origin.

## The In-Memory Database

`DatabaseService` is a mock JSON store. It has no tables initialized out of the box. You can define them using TypeScript interfaces inside `apps/backend/src/database/database.schema.ts` (instructions are available in that file):

```ts
export interface DatabaseSchema {
  examples: ExampleRecord;
}

const examples = this.db.table('examples'); // fully typed
examples.insert({ ... });
examples.findOne({ ... });
```