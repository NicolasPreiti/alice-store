# Frontend Slice 1 — Auth

## Goal

Replace the F0 login placeholder with a working sign-in: RHF + zod form
posts to `POST /api/auth/login`, the JWT is stored in `localStorage`,
a fetch client attaches the Bearer token, `GET /api/auth/me` drives the
session, and every protected route is gated on a server-verified session.

## Locked decisions

- **localStorage** `accessToken` (raw JWT string, no wrapper object).
- **Server check on load** — `useMe` queries `GET /api/auth/me`; a token
  that fails (401) logs out immediately, even if present.
- **Server errors** → `setError('password', { message })` (inline, not a banner;
  network errors → `setError('root', …)`).
- **Logout** — sidebar bottom, in the existing user block: avatar + name +
  "Admin/Staff" + Log out button → clear token → `/login`.
- RHF + `@hookform/resolvers` `zodResolver` over the frontend copy of the
  backend `loginSchema` shape (trim + lowercase email, min-1 password).
- No RTL changes: `main.tsx` still renders `BrowserRouter` + `AppRoutes`.

## Existing state (verified)

- `features/auth/pages/LoginPage.tsx` is a styled placeholder.
- `ProtectedRoute` takes `isAuthenticated?: boolean`, currently hardcoded
  `false` in `routes/AppRoutes.tsx`.
- `AppShell` accepts `role`/`userName` props already (placeholder values from F0).
- `components/ui/` is still empty — first shadcn components arrive here
  (FormField, Input, Button, Label) via `npx shadcn@latest add ...`.

---

## Files to create / change

### 1. `src/api/client.ts` (new)
- `apiFetch(path, init)` — fetch wrapper prefixing `/api`, setting
  `Authorization: Bearer <token>` from `localStorage['accessToken']`,
  parsing JSON, throwing an `ApiError { status, message }` shaped like the
  backend `{ statusCode, message }`. On `401`, clears the token — the
  wrapper clears, the query layer owns the redirect (single owner of navigation).

### 2. `src/api/auth.ts` (new)
- `login(email, password)` → `POST /api/auth/login`, returns `{ accessToken, user }`,
  stores the raw token to `localStorage['accessToken']`.
- `logout()` → removes the token (no server round-trip needed — stateless JWT).
- `getMe()` → `GET /api/auth/me` (shaped by the backend's `MeResponseDto`).

### 3. `src/features/auth/schemas/login.schema.ts` (new)
- Mirror of backend `loginSchema` (trim + lowercase email via `pipe`,
  `password: z.string().min(1)`). `z.infer` type for the form.

### 4. `src/features/auth/pages/LoginPage.tsx` (rewrite)
- Card on cream bg, RHF form: email + password `FormField`s,
  `useForm({ resolver: zodResolver(loginSchema), defaultValues })`.
- On success: store token, `navigate('/')`.
- On `401`: `setError('password', { message })` (inline); on other errors
  (network), `setError('root', …)`.
- `aria-invalid` and error text via the `FormField` wiring.

### 5. `src/features/auth/hooks/useMe.ts` (new)
- `useQuery(['me'], getMe, { enabled: !!token, retry: false })`.
- On error → `logout()` + redirect (via `useEffect` on `isError`).
- Returns `{ user, isLoading }` for `ProtectedRoute`, sidebar, and nav gating.

### 6. `src/components/layout/ProtectedRoute.tsx` (update)
- Drop the `isAuthenticated` prop; call `useMe()` instead:
  - loading → skeleton/spinner (no flash of login),
  - error → `<Navigate to="/login" replace />`,
  - success → children.

### 7. `src/components/layout/AppSidebar.tsx` (update)
- Bottom user block becomes a real menu: avatar, name, "Admin/Staff",
  **Log out** button → `logout()` + navigate. Real name/role from `useMe`.

### 8. `src/routes/AppRoutes.tsx` (update)
- Remove the hardcoded `isAuthenticated={false}`; `ProtectedRoute` is now
  self-checking. `/login` stays public.

### 9. `src/components/ui/*` (via shadcn CLI)
- `npx shadcn@latest add form input button label` — adds `FormField`,
  `Input`, `Button`, `Label` wrappers RHF needs.

## Execution order
1. `src/api/client.ts` + `src/api/auth.ts`.
2. `login.schema.ts` + LoginPage rewrite (RHF form + shadcn components).
3. `useMe` + `ProtectedRoute` rewiring + sidebar logout.
4. Verify (below).

## Verification
```powershell
cd frontend
npm run build     # tsc --noEmit + vite build
npm test          # first spec lands here (LoginPage form validation)
```
Manual smoke:
- Visit `/` → redirects to `/login`.
- Sign in as `admin@store.local` / `admin123` → lands on Overview, sidebar shows Admin.
- Refresh page → still logged in (localStorage), `/me` verified in the network tab.
- Wrong password → inline "Invalid credentials" under password; unknown email → same; inactive user → "User is inactive".
- Log out from sidebar → token removed, back at `/login`.

## Risks / gotchas
- **RHF + dynamic error fields** — `setError('password')` requires the field to be registered (`register`/`Controller`), so the error shows inline.
- **Password `type="password"`** by default; toggle visibility optional.
- **Bearer on every fetch** — the wrapper must read the token *at call time* from localStorage, not from a module-level variable captured at import.
- **401 loop protection** — if `getMe` itself 401s, clearing the token + redirect must not loop back into `useMe` re-querying while logged out; gate with `enabled: !!token`.
- **Mobile** — login card is centered and max-w-sm; no responsiveness changes in this slice.
- **Swagger JSON** — nothing changes on the backend.

## Out of scope (later slices)
- Register / forgot-password / change-password (backend-deferred too)
- Token refresh (none exists — single 24h JWT from Slice 0)
- Product pages (F2) — they arrive on top of this shell
