# StockNest: front-end demo

A front-end demo of StockNest, a simple inventory app for small businesses, built from the
"StockNest — Inventory App Design" canvas. All data is sample data for Maple Street Bakery.
Nothing is sent to a server; changes are saved in your browser (localStorage).

Built with React, TypeScript (strict), React Router, Vite and Tailwind CSS v4. Tested with Vitest and Testing Library.

## Run it
    npm install
    npm run dev        # then open the address it prints (usually http://localhost:5173)

Requires Node 20.19+ (or 22.12+).

## Check it
    npm test           # unit and component tests (Vitest, jsdom)
    npm run typecheck  # TypeScript, strict mode
    npm run lint       # ESLint with typescript-eslint
    npm run check      # all three

- Tests sit next to the code they cover (`*.test.ts(x)`). They run on a fixed date (Friday, Nov 6 2026,
  10:00; see `src/test/setup.ts`), so the generated sample and every date are the same on each run.
- What's covered: date helpers, CSV parsing and import checks, barcode encoding, the inventory and report
  maths, the sample history (it must add up for every product), the inventory store (movements, orders,
  receiving, delete and undo, saving to localStorage), and the main flows through the real screens.
- GitHub Actions runs lint, type-check, tests and the build on every pull request (`.github/workflows/ci.yml`).

## Screens
- Dashboard: summary cards, needs reordering, recent activity, stock value by category. The search box lists matching
  products as you type (name, SKU or barcode); arrow keys and Enter open one, or "See all" opens Products filtered.
- Products: table with working search (name or SKU), category chips and location filter
- Product detail: key numbers, Update stock form (stock in, stock out, set count), batches and stock history
- Scan and count: barcode scanner view with a quantity sheet (opened from Scan on desktop or the phone tab bar)
- Stock movements: every stock in, stock out and count grouped by day, with type, location and text filters and CSV export (a week at a time, with "Show the 7 days before")
- Locations: one card per location with product count, value and low or out-of-stock items; View products opens Products filtered to it.
  Add location opens a pop-up (name and optional description); new locations are saved and appear in every location list
- Reports: pick the last 7 days, 4 weeks or 6 weeks. Stock in and out (value at cost) per day or week, most used and
  most wasted products, total waste, a reorder list with suggested quantities, and CSV downloads. All worked out from
  Stock movements, so a movement you record shows up straight away
- Settings: business details (the name shows in the sidebar and phone Home), alert switches, team roles and plan usage
- Phone (below 768 px): Home (with the same live product search) replaces the desktop dashboard, a bottom tab bar replaces the sidebar, and Home links to Movements, Locations and Settings

## How the data works
- One list of products and one list of stock movements are the single source of truth
  (`src/state/InventoryProvider.tsx`). Status (in stock, low, out), stock value, the dashboard numbers,
  "Needs reordering", recent activity, value by category and the location cards are all worked out
  from them in `src/lib/inventory.ts`, so every screen always agrees.
- Saving a movement (on any product's page or in the scanner) changes that product's quantity and adds the
  movement to its history and to Stock movements.
- Products, movements, locations, purchase orders and business settings are saved in localStorage, so they survive a
  refresh. Settings → Reset demo data restores the original sample data.
- The sample is Maple Street Bakery: 51 products in 5 locations and six weeks of movements (deliveries with PO numbers,
  baking, sales, production use, waste and weekly counts; closed Mondays). It is generated in `src/lib/sampleHistory.ts`
  by walking back from today's quantities, so the history always adds up and always ends today.
- Every movement has a date and time (`at`) and the unit cost at the time, so reports value it correctly even if the
  price changes later. Report maths is in `src/lib/reports.ts`.

## Navigation
- Every screen has its own address (React Router with `HashRouter`, which works on GitHub Pages):
  `#/products`, `#/products/ING-0012`, `#/products?status=low`, `#/movements`, `#/locations`,
  `#/reports`, `#/settings`, `#/scan?id=ING-0012`. Refresh, Back and shared links all work.

## Things to know
- Colours and fonts live as tokens in `src/index.css` (`@theme`); shared lists are in `src/lib/sampleData.ts` and the data shapes in `src/types.ts`.
- Every product has a detail page; only flour has batch data in the sample. Stock history shows 20 movements at a time.
- Stock movements, Locations, Reports and Settings were not in the original design; they follow its visual style.
- Add product (Dashboard or Products) opens a pop-up, a bottom sheet on phones. It checks the fields, suggests the next
  free SKU for the category, previews status and value, and adds the product to the top of Products and the
  inventory CSV.
- On the Dashboard, the Low stock and Out of stock cards (and View all) open Products filtered by stock status.
  Reorder opens a purchase-order pop-up: supplier with lead time, suggested quantity (back up to twice the reorder
  point), delivery date and estimated cost. Ordered items show their PO on the Dashboard and phone Home.
  Suppliers, prices and lead times are sample values. Any product can be reordered from its page too.
- Open orders: the Dashboard's On order card (or Products → Status → On order) lists everything ordered but not
  received yet, with the PO number, quantity, due date and a Receive button on each row.
- Receiving: Receive (on an ordered Dashboard row or the product's "On order" banner) asks how many arrived, warns
  when it is short or over the order, adds a Stock in movement ("Supplier delivery", with the PO number) and closes the
  order. The same pop-up can cancel the order instead. PO numbers keep counting up and are never reused.
- Deleting: Edit product → Delete product asks to confirm, removes the product and any open order, and shows an Undo
  toast. Past movements stay in Stock movements.
- Products: Export saves the product list as Excel (.xlsx), CSV or PDF; with a filter on it asks whether to export
  just the matching products or all of them. Import reads Excel (.xlsx) or CSV in the same columns, checks every row,
  shows what will be added, updated or skipped, and records changed quantities as counts. 10 products per page.
  The Excel and PDF libraries (write-excel-file, read-excel-file, jsPDF) load only when used.
- Product detail: Edit product (quantity changes only through Update stock), Print label (Code 128 barcode of the
  SKU, 2.25 × 1.25 in labels, any number of copies) and Export of that product's history.
- Scanner: Type a code instead finds a product by SKU or barcode.
- Phone Home: the bell opens alerts for low and out-of-stock items and purchase orders on the way.
- Settings: Invite someone adds a team member (no email is sent in the demo; they show as "Invite pending").
