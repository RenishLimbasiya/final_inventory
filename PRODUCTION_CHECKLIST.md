# Vercel demo deployment

This repository is prepared for a public **demo**, with demo login and temporary inventory. It is not a deployment for real business inventory.

## Import into Vercel

1. Sign in at https://vercel.com/new and import `RenishLimbasiya/final_inventory` from GitHub.
2. Use the **Next.js** framework preset, repository root, and **Node.js 24.x**.
3. Keep the checked-in defaults: install `npm ci`, build `npm run build`, and the default Next.js output directory. Do not use a static export or override the output directory.
4. Deploy the `main` branch. Vercel provides HTTPS and a deployment URL. Connected Git deployments update when `main` is pushed.

`vercel.json` selects memory persistence for the hosted demo. No database credentials, authentication provider keys, or `NEXT_PUBLIC_API_URL` are required: requests use same-origin URLs. Do not set `INVENTORY_E2E` on Vercel; that flag is only for the local Playwright server.

## Demo behavior

- Any warehouse name can log in. The cookie is an unsigned demo session, not verified identity or warehouse authorization.
- Inventory is process-local memory. A restart, cold start, new instance or a different function can show fresh seed data. Product mutations are not guaranteed to appear across routes or instances.
- All visitors reaching one instance share its inventory. Warehouse names do not isolate records.
- Do not enter sensitive information or real business stock. JSON file persistence is only for local development and is not a Vercel database.
- Request logs are temporary and may differ between proxy and route-handler processes.

## Release verification

```sh
npm ci
npm run check
npm run build
npm run test:e2e:install
npm run test:e2e
npx playwright show-report
npm audit --omit=dev
```

CI checks lint, TypeScript, regression tests, production build, and browser E2E tests. The E2E workflow uploads its HTML report and failure attachments. Node.js 24 is used locally, in CI and on Vercel.

Release dependency review: Next.js and its ESLint configuration use 16.4.2. The runtime audit (`npm audit --omit=dev`) is clean. The full audit still reports development-only glob-toolchain advisories through ESLint and the shadcn CLI; resolving these currently requires upstream fixes or breaking tool changes. No forced downgrades were applied.

After deployment, check `/login`, log in, open products, record a movement, change theme and use mobile navigation. Temporary data changing between requests is an accepted limitation of this demo.

## Before using real inventory

Replace the memory database with shared transactional storage, implement verified authentication and authorization, isolate warehouses, and provide durable audit logs and backups. These services are intentionally outside the approved demo deployment scope.

Vercel references: https://vercel.com/docs/frameworks/full-stack/nextjs and https://vercel.com/docs/git.
