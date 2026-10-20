# Warehouse Inventory

Inventory dashboard built with Next.js 16.2.2, React 19, TypeScript, Redux Toolkit, and Tailwind CSS 4. Monetary values use integer cents; quantities use whole units.

## Local setup

Use Node.js 24 LTS and npm:

```sh
npm ci
npm run dev
```

Open http://localhost:3000/login to start a demo session with any warehouse name.

```sh
npm run check
npm run build
npm start
```

On Windows PowerShell with restricted script execution, use `npm.cmd`.

## Production limitations

This is a demo and needs further infrastructure before use with real business inventory.

- Development stores data in `data/inventory-db.json`. Back up this file. File storage supports one local process and does not provide transactional recovery or coordination between server instances.
- Production defaults to memory storage: data disappears on restart and differs between instances. Use `INVENTORY_PERSISTENCE_MODE=file` only on one server with a persistent writable disk. Serverless hosting needs a shared transactional database.
- Login accepts any warehouse name and issues an unsigned demo cookie. It does not verify identity or isolate warehouses. APIs and request logs need server-side authentication and authorization before public use.
- Request logs are temporary process memory. Proxy and handlers may run separately; use a shared logging service for a reliable audit trail.

## Checks

`npm run check` runs lint, TypeScript, and regression tests for input validation, protected fields, rejected stock movements, and keeping an emptied inventory empty. GitHub Actions also runs the production build.

Generated Next.js output is ignored. Keep local inventory data and environment secrets out of source changes.
