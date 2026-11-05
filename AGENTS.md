# AGENTS.md

Store CRM (products, sales, client debts, stats). Two independent npm packages — there is **no root `package.json`/workspace**; always `cd backend` or `cd frontend` before npm commands.

## Layout

- `backend/` — NestJS 12 + Prisma 7 on Neon Postgres. Entry `src/main.ts`: global prefix `/api`, port 3000, shutdown hooks, CORS from `CORS_ORIGIN`. `src/app.module.ts` wires global `ConfigModule` (loads `backend/.env`, validated by `src/config/env.validation.ts`), global `PrismaModule`, `AuthModule`, and global `JwtAuthGuard` + `RolesGuard` + `HttpExceptionFilter` (every route is protected unless marked `@Public()`).
- `frontend/` — React 19 + Vite 8 + Tailwind 4 + shadcn/ui. Dev server 5173 proxies `/api` → `http://localhost:3000`.
- `ENTITIES.md` — source of truth for the 9 models and business rules (item snapshots, multi-payment sales, unpaid remainder → Debt). Update it when the schema changes.
- `backend/src/modules/auth/` implements `POST /api/auth/login` + `GET /api/auth/me` (JWT, passport). Other `backend/src/modules/*` and all `frontend/src/features/*` are empty placeholders — not implemented yet.
- Swagger UI (`@nestjs/swagger` + `nestjs-zod`) is mounted at `/docs` (spec at `/docs-json`) by `src/config/swagger.config.ts`, enabled unless `NODE_ENV=production` (override with `SWAGGER_ENABLED`). `cleanupOpenApiDoc()` is required for correct output. Validation/serialization come from `nestjs-zod` (global `APP_PIPE` + `APP_INTERCEPTOR` in `src/app.module.ts`). Swagger routes bypass Nest guards, so the env gate is the only protection.

## Commands

Backend (`cd backend`):
- `npm run start:dev` · `npm run build` (nest build) · `npx tsc --noEmit`
- `npm run db:migrate` (dev) · `db:deploy` (prod) · `db:generate` · `db:seed` · `db:studio`
- Tests: `npm test` (vitest run); single file: `npx vitest run <path>`. Backend e2e pattern is `test/**/*.e2e-spec.ts` (supertest); `test/setup.ts` points `DATABASE_URL` at `DATABASE_URL_TEST` and throws if it is missing, so e2e needs a separate migrated DB.

Frontend (`cd frontend`):
- `npm run dev` · `npm run build` (runs `tsc --noEmit` first) · `npm test`
- shadcn: `npx shadcn@latest add <component>` (components.json + `cn` util already configured)

- `backend/.npmrc` sets `legacy-peer-deps=true` — required because `nestjs-zod@5.5.0` declares peers for Nest `^10||^11` only. Revisit when upstream adds Nest 12 support.
- `vite` is a declared backend devDependency (Vitest 5 requires it; npm will prune it otherwise).

No linter/formatter exists — verification is `tsc` + build + tests.

## Prisma 7 gotchas

- Connection URL lives in `backend/prisma.config.ts`, **not** in `schema.prisma` (datasource has only `provider`).
- Client is generated into `backend/src/generated/prisma` (gitignored). Never edit it by hand; regenerate with `npm run db:generate` (`migrate dev` also does).
- Runtime uses the `@prisma/adapter-pg` driver adapter (`PrismaPg`) in `src/prisma/prisma.service.ts`; `DATABASE_URL` is read with `ConfigService.getOrThrow` so the app fails at boot if missing.
- Money is `Decimal @db.Decimal(10,2)` — use `Prisma.Decimal`, never floats.
- `Sale.number` is filled by the DB sequence `sale_number_seq` (`@default(autoincrement())`) — never set it manually.
- One-to-one relations require `@unique` on the FK (see `Debt.saleId`).
- Add migrations via `npm run db:migrate`; never hand-edit applied migrations in `backend/prisma/migrations`.

## Environment

- `backend/.env` is gitignored; `.env.example` is the committed template. Never commit `DATABASE_URL` or `JWT_SECRET`.
- Vars: `DATABASE_URL`, `DATABASE_URL_TEST`, `JWT_SECRET` (validated: min 16 chars), `PORT`, `CORS_ORIGIN`, `SWAGGER_ENABLED`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`.
- Env is validated at boot by `src/config/env.validation.ts`; a bad/missing value fails the app instead of defaulting silently.
- Migrate the test DB once (PowerShell; no `cross-env` dependency): `$env:DATABASE_URL = $env:DATABASE_URL_TEST; npx prisma migrate deploy`.
- Seed creates admin `admin@store.local` / `admin123` and is idempotent.

## TypeScript / build quirks

- Backend: `module`/`moduleResolution: nodenext`, `types: ["node"]`; `rootDir` is set only in `tsconfig.build.json` (used by `nest build`).
- Because `types` is `["node"]`, test files must `import { describe, it, expect } from 'vitest'` explicitly — the vitest globals are not visible to `tsc`.
- Frontend: TypeScript 7 — `baseUrl` is removed, so `@/*` is defined in `tsconfig.json` `paths` **and** in `vite.config.ts` (uses `import.meta.url`; `__dirname` triggers a Vite warning).
- Tailwind 4 needs `tailwindcss()` in `vite.config.ts` plugins — without it `@apply`/`@theme` silently pass through unprocessed. CSS entry: `src/styles/globals.css`.
- CORS is enabled in `src/main.ts` for `CORS_ORIGIN` (default `http://localhost:5173`) with credentials; the Vite proxy is still the dev path.
- Request/response DTOs follow the `nestjs-zod` pattern: zod schema in `src/modules/<feature>/schemas/`, a DTO class `extends createZodDto(schema)` in `src/modules/<feature>/dto/` (`Create*Dto` for requests, `*ResponseDto` for responses). Controllers use `@Body() dto: CreateXDto` (no per-route pipe) + `@ZodSerializerDto(XResponseDto)` on every endpoint. Shared error shape lives in `src/common/swagger/dto/error-response.dto.ts`, referenced via one `@ApiAuthErrors()` per route.
- The global validation pipe has a custom exception factory that returns `BadRequestException` with a `message: string[]` — never use `nestjs-zod`'s default error shape (`{message:'Validation failed', errors:[...]}`), it breaks the locked error contract. `strictSchemaDeclaration` stays off so `@CurrentUser()` params pass through.
- Zod validators that normalize input must trim/transform **before** the checked type (e.g. `z.string().trim().pipe(z.email()...)`) — a trailing `.transform()` runs after validation and won't rescue padded input.

## Before committing

- Run `git status` and confirm `backend/.env` and `src/generated/` stay untracked.
