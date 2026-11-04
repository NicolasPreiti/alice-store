# STACK.md — Alice Store (Store CRM)

## Purpose

CRM for a store. Employees log in to manage products, sales, client debts, and view store stats.

## Frontend

| Layer | Choice |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite |
| Styling | Tailwind CSS + shadcn/ui |
| Data fetching | TanStack Query |
| Routing | React Router |
| Validation | Zod |
| Testing | Vitest |

## Backend

| Layer | Choice |
|---|---|
| Framework | NestJS + TypeScript |
| ORM | Prisma |
| Auth | JWT (access token, `Authorization: Bearer`), role guard |
| Validation | Zod (global validation pipe) |
| Testing | Vitest + supertest (e2e) |

## Database

- **Neon.tech** (serverless PostgreSQL) via `DATABASE_URL`
- Entities: User, Category, Product, Client, Sale, SaleItem, SalePayment, Debt, Payment

## Conventions

- Two independent packages: `frontend/` and `backend/`
- Ports: frontend 5173 → proxies `/api` → backend 3000
- API prefix: `/api`
- Errors: uniform `{ statusCode, message }`
- Roles: `ADMIN` (everything + user management), `EMPLOYEE` (sales, products, clients, debts)

## Env vars (`backend/.env`)

| Var | Description |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing JWTs |
| `PORT` | Backend port (default 3000) |

## Run commands

```bash
# frontend
cd frontend && npm install && npm run dev

# backend
cd backend && npm install && npm run start:dev
```
