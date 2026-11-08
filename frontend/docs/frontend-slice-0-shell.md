# Frontend Slice 0 — Shell + theme

## Goal

Give every later page the same frame: a collapsible evergreen sidebar,
a top bar, the locked color tokens, a route skeleton, and two
responsive primitives (`PageHeader`, `ResponsiveTable`). No data
fetching yet — pages come in F1 (auth) and F2 (products).

## Locked decisions

- Desktop-first *layout* (sidebar) with **responsive-from-day-one**
  behavior: sidebar collapses below 768px, tables stack into cards.
- Palette: cream bg, evergreen primary + sidebar, lime selected-pill
  accent (see `frontend-roadmap.md` token table). Dark mode out of scope.
- Router (`react-router-dom`) with a `ProtectedRoute` layout —
  unauthenticated visits redirect to `/login` (page lands in F1).
- No data fetching in this slice; F1 adds the fetch client + `useMe`.

## Existing state (verified)

- `src/main.tsx` is a scaffold placeholder — renders `<div>Alice Store</div>`.
- `src/styles/globals.css` is the stock shadcn theme (oklch vars, `.dark`
  defaults kept untouched; only light tokens get overridden).
- `src/lib/utils.ts` has `cn()` (`clsx` + `tailwind-merge`).
- `vite.config.ts`: React + Tailwind 4 plugins, `@` alias, `/api` → 3000 proxy.
- `components/ui/`, `api/`, `routes/`, `hooks/` are `.gitkeep` placeholders.

---

## Files to create

### 1. `src/styles/globals.css` (update)

Override the light `:root` tokens only:

| Token | Value |
|---|---|
| `--background` | `#FAF7F2` |
| `--card` | `#FFFFFF` |
| `--primary` | `#0F3D3E` |
| `--accent` | `#C6E265` |
| `--sidebar` | `#0F3D3E` |
| `--sidebar-foreground` | `#E8EDE9` |

Leave `.dark` and `@theme inline` as-is — `--color-*` tokens pick up the
new values automatically.

### 2. `src/components/layout/AppSidebar.tsx`

- Fixed-position on desktop (`md:`), `lg:` visible; below 768px it becomes
  an overlay controlled by hamburger in the top bar (`useState` open flag).
- Nav items: Overview, Products, Categories, Clients, Sales, Debts,
  Users, Settings — with lucide icons and `aria-current` on the active
  item (lime pill + dark text).
- Users item hidden unless the injected `role` prop is `ADMIN`.
- Bottom: current user block (name + role from props; real data in F1).

### 3. `src/components/layout/TopBar.tsx`

- Breadcrumb (`Overview / <page>`), search input slot (decorative for now),
  flexible spacer, primary action slot (page-supplied).
- Mobile: hamburger button (visible <768px) toggles sidebar overlay.

### 4. `src/components/layout/AppShell.tsx`

- Layout wrapper: sidebar + main column (`md:ml-…` offset), applies
  `--background`, renders `TopBar` + `children` in a padded container.
- Unexposed until a page lands in it (products in F2).

### 5. `src/components/layout/ProtectedRoute.tsx`

- Outlet wrapper: reads a `isAuthenticated` prop (F1 wires it to
  `localStorage` + `useMe`); unauthenticated → `<Navigate to="/login" replace />`.
- This slice ships it with a prop; F1 supplies the real check.

### 6. `src/routes/AppRoutes.tsx`

- `react-router-dom` `Routes`:
  - `/login` → placeholder `LoginPage` (real form in F1)
  - `/` → `ProtectedRoute` layout containing `OverviewPage` placeholder
  - `*` → `Navigate to /` replace.
- `App.tsx` exports the router; `main.tsx` renders `<RouterProvider>`.

### 7. `src/features/dashboard/pages/OverviewPlaceholder.tsx`

- One-liner page proving the shell renders (`StatCard` trio with
  placeholder numbers — real data in F3).

### 8. Shared primitives

- `src/components/layout/PageHeader.tsx` — title + optional subtitle +
  optional primary action; used by every page.
- `src/components/layout/ResponsiveTable.tsx` — desktop `<table>` that
  collapses to a stacked card list below `md` via a `columns` prop +
  `renderRow` callback; pages pass data in, layout is shared.

## Execution order

1. Tokens in `globals.css`.
2. `cn` is already there — scaffold sidebar + top bar + shell.
3. `ProtectedRoute` + router skeleton in `main.tsx`.
4. `PageHeader` / `ResponsiveTable` / placeholder overview page.
5. Verify (below).

## Verification

```powershell
cd frontend
npm run build        # tsc --noEmit runs first
npx vite build       # (covered by build)
npm test             # no specs yet — exits 1 with "No test files found" (pre-existing)
```

Manual smoke:

```powershell
npm run dev
# Visit http://localhost:5173 — sidebar (evergreen), top bar, cream bg,
# Overview placeholder. Unauthenticated / visits redirect to /login placeholder.
# Resize <768px: sidebar behind hamburger, table primitives not yet exercised.
# http://localhost:5173/ → Overview placeholder
```

## Risks / gotchas

- **Shadcn theme override** — edit `:root` values only, never `@theme inline`
  mappings; otherwise dark tokens break silently.
- **Tailwind 4 `@apply`** — keep the existing `tailwindcss()` plugin in
  `vite.config.ts` or `@apply` passes through unprocessed.
- **Alias `@/`** — in `tsconfig.json` `paths` *and* `vite.config.ts`
  (`import.meta.url`); `__dirname` triggers a Vite warning.
- **Sidebar overlay** — a fixed element under 768px needs a backdrop and
  `aria-hidden`; lock body scroll while open.
- **Lucide icons** — import from `lucide-react` directly (no barrel import).

## Out of scope (later slices)

- Login form, fetch client, token handling (F1)
- Any data table with real data (F2)
- Dashboard KPIs (F3)
- Dark mode (stays unused)
