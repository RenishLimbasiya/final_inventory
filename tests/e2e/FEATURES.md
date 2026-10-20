# Feature inventory and E2E coverage

Discovered by searching routes, forms, navigation, Redux thunks, hooks, context and API handlers before writing tests.

| Feature | How it works / implementation | Coverage |
| --- | --- | --- |
| Demo login | `app/login/page.tsx` posts warehouse name to `/api/auth/login`; HttpOnly cookie gates pages/APIs in `proxy.ts` | Named/default login, destination/query preservation, unsafe redirect fallback, failure, logout, anonymous page/API access |
| Dashboard | `app/page.tsx` reads shared database; `lib/inventory-stats.ts` computes totals; Recharts renders category and top-value charts | Totals before/after movement, chart render, empty state, recent history pagination, legacy `/dashboard` redirect |
| Products | `app/products/page.tsx`, add/detail routes, `store/productSlice.ts`, product API handlers | Create/read/update/delete, cancellation, cascade deletion, missing product, validation and failed save/list |
| Product filters | `components/ProductFilter.tsx` updates URL; API filters name/SKU, category, dollar price ranges, low stock and sorts | Search/SKU, category, min/max price, low stock, reset, reload URL persistence, empty results, API sorting/combined filters/inactive records |
| Stock transactions | `components/StockMovementForm.tsx`, `hooks/useStockMovement.ts`, movement API and `lib/db.ts` | Browser restock/sale/return/adjustment, preview, notes, history, persisted quantities, oversell prevention, failed request, API atomic validation |
| Dedicated recording | `app/movements/add/page.tsx`, `components/StockMovementRecordForm.tsx` | Product selection/change, preselected restock deep link, submission, empty product list |
| Movement history | `app/movements/page.tsx`, `components/PaginatedMovementList.tsx` | Product history link/filter, page boundaries, next/previous, empty history, API type/product/limit filters |
| Alerts | `app/alerts/page.tsx`, `components/layout/AlertBadge.tsx`, Redux products | Low/out-of-stock products, healthy state, restock action and removal after replenishment |
| Warehouse preferences | `context/WarehouseContext.tsx` loads local storage and formats integer cents | Login warehouse persistence, stored warehouse/currency restoration, INR formatting |
| Theme | `components/ThemeToggleButton.tsx` and next-themes | Toggle and persistence on reload |
| Responsive navigation | `components/layout/DashboardLayout.tsx` and Sidebar | Mobile drawer open, navigation and auto-close |
| API statistics/logs | `/api/movements/stats`, `/api/admin/logs` | Exact inventory totals, authentication, log response/filter contract |

The default browser is desktop Chromium; the mobile test changes viewport to 390 × 844. This is functional coverage, not exhaustive combinations, visual regression, cross-browser certification or real authentication testing. Currency and threshold have no settings UI; currency persistence is exercised through its existing local-storage interface. Request logs are process-local and may be empty across proxy/handler bundles, so the suite checks their contract without assuming a shared audit store.

Observed limitation: the add-product browser form enforces maximum stock ≥ minimum stock, while the product API validates each field individually and currently accepts an inverted range. The suite covers that relationship at the browser form where it is enforced.
