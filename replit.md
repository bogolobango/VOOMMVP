# Workspace

## Overview

pnpm workspace monorepo using TypeScript. This is the **Voom** car rental marketplace for West Africa — a peer-to-peer platform similar to Airbnb but for cars, targeting Cameroon and Ghana markets.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Auth**: Session-based with bcryptjs + connect-pg-simple

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server (all backend routes)
│   └── voom/               # React + Vite frontend (Voom car rental app)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml     # pnpm workspace
├── tsconfig.base.json      # Shared TS options
├── tsconfig.json           # Root TS project references
└── package.json            # Root package
```

## Voom App Features

- **Home page**: Browse cars with category filters (SUV, Sedan, Luxury, Van, Truck), search, and car grid
- **Car detail page**: Car photos, specs, host info, availability calendar, booking form
- **Auth**: Register/login with username + phone + password (session-based cookies)
- **Bookings**: View upcoming and past bookings with status management
- **Favorites**: Save cars for later
- **Messages**: Chat between renters and hosts
- **Account/Profile**: User info, verification status
- **Become a Host flow**: Multi-step car listing (type → details → location → rates → summary)
- **Host Dashboard**: Earnings, pending bookings, listing management

## Database Tables

- `users` — user accounts with host/renter roles
- `cars` — car listings with specs, pricing, availability
- `bookings` — bookings with status workflow (pending → approved → active → completed)
- `favorites` — user favorite cars
- `messages` — peer-to-peer messaging
- `reviews` — post-booking reviews and ratings
- `payments` — payment records (Stripe + MTN MoMo stubs)
- `session` — express-session store

## Currency

The app uses FCFA (West African CFA franc) as default currency, with GHS (Ghana Cedis) support.
Platform fee: 15% of total booking amount.

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references
- `pnpm --filter @workspace/api-spec run codegen` — regenerates React Query hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes

## API Server

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for validation and `@workspace/db` for persistence.

- Auth: `src/lib/auth.ts` — bcryptjs + express-session + connect-pg-simple
- Storage: `src/lib/storage.ts` — all DB operations via Drizzle
- Routes: `/api/auth`, `/api/users`, `/api/cars`, `/api/bookings`, `/api/favorites`, `/api/messages`, `/api/reviews`, `/api/payments`
