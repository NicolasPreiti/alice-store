# Slice 1 — Users (backend)

## Goal

Let an ADMIN create, list, view, update, and deactivate users — the user-management quarter of ENTITIES rule 7 ("ADMIN = everything + user management"). Any user can already log in (Slice 0); this slice makes accounts manageable.

No business features (sales, products, clients, debts, stats) — those are later slices.

## Locked decisions

- Backend only; frontend later.
- **ADMIN-only** — every endpoint is `@Roles('ADMIN')`. EMPLOYEE → `403`.
- **Admin-set + admin reset** — create with an initial password; admin can set a new password via `POST /:id/reset-password`. No self-service change, no email reset flow.
- **Deactivate-only removal** — `isActive: false` is the only way to remove a user. No hard `DELETE` endpoint (preserves `Sale.userId` history; `me()` already 401s inactive users).
- **Full CRUD in one slice** — list, detail, create, update, reset-password.
- Tests per slice. e2e runs against a **separate test database** (`DATABASE_URL_TEST`).
- Error shape: `{ statusCode, message }` where `message` is `string | string[]` (Nest native).
- Global `JwtAuthGuard` + `RolesGuard` protect all routes by default; `@Roles('ADMIN')` on every users route.
- Swagger via `nestjs-zod` DTOs (no decorator soup) + `@ApiAuthErrors()`.

## Existing state (verified)

- `User`: `id` (uuid), `name`, `email @unique`, `passwordHash`, `role Role @default(EMPLOYEE)` (`ADMIN | EMPLOYEE`), `isActive @default(true)`, `createdAt`. `Sale.userId` references it.
- `AuthService.validateUser` does `findUnique({ where: { email } })` then bcrypt `compare`; seed (`prisma/seed.ts`) hashes with `bcryptjs hash(password, 10)`.
- Global setup: `APP_GUARD` JwtAuthGuard → RolesGuard, `APP_PIPE` (nestjs-zod, custom exception factory), `APP_INTERCEPTOR` (serializer), `APP_FILTER` `HttpExceptionFilter` (P2002 → 409, P2025 → 404).
- `src/modules/users/` is an empty placeholder (`.gitkeep`).
- DTO pattern (Slice 0): zod schema in `schemas/`, `class XDto extends createZodDto(schema)` in `dto/`, `@Body() dto: CreateXDto`, `@ZodSerializerDto(XResponseDto)` on every endpoint.
- Prisma client is generated to `backend/generated/prisma` (outside `src/`) — never `src/generated`.

---

## Files to create

### 1. `src/modules/users/schemas/create-user.schema.ts`

```ts
export const createUserSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().trim().pipe(z.email().transform((v) => v.toLowerCase())),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['ADMIN', 'EMPLOYEE']).default('EMPLOYEE'),
});
```

Defaults locked: **password min 8**, email normalized *before* the check (`pipe`, see AGENTS.md).

### 2. `src/modules/users/schemas/update-user.schema.ts`

```ts
export const updateUserSchema = z.object({
  name: z.string().trim().min(1).optional(),
  role: z.enum(['ADMIN', 'EMPLOYEE']).optional(),
  isActive: z.boolean().optional(),
}).refine((v) => Object.keys(v).length > 0, { message: 'At least one field is required' });
```

Note: no `password` here — password changes go through reset-password only.

### 3. `src/modules/users/schemas/user-response.schema.ts`

```ts
export const userResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.enum(['ADMIN', 'EMPLOYEE']),
  isActive: z.boolean(),
  createdAt: z.string(),  // service maps Prisma Date → ISO string
});
```

Never `passwordHash`. Serializer strips extras, but the service must use an explicit `select` anyway.

### 4. `src/modules/users/dto/*.dto.ts`

- `CreateUserDto extends createZodDto(createUserSchema)`
- `UpdateUserDto extends createZodDto(updateUserSchema)`
- `UserResponseDto extends createZodDto(userResponseSchema)`

### 5. `src/modules/users/users.service.ts`

- `findAll()` — `findMany` with explicit `select` (no `passwordHash`), `orderBy: { createdAt: 'asc' }`. Plain array, **no pagination in v1**.
- `findOne(id)` — `findUnique`, missing → `404` via `NotFoundException('User not found')` (explicit check, not relying on P2025). Map `createdAt.toISOString()`.
- `create(dto)` — hash once, `prisma.user.create`, duplicate email bubbles as `P2002` → filter → **`409 "Unique constraint violation"`** (generic message kept, v1).
- `update(selfId, id, dto)` —
  - self-deactivate (`id === selfId && dto.isActive === false`) → `400 "Cannot deactivate your own account"`.
  - last-active-admin guard: if target is an active ADMIN and the patch would deactivate them or downgrade to EMPLOYEE, count remaining active ADMINs; `0` → `400 "Cannot remove the last active admin"`.
  - empty-patch refinement already enforced by the schema.
