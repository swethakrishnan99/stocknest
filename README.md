# StockNest: front-end demo

A front-end demo of StockNest, a simple inventory app for small businesses, built from the
"StockNest — Inventory App Design" canvas. All data is sample data for Maple Street Bakery.
Nothing is sent, saved or connected to a real backend.

Built with React, Vite and Tailwind CSS v4.

## Run it
    npm install
    npm run dev        # then open the address it prints (usually http://localhost:5173)

Requires Node 20.19+ (or 22.12+).

## Screens
- Dashboard: summary cards, needs reordering, recent activity, stock value by category. Searching jumps to Products.
- Products: table with working search (name or SKU), category chips and location filter
- Product detail: key numbers, Update stock form (stock in, stock out, set count), batches and stock history
- Scan and count: barcode scanner view with a quantity sheet (opened from Scan on desktop or the phone tab bar)
- Stock movements: every stock in, stock out and count grouped by day, with type, location and text filters and CSV export
- Locations: one card per location with product count, value and low or out-of-stock items; View products opens Products filtered to it
- Reports: units in vs out per week, most used items, waste, a reorder list with suggested quantities, and CSV downloads
- Settings: business details (the name shows in the sidebar and phone Home), alert switches, team roles and plan usage
- Phone (below 768 px): Home replaces the desktop dashboard, a bottom tab bar replaces the sidebar, and Home links to Movements, Locations and Settings

## Things to know
- Colours and fonts live as tokens in `src/index.css` (`@theme`); sample data is in `src/lib/sampleData.js`.
- Navigation uses simple in-page state, not a router.
- Only the flour product has a detail page, so every product row opens it.
- Stock movements, Locations, Reports and Settings were not in the original design; they follow its visual style.
- Saving a movement (on the detail page or the scanner) updates the flour's on-hand count, its history and the
  Stock movements list in memory. Settings changes are kept in memory too. Everything resets when the page reloads.
- Add product (Dashboard or Products) opens a pop-up, a bottom sheet on phones. It checks the fields, suggests the next
  free SKU for the category, previews status and value, and adds the product to the top of Products and the
  inventory CSV.
- On the Dashboard, the Low stock and Out of stock cards (and View all) open Products filtered by stock status.
  Reorder opens a purchase-order pop-up: supplier with lead time, suggested quantity (back up to twice the reorder
  point), delivery date and estimated cost. Ordered items show their PO on the Dashboard and phone Home.
  Orders are kept in memory only; suppliers, prices and lead times are sample values.
- The CSV downloads work. Add location, Invite someone and See plans are buttons only.
