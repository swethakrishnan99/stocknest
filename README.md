# StockNest: front-end demo

A front-end demo of StockNest, a simple inventory app for small businesses, built from the
"StockNest — Inventory App Design" canvas. All data is sample data for Maple Street Bakery.
Nothing is sent to a server; changes are saved in your browser (localStorage).

Built with React, TypeScript (strict), React Router, Vite and Tailwind CSS v4. Tested with Vitest and Testing Library.

## Run it
    npm install
    npm run dev        # then open the address it prints (usually http://localhost:5173)

Requires Node 20.19+ (or 22.12+).

`npm run deploy` keeps the previous version's files on GitHub Pages (`--add`): Pages caches index.html for a few
minutes, and a cached page needs its own scripts to still be there. Data saved by older versions is upgraded when it
loads (`src/lib/upgradeSaved.ts`), and any screen error shows a recovery page instead of a blank one.

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

## First run
- A new device opens on Welcome: **Set up my business** (name, type of business, where you keep stock) or
  **Try the demo bakery**. The business type picks starting categories and locations (bakery, shop, salon, home
  business or general); everything can be changed later. A new business starts empty, with a three-step checklist.
- In the demo, a banner offers to set up your own business at any time.

## Accounts and cloud sync (Supabase)
- Sign up, sign in, password reset by email, and optional two-step login with an authenticator app (TOTP).
  Someone who has turned two-step login on can't read or change any data until they've entered a code
  (enforced by the database, not just the app).
- **Local-first sync:** every change is saved on the device first and sent within a couple of seconds; other
  devices' changes are fetched every 30 seconds, when the app is reopened and when the connection comes back.
  Offline work is sent later (`src/lib/cloud/`).
- **Stock counts can't be lost:** the database applies each stock movement to its product's quantity
  (`apply_movement` in `supabase/setup.sql`). Two people recording stock offline on the same product both count,
  and a device can't overwrite a quantity directly. Other edits are last-write-wins per item.
- **Each business is private:** row-level security lets people read and write only businesses they're members of.
  Owners invite people by email; they join when they sign in with that (confirmed) email.
- `supabase/tests/` checks the security rules and the quantity logic on plain Postgres (CI runs them too):
  `DATABASE_URL=postgres://… sh supabase/tests/run.sh`

### One-time Supabase setup
1. SQL Editor → paste `supabase/setup.sql` → Run (safe to run again after updates).
2. Authentication → URL Configuration: Site URL `https://swethakrishnan99.github.io/stocknest/`, and add the same
   address under Redirect URLs (sign-up and password emails link back there). Add `http://localhost:5173/**`
   for local development.
3. Authentication → Multi-Factor: App Authenticator (TOTP) enabled (it is by default).
4. The project URL and publishable key are in `src/lib/cloud/config.ts` (public by design). A different project can be
   used with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Never put the secret key in the app.

## Roles
- Owner, Manager and Staff (`src/lib/permissions.ts`). Staff record stock, count, scan and receive deliveries; Managers
  also add products, move stock, order, see Reports and change settings; Owners also manage the team, backups and
  starting over. Buttons a role can't use are hidden, and Reports explains when it isn't available.
- Settings → You picks who is using a shared device; movements are saved under that person's name.
- Without an account, everything is stored in this browser; Settings → Your data downloads and restores a backup.
  Signed in, roles come from the cloud and each person signs in on their own device.

## Phone app and scanning
- StockNest is an installable app (web app manifest, icons, offline service worker via `vite-plugin-pwa`).
- Scan uses the camera: the browser's built-in barcode detector where there is one, otherwise ZXing
  (`src/lib/useBarcodeCamera.ts`). Add product can scan a barcode into the form. Typing a code still works.

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
- Settings: who's using the device and installing the app; business details and categories (add, rename, remove);
  alerts; suppliers (email, phone, delivery time); team roles; backup, restore and start over
- Alerts (the bell): out and low stock, late purchase orders, and batches near or past their best-before date. Low
  stock can also show as a notification on the device. Yesterday's summary shows on the Dashboard.
- Ordering: Order by supplier puts everything one supplier needs on a single PO. After placing an order you can save
  it as a PDF or open an email to the supplier. Receiving can record a best-before date and batch.
- Product page: photo, Move stock (all of it, or part of it, which lists the product at both locations), Undo for the
  latest movement, and best-before batches you can add and remove
- Add product asks only for name, quantity and unit up front; reorder point, cost, supplier, SKU and barcode are
  under More details
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