- `resetPassword(id, newPassword)` — `update` with `hash(newPassword, 10)`; missing user → 404. Self reset is allowed (harmless).
- Remove the `users/.gitkeep` placeholder.

### 6. `src/modules/users/users.controller.ts`

```ts
@Roles('ADMIN')
@Controller('users')
export class UsersController {
  @Get() @ZodSerializerDto([UserResponseDto]) list()
  @Get(':id') @ZodSerializerDto(UserResponseDto) findOne(@Param('id') id: string)
  @Post() @ZodSerializerDto(UserResponseDto) create(@Body() dto: CreateUserDto)         // 201, Nest default
  @Patch(':id') @ZodSerializerDto(UserResponseDto) update(@CurrentUser() me, @Param('id') id, @Body() dto)  // 200
  @Post(':id/reset-password') @ZodSerializerDto(UserResponseDto) resetPassword(@Param('id') id, @Body() dto: ResetPasswordDto)  // 200
}
```

`@Param('id')` + the global pipe: primitive `id` params pass through `strictSchemaDeclaration: false` (as with `@CurrentUser()`).

Also a small `reset-password.schema.ts` / `ResetPasswordDto` (`{ password: z.string().min(8) }`).

### 7. `src/modules/users/users.module.ts` + `app.module.ts`

Import `UsersModule`; register it alongside `AuthModule`. No new providers needed (guards/pipe/interceptor/filter are already global).

### 8. `test/users.e2e-spec.ts`

Fixtures via Prisma in `beforeAll` (admin token from a fixture ADMIN user, plus an EMPLOYEE fixture); email prefix for cleanup: **`e2e-`** (matches auth fixtures; delete in `afterAll`).

1. Admin creates user (valid payload) → 201, response has no `passwordHash`
2. Duplicate email → 409
3. Invalid create body (short password / bad email) → 400 `message` array
4. `GET /api/users` as ADMIN → 200, array containing the created user
5. `GET /api/users` as EMPLOYEE → 403
6. `GET /api/users/:id` → 200; unknown id → 404
7. `PATCH /api/users/:id` rename + role change → 200
8. `PATCH` self-deactivate → 400
9. `PATCH` deactivating the last active ADMIN → 400
10. `POST /api/users/:id/reset-password` → 200, and the new password logs in via `/api/auth/login`; old password → 401
11. `POST /api/users/:id/reset-password` unknown id → 404

## Execution order

1. Schemas + DTOs (`schemas/`, `dto/`).
2. `users.service.ts`.
3. `users.controller.ts` + `users.module.ts` → import in `app.module.ts`; delete `users/.gitkeep`.
4. `test/users.e2e-spec.ts`.
5. Verify.

## Verification

```powershell
cd backend
npx tsc --noEmit
npm run build
node -e "require('./dist/main.js')"
npm test   # once DATABASE_URL_TEST is set
```

Manual smoke:

```powershell
$env:PORT = 3001; npm run start:dev
# log in as admin@store.local / admin123, then
# POST /api/users {"name":"Bob","email":"bob@store.local","password":"password123"}
# GET  /api/users
# POST /api/users/<id>/reset-password {"password":"newpassword123"}
```

## Risks / gotchas

- **`createdAt` Date vs `z.string()`** — service must `toISOString()` before the serializer (same as `me()`), or serialization throws 500.
- **Salt rounds** — must stay `10` to match `auth`/`seed`; don't reintroduce different cost factors.
- **Prisma error mapping** — rely on `HttpExceptionFilter`: P2002 → 409, P2025 → 404. Don't catch-and-rethrow ad hoc.
- **`@Param('id')` + global pipe** — non-DTO params pass through only because `strictSchemaDeclaration` is off; keep it off.
- **Last-admin guard TOCTOU** — count-then-update is not atomic; acceptable for a single-instance store admin API (document as known limitation).
- **Email normalize on update** — `update` cannot change email in v1 (not in `updateUserSchema`); no normalization needed there.
- **Swagger JSON** — new DTOs appear automatically via `createZodDto`; confirm `/docs-json` includes `CreateUserDto`/`UserResponseDto`.

## Out of scope (later slices)

- Self-service profile editing / self password change (needs current-password verification)
- Email-based password reset, magic links
- Hard `DELETE` endpoint (needs a sales-history policy + cascade rules)
- Pagination / search / filtering on `GET /api/users`
- Frontend users page
