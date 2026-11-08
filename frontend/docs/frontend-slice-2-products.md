# Frontend Slice 2 — Products

## Goal

Put the backend product catalog behind a real frontend: list, detail,
create, and edit products with embedded categories, money as strings,
and the responsive table pattern — the first page that renders actual
data on top of the F0 shell and F1 auth.

## Locked decisions

- **Full page forms** — `/products/new` and `/products/:id/edit` (one
  form component reused for create + edit; title differs).
- **Fetched categories** — `GET /api/categories` feeds the category
  picker; no free-text categoryId.

- **Plain table** — no search/filter in v1 (client-side filter later).
- **Inactive badge** — products show an Active/Inactive pill; no hiding,
  no `isActive` toggle in v1 forms (update schema supports it, UI omits it).
- `zod` frontend schema mirrors the backend shape: money arrives as
  **strings** (`"12.34"`), the form submits **numbers** (backend rounds).
- No delete UI — the backend has no DELETE endpoint (deactivate-only).

## Existing state (verified)

- `src/api/client.ts` (`apiFetch`, Bearer from localStorage, 401 clears token)
  and `src/api/auth.ts` exist; `useMe` drives `ProtectedRoute` and the sidebar.
- `components/ui/` has `form`, `input`, `button`, `label` (shadcn).
- `features/products/` is an empty placeholder.
- Backend `GET /api/products` returns `{ id, name, sku, cost (string),
  price (string), description (string|null), stock, categoryId,
  category { id, name }, isActive, createdAt, updatedAt }`.

---

## Files to create

### 1. `src/api/products.ts` (new)
- `listProducts()` → `GET /products`, `getProduct(id)` → `GET /products/:id`,
  `createProduct(values)` → `POST /products`, `updateProduct(id, values)` →
  `PATCH /products/:id`. All via `apiFetch`, typed by the response schema
  (see #2).

### 2. `src/features/products/schemas/product.schema.ts` (new)
- `productResponseSchema` — mirror of the backend DTO: money as
  `z.string()`, `description` nullable, `category` embedded, `createdAt` /
  `updatedAt` strings.
- `productFormSchema` — the input side: money as `z.number()` (coerce from
  string inputs), `categoryId` as `z.uuid()`; export `z.infer` type.
- Round-trip: response strings → form numbers via the schema transform.

### 3. `src/features/products/hooks/useProducts.ts` (new)
- `useQuery(['products'], listProducts)`, `useQuery(['product', id], getProduct)`,
  `useMutation` for create/update with
  `queryClient.invalidateQueries(['products'])` on success.

### 4. `src/features/products/hooks/useCategories.ts` (new)
- `useQuery(['categories'])` → `GET /api/categories`. Separate file because
  the categories slice (F4) reuses it for its own picker.

### 5. `src/features/products/pages/ProductsPage.tsx` (new)
- `PageHeader` (title + "New product" primary action → `/products/new`).
- `ResponsiveTable` columns: name, sku, category (`category.name`),
  stock, cost/price (strings verbatim, no `Number()` math), status badge.
- Empty state: "No products yet." + CTA linking to `/products/new`.

### 6. `src/features/products/pages/ProductFormPage.tsx` (new)
- Single form component used for both create (`/new`) and edit (`/:id/edit`).
- RHF + `zodResolver(productFormSchema)`, `FormField` for each field;
  category as `<Select>` fed by `useCategories`.
- Server 409 (duplicate sku) → `setError('sku', …)`; 404 (unknown
  categoryId) → inline message on the select.
- Submit disabled until categories resolve; zero-category state reads
  "Create a category first" (categories page is a later slice).

### 7. `src/routes/AppRoutes.tsx` (update)
- Add under the protected tree: `/products`, `/products/new`,
  `/products/:id/edit`.

### 8. `src/components/ui/select.tsx` (via shadcn CLI)
- `npx shadcn@latest add select` — the category picker.

### 9. `src/features/products/schemas/product.spec.ts` (new)
- `productFormSchema`: "12.34" parses to `12.34`, negative rejected,
  uuid categoryId accepted, blank name rejected.
- Response schema: money strings stay strings.

## Execution order
1. `src/api/products.ts` + `useCategories.ts`.
2. Schema + spec.
3. `ProductsPage`.
4. `ProductFormPage` (create + edit variants share the component).
5. Routes + verify.

## Verification
```powershell
cd frontend
npm run build     # tsc --noEmit + vite build
npm test          # product.schema.spec.ts
```
Manual smoke:
- Sign in → Products (empty state + CTA) → New product (category select
  populated) → create → row appears with `"12.34"` style money → edit
  stock → save → list reflects it → deactivate via API → badge shows Inactive.

## Risks / gotchas
- **`z.uuid()` in the frontend** — zod 4 top-level (not `z.string().uuid()`).
- **Category list race** — form opens before categories load: disable submit
  until `useCategories` resolves.
- **Select empty state** — with zero categories, show "Create a category
  first" rather than an empty select and a guaranteed 404.
- **Money is strings** — never `Number(cost)` for display; the backend
  already rounds to 2dp.
- **Mobile** — `ResponsiveTable` handles the card stack; the form stacks
  single-column below `md` — test both breakpoints in the smoke test.
- **Swagger JSON** — nothing changes on the backend.

## Out of scope (later slices)
- Deactivate toggle UI (`isActive` in update DTO, omitted from v1 form)
- Search/filter on the list
- Delete (no backend endpoint)
- Dashboard numbers (F3)
