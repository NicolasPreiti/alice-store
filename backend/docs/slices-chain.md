# Slices chain — Store CRM

High-level roadmap, complementing per-slice docs in `backend/docs/`
(`slice-0-foundation-auth.md`, `slice-1-users.md`).

Reference for entity definitions and business rules: `/ENTITIES.md`
(9 models, 7 rules). `schema.prisma` is the wire format;
`ENTITIES.md` is the meaning.

Dependency order:

```
users DONE
categories --> products --> sales --> debts/payments --> stats
clients  -------------------> sales (optional clientId)
```

## Slice 0 — Foundation + Auth (DONE, committed)
- `POST /api/auth/login`, `GET /api/auth/me`
- Global JwtAuthGuard + RolesGuard, `@Public()` opt-out
- Zod env validation, CORS, Swagger UI at `/docs` (dev/test only)
- Global zod pipe (custom error shape) + serializer interceptor
- e2e tests written (blocked on `DATABASE_URL_TEST`); see `backend/docs/slice-0-foundation-auth.md`

## Slice 1 — Users (DONE, committed)
- ADMIN-only CRUD: `GET/POST /api/users`, `GET/PATCH /api/users/:id`,
  `POST /api/users/:id/reset-password`
- Deactivate-only removal (no DELETE), self-deactivate + last-active-admin guards
- See `backend/docs/slice-1-users.md`

## Slice 2 — Categories (NEXT, recommended)
- Why: only remaining module with zero dependencies; unblocks Products
  (`Product.categoryId` required). Tiny slice that proves CRUD on module #2.
- Rough scope: `GET/POST/PATCH /api/categories` (+ delete-if-empty check).
- Model: `id`, `name @unique`, `Product[]`.

## Slice 3 — Products
- Why: depends on Categories. First slice exercising `Decimal(10,2)`
  money handling (never floats), `stock`, `isActive`, `sku @unique`.
- Model: `name`, `sku @unique`, `cost`, `price`, `description?`, `stock`,
  `categoryId`, `isActive`, `createdAt`, `updatedAt`.

## Slice 4 — Clients
- Why: independent; needed before Sales (`Sale.clientId` optional,
  `Debt.clientId`). Tiny (`name`, `phone?`, `notes?`, `createdAt`).
- Can run in parallel with Products; must land before Sales.

## Slice 5 — Sales (the big one)
- Depends on Users (done), Products (stock decrement), Clients (optional).
- Business rules (ENTITIES 1–4): one transaction for `Sale` + `SaleItem`
  snapshots + stock decrement; `SalePayments` sum ≤ total;
  remainder > 0 → auto-create `Debt` (saleId set); multiple payments
  per sale; credit sale = no special flag.
- Requires Prisma `$transaction`; `Sale.number` from DB sequence
  (never set manually); money as `Prisma.Decimal`.

## Slice 6 — Debts + Payments
- Depends on Sales, Clients.
- `Debt.status OPEN | PARTIAL | PAID` (ENTITIES rule 5);
  each `Payment` updates `Debt.paid`; manual debts allowed (`saleId = null`).

## Slice 7 — Stats
- Aggregates over Sales, Debts, Products, Clients. Last by definition.

## Cross-cutting constraints (all slices)
- Error shape `{ statusCode, message }`; P2002 → 409, P2025 → 404 (filter).
- DTOs: zod schema in `schemas/` + `extends createZodDto` in `dto/`;
  `@Body() dto: CreateXDto`, `@ZodSerializerDto(XResponseDto)`.
- Every route protected by default; `@Roles('ADMIN')` only for admin
  operations (ENTITIES rule 7: ADMIN = everything + user management,
  EMPLOYEE = sales/products/clients/debts).
- Never `select` `passwordHash` into responses; Prisma `Date` → ISO
  string in the service before serialization; uuid string IDs.
- e2e in `test/<feature>.e2e-spec.ts` (supertest, `DATABASE_URL_TEST`);
  `e2e-` email prefix for fixture cleanup.
- Log decisions in a per-slice doc before implementing, mirroring
  `slice-0`/`slice-1` format.
