# Frontend roadmap — Store CRM

High-level roadmap, complementing per-slice docs in `frontend/docs/`
(`frontend-slice-0-shell.md`).

Backend slices 0–3 are DONE and committed (auth, users, categories,
products). Frontend slices build on them in the order below.

## Design language

Inspired by a law-firm reference (cream + evergreen) and the Leadora
dashboard layout (sidebar, stat cards, history table). Tokens live in
`src/styles/globals.css` `@theme` — components reference tokens only,
so colors can be retuned without touching JSX:

| Token | Value | Used for |
|---|---|---|
| `--background` | `#FAF7F2` (warm cream) | Page bg |
| `--card` | `#FFFFFF` | Cards, tables, dialogs |
| `--primary` | `#0F3D3E` (evergreen) | Buttons, links |
| `--accent` | `#C6E265` (lime) | Selected nav pill, progress bars, badges — accent only, never body text (contrast) |
| `--sidebar` | `#0F3D3E` | Sidebar bg |
| `--sidebar-foreground` | `#E8EDE9` | Sidebar text |
| `--radius` | `0.625rem` | Keep (density tweak later) |

Dark mode: **out of scope for v1** — the `.dark` tokens stay as shadcn
defaults until a slice activates them.

## Slice F0 — Shell + theme (NEXT)
- Sidebar (evergreen bg, lime selected pill, logo, nav: Overview,
  Products, Categories, Clients, Sales, Debts, Users, Settings),
  collapsible below 768px (hamburger → overlay).
- Top bar: breadcrumb, search slot, primary action slot, avatar.
- Router skeleton (`react-router-dom`): protected layout vs `/login`.
- `@theme` tokens from the table above.
- Responsive primitives: `AppSidebar`, `PageHeader`, `StatCard`,
  `ResponsiveTable` (table → stacked cards below `md` — ship once,
  inherit N times).

## Slice F1 — Auth
- `/login` page: centered card on cream bg, email + password.
  `react-hook-form` + `zodResolver` over the backend's `loginSchema` shape.
- JWT in `localStorage`; fetch client in `src/api/client.ts` sends
  `Authorization: Bearer …`; `401` → clear token + redirect to `/login`.
- `useMe` (React Query `['me']`) + protected-route loader.
- Users nav item hidden unless `me.role === 'ADMIN'` (backend enforces too).

## Slice F2 — Products
- Table (name, sku, category, stock, cost/price, status) + row delete?
  No — deactivate-only (`isActive`); edit page/drawer for fields.
- Create/edit form: RHF + zodResolver, money inputs as strings in the API
  response → numbers in the form; server 400/409 → `setError()`.
- Embedded `category { id, name }` renders directly (no extra fetch).

## Slice F3 — Dashboard (skeleton)
- KPI cards (today's sales, stock value, open debts, low stock),
  low-stock list, recent sales.
- Real numbers land when the sales/debts API exists (backend Slice 5+);
  start with placeholders wired to the products query for stock stats.

## Slice F4 — Categories / Clients / Users
- User management (ADMIN-only). Clients are backend-owned by the
  clients slice; wire up when it exists. Order: categories → clients →
  users, one page per feature, mirrors the backend slices.

## Cross-cutting constraints (all slices)

- **Auth**: token in `localStorage`, sent as Bearer; `401` clears and
  redirects. Never put secrets in the token payload beyond `{sub, email, role}`.
- **Forms**: `useForm({ resolver: zodResolver(schema), defaultValues })`;
  `FormField` shadcn wrappers; server errors via `setError()`.
- **Data**: React Query keys per feature (`['products']`, …); fetch client
  prefixes `/api`; error shape `{ statusCode, message }` from the backend —
  render `message` arrays joined or per-field.
- **Money**: API money is a **string** (`"12.34"`); parse at the boundary,
  submit as numbers; no float math on the client.
- **Responsive from day one**: sidebar collapses <768px; tables become
  stacked cards via `ResponsiveTable`; no mobile-only second layout.
- **Tests**: vitest + jsdom specs per page (`*.spec.tsx`) — globals are
  enabled, so no explicit vitest imports needed on the frontend (unlike backend).
- **Build verification**: `npm run build` (runs `tsc --noEmit` first),
  then `vite preview` smoke; `npm test` has no specs yet — first page
  slice adds them.
