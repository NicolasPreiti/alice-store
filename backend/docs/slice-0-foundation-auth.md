# Slice 0 — Foundation + Auth (backend)

## Goal

Make the API safe and authenticated: every route protected by default, validated input, uniform errors, and a working `POST /api/auth/login` + `GET /api/auth/me`.

No business features (users, products, …) — those come in later slices.

## Locked decisions

- Backend only; frontend later.
- Tests per slice. e2e runs against a **separate test database** (`DATABASE_URL_TEST`).
- Error shape: `{ statusCode, message }` where `message` is `string | string[]` (Nest native).
- Global `JwtAuthGuard` + `@Public()` opt-out; global `RolesGuard` (no-op when `@Roles` absent).
- No Swagger.
- No new npm packages needed (passport, passport-jwt, @nestjs/jwt, bcryptjs, zod all installed).

## Existing state (verified)

- `src/main.ts`: prefix `api`, port `process.env.PORT ?? 3000`, shutdown hooks. No CORS.
- `src/app.module.ts`: `ConfigModule.forRoot({ isGlobal: true })` + `PrismaModule`.
- `src/prisma/prisma.service.ts`: `PrismaClient` + `PrismaPg` adapter, `DATABASE_URL` via `getOrThrow`.
- Prisma `User`: `id, name, email @unique, passwordHash, role Role @default(EMPLOYEE), isActive @default(true), createdAt`.
- `vitest.config.ts`: node env, globals, includes `src/**/*.spec.ts` + `test/**/*.e2e-spec.ts`.
- `backend/.env` exists (dev Neon DB), `backend/test/` does not exist yet.

---

## Files to create

### 1. `src/config/env.validation.ts`

```ts
import { z } from 'zod';

export const envSchema = z.object({
  DATABASE_URL: z.url(),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  SEED_ADMIN_EMAIL: z.string().optional(),
  SEED_ADMIN_PASSWORD: z.string().optional(),
});

export function validateEnv(config: Record<string, unknown>) {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new Error(`Invalid environment variables: ${issues}`);
  }
  return result.data;
}
```

Wire in `app.module.ts`: `ConfigModule.forRoot({ isGlobal: true, validate: validateEnv })`.

### 2. `src/common/types/auth-user.type.ts`

```ts
import type { Role } from '../../generated/prisma/client';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}
```

### 3. `src/common/decorators/public.decorator.ts`

```ts
import { SetMetadata } from '@nestjs/common';
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

### 4. `src/common/decorators/roles.decorator.ts`

```ts
import { SetMetadata } from '@nestjs/common';
import type { Role } from '../../generated/prisma/client';
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
```

### 5. `src/common/decorators/current-user.decorator.ts`

```ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthUser } from '../types/auth-user.type';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest().user,
);
```

### 6. `src/common/pipes/zod-validation.pipe.ts`

```ts
import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';

