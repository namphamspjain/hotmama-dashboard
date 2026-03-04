# Cursor migration & project overview

This repository contains the **internal Finance & Operations Dashboard SPA for EtiGo**.
It was originally created with **Lovable.dev**, but the codebase itself is a standard Vite + React + TypeScript application that can be developed locally in Cursor (or any IDE) without Lovable.

All of the steps below are designed to:

- Give you a concise mental model of the project.
- Show how to run it locally for day‑to‑day development.
- Explain how to disconnect any Lovable.dev-specific dependencies and workflows.

---

## 1. Stack at a glance

- **Framework**: React 18 SPA (no Next.js, no server-side rendering).
- **Bundler / Dev server**: Vite 5.
- **Language**: TypeScript (`"type": "module"` in `package.json`).
- **Routing**: React Router DOM (`BrowserRouter` in `src/App.tsx`).
- **State / data fetching**: `@tanstack/react-query`.
- **UI**: shadcn-ui + Radix UI primitives + Tailwind CSS.
- **Testing**: Vitest + Testing Library (`vitest.config.ts`, `src/test/*`).
- **Linting**: ESLint 9 + TypeScript + React plugins.
- **Package manager**: npm (repo includes `package-lock.json` and `npm run ...` scripts).

At the time of this migration, there is **no backend code in this repo**; all data is mocked on the client, and future EtiGo/Postgres integration will be added separately.

---

## 2. Project layout (high level)

Key files and directories:

- **`src/main.tsx`**
  - Vite/React entry point; mounts the React app into the DOM and imports global styles.

- **`src/App.tsx`**
  - Top-level composition of providers and routes:
    - `BrowserRouter` and `Routes`/`Route` from React Router.
    - `AuthProvider` (auth/RBAC context).
    - `ThemeProvider` (light/dark and UI theme).
    - `QueryClientProvider` (React Query).
    - Layout & shell via `AppLayout` + `ProtectedRoute`.

- **`src/pages/`**
  - Route-level pages:
    - `Login.tsx`
    - `Dashboard.tsx`
    - `Orders.tsx`
    - `Inventory.tsx`
    - `Sales.tsx`
    - `Payments.tsx`
    - `Settings.tsx`
    - `NotFound.tsx`

- **`src/components/`**
  - Reusable components (navigation, layout, widgets, etc.).
  - `src/components/ui/` holds shadcn-style primitive components (buttons, inputs, dialogs, etc.).

- **`src/contexts/`**
  - React context providers (e.g. `AuthContext`, `ThemeContext`) used at the `App` level.

- **`src/data/`**
  - Mock data and any static configuration used by the dashboards and tables.

- **Tooling / config files**
  - `vite.config.ts` — Vite configuration (port, aliases, plugins, including the Lovable plugin).
  - `vitest.config.ts` — Vitest configuration.
  - `tailwind.config.*` and `postcss.config.*` — Tailwind and PostCSS configuration (standard Vite + Tailwind setup).
  - `index.css` — global Tailwind styles and app-wide CSS.

---

## 3. Running the app locally (without Lovable)

These are the canonical steps to get the app running on your machine in Cursor or any local IDE.

### 3.1 Prerequisites

- **Node.js**: Recommended **Node 20 LTS** (or newer).
  - If you use `nvm`, something like:

```bash
nvm install 20
nvm use 20
```

- **npm**: Comes bundled with Node. The repo is set up for npm (has `package-lock.json`).

### 3.2 Clone and install

From a terminal:

```bash
git clone <YOUR_GIT_URL> hotmama-dashboard
cd hotmama-dashboard

npm install
```

This installs all frontend dependencies (React, Vite, shadcn, Tailwind, Vitest, etc.).

### 3.3 Start the dev server

Run:

```bash
npm run dev
```

By default, Vite is configured in `vite.config.ts` to:

- Listen on host `::` (all interfaces).
- Use port **8080**.

So you can open:

- `http://localhost:8080/` — main dashboard (protected route; redirects to `/login` if unauthenticated).
- `http://localhost:8080/login` — login page.
- Other internal routes such as `/orders`, `/inventory`, `/sales`, `/payments`, `/settings`.

### 3.4 Linting and tests

For linting:

```bash
npm run lint
```

For tests:

