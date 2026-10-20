# Warehouse Inventory

Inventory dashboard built with Next.js 16, React 19, TypeScript, Redux Toolkit, and Tailwind CSS 4. Monetary values use integer cents; quantities use whole units.

## Local setup

Use Node.js 24 LTS and npm:

```sh
npm ci
npm run dev
```

Open http://localhost:3000/login to start a demo session with any warehouse name. The dashboard is at `/`; existing `/dashboard` links redirect there.

```sh
npm run check
npm run build
npm start
```

On Windows PowerShell with restricted script execution, use `npm.cmd`.

`npm ci` automatically applies the React 19 compatibility fix for `next-themes` 0.4.6. It preserves the server's first-paint theme script and prevents client remount warnings. When upgrading `next-themes`, review `scripts/patch-next-themes.cjs` against [the upstream fix](https://github.com/pacocoursey/next-themes/pull/386).

## Production limitations

This is a demo and needs further infrastructure before use with real business inventory.

- Development stores data in `data/inventory-db.json`. This file is created automatically on first run and ignored by Git. Back it up separately. File storage supports one local process and does not provide transactional recovery or coordination between server instances.
- Production defaults to memory storage: data disappears on restart and differs between instances. Use `INVENTORY_PERSISTENCE_MODE=file` only on one server with a persistent writable disk. Serverless hosting needs a shared transactional database.
- Login accepts any warehouse name and issues an unsigned demo cookie. Pages and inventory APIs require the demo cookie, but it does not verify identity or isolate warehouses. Replace demo sessions with real authentication and authorization before public use.
- Request logs are temporary process memory. Proxy and handlers may run separately; use a shared logging service for a reliable audit trail.

## Vercel demo deployment

Import `RenishLimbasiya/final_inventory` into Vercel with the **Next.js** preset and **Node.js 24.x**. The checked-in `vercel.json` uses `npm ci`, `npm run build`, and memory-only inventory. Keep the default Next.js output directory; no environment secrets or database setup are required for this demo. Do not set `INVENTORY_E2E` in Vercel.

This deployment uses demo login and shared, temporary inventory. Different functions or instances may show different data, and changes can disappear on restart. See [the deployment guide](PRODUCTION_CHECKLIST.md) for setup, smoke checks, and the remaining requirements for real business use.

## Checks

`npm run check` runs lint, TypeScript, and regression tests covering input validation, stock updates, session gates, safe redirects, inventory statistics, and failed saves. GitHub Actions also runs the production build.

Generated Next.js output is ignored. Keep local inventory data and environment secrets out of source changes.

## End-to-end tests

One-time browser installation after `npm ci`:

```sh
npm run test:e2e:install
```

Run every Playwright test, then open the latest HTML report:

```sh
npm run test:e2e
npx playwright show-report
```

`npm run test:e2e:report` also opens the report. The Playwright command is `show-report`, rather than `report`. Every run replaces `playwright-report/` with the current results, including failure screenshots, videos and traces in `test-results/`. Reports do not open automatically, so failed runs finish normally in terminals and CI.

The runner builds production code into `.next-e2e/`, starts a dedicated server at `http://127.0.0.1:3100`, and stops it after the tests. Keep port 3100 free. It sets `INVENTORY_E2E=1`, `INVENTORY_PERSISTENCE_MODE=memory`, and `NODE_ENV=production` only in the test server process. No `.env.e2e` file or manual server startup is needed; local inventory files are never loaded or written. An existing server is never reused. Tests run with one worker because the demo inventory is shared, and feature tests reset inventory using authenticated APIs before each test. Browser cookies and local storage are isolated per test.

Use `npm run test:e2e:headed` to watch Chromium, or `npm run test:e2e:ui` for the interactive runner. On Windows with restricted script execution use `npm.cmd` / `npx.cmd`. CI installs Chromium with `npx playwright install --with-deps chromium`.

See [the feature and coverage map](tests/e2e/FEATURES.md) for implementation entry points and coverage scope.