@Injectable()
export class ZodValidationPipe<T> implements PipeTransform {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException(
        result.error.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`),
      );
    }
    return result.data;
  }
}
```

Applied per route: `@Body(new ZodValidationPipe(loginSchema)) dto: LoginDto`.

### 7. `src/common/guards/jwt-auth.guard.ts`

```ts
import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) { super(); }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(), context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
}
```

### 8. `src/common/guards/roles.guard.ts`

```ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(), context.getClass(),
    ]);
    if (!required?.length) return true;
    const { user } = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    if (!user) throw new ForbiddenException('No user in request');
    if (!required.includes(user.role)) throw new ForbiddenException('Insufficient role');
    return true;
  }
}
```

### 9. `src/common/filters/http-exception.filter.ts`

`@Catch()` global filter:

- `HttpException` → `{ statusCode, message }`; if `getResponse()` is an object with `message`, use it (array preserved), else the string.
- `ZodError` → 400, `message: string[]` (`path: message`).
- `PrismaClientKnownRequestError` → P2002 → 409 `"Unique constraint violation"`, P2025 → 404 `"Resource not found"`, else 500.
- Anything else → 500 `"Internal server error"` (log the real error server-side, never in the body).
- Register in `main.ts` via `app.useGlobalFilters(new HttpExceptionFilter())` (or `APP_FILTER`).

### 10. `src/modules/auth/schemas/login.schema.ts`

```ts
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email().transform((v) => v.toLowerCase().trim()),
  password: z.string().min(1, 'Password is required'),
});

export type LoginDto = z.infer<typeof loginSchema>;
```

### 11. `src/modules/auth/auth.service.ts`

- `validateUser(email, password)`:
  - `prisma.user.findUnique({ where: { email } })`
  - no user → `UnauthorizedException('Invalid credentials')`
  - `!user.isActive` → `UnauthorizedException('User is inactive')`
  - `bcrypt.compare(password, user.passwordHash)` false → `UnauthorizedException('Invalid credentials')`
  - returns sanitized `{ id, name, email, role }`
- `login(dto)` → `{ accessToken, user }` (`jwtService.signAsync({ sub, email, role })`)
- `me(userId)` → `findUnique` with `select: { id, name, email, role, isActive, createdAt }`; missing/inactive → 401

### 12. `src/modules/auth/jwt.strategy.ts`

```ts
super({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  ignoreExpiration: false,
  secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
});

async validate(payload: { sub: string; email: string; role: Role }): Promise<AuthUser> {
  return { id: payload.sub, email: payload.email, role: payload.role };
}
```

### 13. `src/modules/auth/auth.controller.ts`

```ts
@Controller('auth')
export class AuthController {
  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body(new ZodValidationPipe(loginSchema)) dto: LoginDto) { ... }

  @Get('me')
  me(@CurrentUser() user: AuthUser) { ... }
}
```

### 14. `src/modules/auth/auth.module.ts`

`PassportModule` + `JwtModule.registerAsync({ inject: [ConfigService], useFactory: (c) => ({ secret: c.getOrThrow('JWT_SECRET'), signOptions: { expiresIn: '24h' } }) })`; provides `AuthService`, `JwtStrategy`; exports `AuthService`.

### 15. `src/app.module.ts` (update)

```ts
imports: [ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }), PrismaModule, AuthModule],
providers: [
  { provide: APP_GUARD, useClass: JwtAuthGuard },
  { provide: APP_GUARD, useClass: RolesGuard },
  { provide: APP_FILTER, useClass: HttpExceptionFilter },
],
```

### 16. `src/main.ts` (update)

```ts
const app = await NestFactory.create(AppModule);
const config = app.get(ConfigService);
app.enableCors({ origin: config.get('CORS_ORIGIN'), credentials: true });
app.enableShutdownHooks();
app.setGlobalPrefix('api');
await app.listen(config.get('PORT') ?? 3000);
```

### 17. `backend/.env.example` (update)

Add `CORS_ORIGIN="http://localhost:5173"` and `DATABASE_URL_TEST="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"`.

### 18. Test DB wiring

- `backend/test/setup.ts`:
  ```ts
  import 'dotenv/config';
  if (!process.env.DATABASE_URL_TEST) throw new Error('DATABASE_URL_TEST is required for e2e tests');
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
  process.env.NODE_ENV = 'test';
  ```
- `backend/vitest.config.ts`: add `setupFiles: ['test/setup.ts']`.
- Migrate the test DB once (documented in AGENTS.md):
  ```powershell
  $env:DATABASE_URL = $env:DATABASE_URL_TEST; npx prisma migrate deploy
  ```
  (No `cross-env` dependency added; PowerShell syntax documented instead.)

### 19. `backend/test/auth.e2e-spec.ts`

Setup:
- `beforeAll`: create Nest app from `AppModule`, `setGlobalPrefix('api')` + global filter/guards already via `APP_*`; connect Prisma; create fixture users directly through Prisma:
  - `e2e-admin@test.local` / `e2e-pass-123` (ADMIN, active)
  - `e2e-inactive@test.local` / `e2e-pass-123` (EMPLOYEE, `isActive: false`)
- `afterAll`: `prisma.user.deleteMany({ where: { email: { startsWith: 'e2e-' } } })`, close app, disconnect.

Cases:
1. `POST /api/auth/login` valid → 200, `accessToken` string, `user` has no `passwordHash`
2. wrong password → 401
3. unknown email → 401
4. inactive user → 401
5. invalid body (missing password) → 400 with `message` array
6. `GET /api/auth/me` with token → 200, matching email, no `passwordHash`
7. `GET /api/auth/me` without token → 401
8. `GET /api/auth/me` with garbage token → 401

---

## Execution order

1. Write `src/config/env.validation.ts` → wire into `app.module.ts`.
2. Write `src/common/**` (types, decorators, pipe, guards, filter).
3. Write `src/modules/auth/**`.
4. Update `app.module.ts` (AuthModule + `APP_GUARD`/`APP_FILTER`) and `main.ts` (CORS + ConfigService).
5. Update `.env.example`; ask user to add `DATABASE_URL_TEST` to `.env` (or paste it).
6. Write `test/setup.ts`, update `vitest.config.ts`, write `test/auth.e2e-spec.ts`.
7. Verify.

## Verification

```powershell
cd backend
npx tsc --noEmit
npm run build
$env:DATABASE_URL = $env:DATABASE_URL_TEST; npx prisma migrate deploy
npm test
```

Manual smoke:
```powershell
npm run start:dev
# POST http://localhost:3000/api/auth/login  {"email":"admin@store.local","password":"admin123"}
# GET  http://localhost:3000/api/auth/me     Authorization: Bearer <token>
```

## Risks / gotchas

- **Zod 4**: use `z.email()` / `z.url()` (top-level), not the deprecated `z.string().email()`.
- **`nodenext` + decorators**: keep `emitDecoratorMetadata`; guard constructors must not use `import type` for DI classes (`Reflector`).
- **Global guard order**: `JwtAuthGuard` must be registered before `RolesGuard` so `request.user` exists.
- **Public routes**: only `/auth/login` — `@Public()` must be on the handler, not the controller.
- **Test env override**: `test/setup.ts` must set `DATABASE_URL` before `ConfigModule` initializes; `setupFiles` runs before test files, so this is safe.
- **Test DB is empty**: no seeded admin — fixtures must be created in `beforeAll`.
- **`JWT_SECRET` length**: existing `.env` value must be ≥16 chars or boot fails (intended).
- **Password hash**: never `select` it into responses; use explicit `select`.
- **Don't commit**: `backend/.env`, `backend/src/generated/`.

## Out of scope (later slices)

- Users CRUD, categories, products, clients, sales, debts, stats.
- Refresh tokens, password reset via email, rate limiting.
- Swagger, frontend login page.