```bash
npm test         # one-off test run (Vitest)
npm run test:watch
```

These are all standard Vite/React workflows; nothing here requires Lovable.

---

## 4. Disconnecting from Lovable.dev

Lovable.dev touched this repo in three main ways:

1. **Documentation**: `README.md` with Lovable-specific instructions and URLs.
2. **Project planning**: `.lovable/plan.md` with a high-level build plan.
3. **Dev tooling**: `lovable-tagger` dev dependency and the `componentTagger` plugin in `vite.config.ts`.

The **goal of “disconnecting”** is to ensure:

- The project builds and runs locally and in CI/CD with **no dependency on Lovable services**.
- The developer workflow is fully standard (npm + Vite + React).

You can keep `.lovable/plan.md` around as documentation if you like; it is not required by the runtime.

### 4.1 Step 1 – Remove the Lovable Vite plugin

Open `vite.config.ts`. You’ll see something like:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
```

Update it to remove the Lovable plugin and import. A minimal Vite config is:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

This removes all runtime coupling to `lovable-tagger`. Vite will run and build exactly the same app.

### 4.2 Step 2 – Remove the Lovable dev dependency

In `package.json`, under `devDependencies`, you currently have:

```json
"lovable-tagger": "^1.1.13"
```

You can safely uninstall it:

```bash
npm uninstall lovable-tagger
```

This updates `package.json` and `package-lock.json` to remove the package completely.

### 4.3 Step 3 – Clean up Lovable-specific documentation (optional but recommended)

None of these files are required to run the app, but they may be confusing once you move fully into Cursor:

- **`README.md`**:
  - Currently describes how to use Lovable, how to publish via Lovable, and has a Lovable project URL.
  - Recommended change:
    - Either replace this with a Cursor-focused README.
    - Or add a note at the top saying the project was originally generated by Lovable but is now maintained locally, and that the authoritative instructions live in `cursor-migration.md`.

- **`.lovable/plan.md`**:
  - This is a planning document only.
  - Options:
    - Keep it as historical design documentation.
    - Or delete the `.lovable` directory if you want a clean, Lovable-free repo.

### 4.4 Step 4 – Double-check there are no remaining Lovable references

From the repo root, run:

```bash
rg "lovable" .
```

You should only see hits where you intentionally kept documentation. There should be **no imports or runtime usage** of `lovable-tagger` or any other Lovable SDK.

At this point, the app is 100% standard Vite + React and has no runtime dependency on Lovable.

---

## 5. Verifying the migration

Once you have removed the Lovable plugin and dependency:

1. **Re-install / verify dependencies**

   ```bash
   npm install
   ```

   This ensures `node_modules` reflects the new `package.json` / lockfile.

2. **Start the dev server**

   ```bash
   npm run dev
   ```

   - Confirm the app loads at `http://localhost:8080/`.
   - Navigate through:
     - `/login`
     - `/`
     - `/orders`
     - `/inventory`
     - `/sales`
     - `/payments`
     - `/settings`

3. **Run lint & tests**

   ```bash
   npm run lint
   npm test
   ```

   - Fix any lint or type issues as part of your normal workflow.

If all of the above succeed, the project is fully decoupled from Lovable and ready for long-term maintenance in Cursor.

---

## 6. Notes for future EtiGo integration

The current codebase uses mocked data and is frontend-only. As you integrate it with EtiGo’s existing PostgreSQL database and backend services, keep these project rules in mind:

- **Amounts in centavos**:
  - Store and compute all financial values as integers in centavos.
  - Convert to PHP only at the display layer.

- **Revenue logic**:
  - EtiGo earns a **10% convenience fee** on every ticket.
  - **Digital payments**: EtiGo collects 100%, owes the operator 90%.
  - **Cash bookings**: Operator collects 100%, owes EtiGo 10%.
  - All reports and settlements should reflect this two-direction payback model.

- **Audit trails and versioning**:
  - Every financial mutation must create an audit-trail entry.
  - Changes should be saved as new versions to allow rollbacks.

- **RBAC**:
  - Enforce role-based access control (Admin, Finance Manager, Viewer) on the **server side** for any new APIs.
  - Do not rely solely on client-side checks in React.

Those rules don’t affect the current mocked frontend, but they are critical once you hook this dashboard into EtiGo’s real production data.

