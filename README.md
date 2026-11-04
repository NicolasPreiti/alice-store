# Alice Store — Store CRM

CRM for a store: products, sales, client debts, and stats. See [STACK.md](./STACK.md) for the tech stack.

## Status

Scaffold only — structure and configs, no features implemented yet.

## Structure

```
alice-store/
├── STACK.md
├── README.md
├── frontend/          # React + Vite + Tailwind + shadcn/ui
│   └── src/
│       ├── api/       # API client + TanStack Query hooks
│       ├── features/  # auth, products, sales, clients, debts, dashboard
│       ├── components/# ui/ (shadcn) + layout
│       ├── lib/       # shared Zod schemas, utils
│       └── routes/
└── backend/           # NestJS + Prisma + Neon
    └── src/
        ├── modules/   # auth, users, categories, products, clients, sales, debts, stats
        ├── prisma/    # schema + migrations
        ├── common/    # validation pipe, decorators, guards
        └── config/    # env schema
```

## Getting started (after features are implemented)

```bash
# backend
cd backend
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET
npm install
npm run start:dev

# frontend
cd frontend
npm install
npm run dev            # http://localhost:5173
```
