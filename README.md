# PharmPulse — Production-Ready, Offline-First Pharmacy Management & POS System

<p align="center">
  <img src="public/favicon.svg" width="96" height="96" alt="PharmPulse Logo" />
</p>

PharmPulse is an enterprise-grade, offline-first pharmacy management and point-of-sale (POS) web application designed for high-throughput dispensary counters, multi-branch operations, and remote supervisory monitoring. 

Engineered with local-first data resilience, PharmPulse ensures zero downtime during internet outages: transactions, stock depletions, and batch tracking execute instantly against **IndexedDB (via Dexie.js)**, while a background **Two-Way Sync Engine** reliably synchronizes outbox mutations and pulls incremental updates from a **remote Supabase PostgreSQL backend**.

---

## 🌟 Key Capabilities & Modules

### 1. Licensing & Store Activation Gate
- **Device & Terminal Activation**: Initial launch requires store activation with Store Name, Owner Contact, and License Key.
- **Hardware & Device Fingerprinting**: Deterministic terminal fingerprint generated using device hardware concurrency, screen color depth, canvas metrics, and Web Crypto SHA-256 signatures.
- **7-Day Rolling Offline Grace Window**: Allows uninterrupted offline dispensing for up to 7 consecutive days before requiring an online ping to revalidate authorization.
- **License Status Telemetry**: Header badge displays real-time activation status, plan tier (Enterprise, Standard, Clinic), and offline grace countdown.

### 2. High-Speed Counter POS (Desktop-Optimized Dual Panel)
- **Fast Search**: Instant keystroke search across Brand Name, Generic Active Formulation, Barcode (EAN/UPC), and SKU with category pills.
- **Keyboard Shortcuts for Speed**:
  - `F2`: Start New Sale / Reset Cart
  - `F4`: Trigger Tender Checkout & Payment
  - `F8`: Park / Hold Current Sale
  - `F9`: Recall Parked / Held Sales
  - `Enter`: Add highlighted catalog match directly to cart
  - `Esc`: Close open modal dialogs / cancel
- **FEFO (First Expiring, First Out) Auto-Suggestion**: Automatically detects multiple batches of a drug and recommends the batch closest to expiration, preventing pharmaceutical spoilage.
- **Packaging Unit Conversion**: Sell full manufacturer boxes or break them down into loose strips, tablets, sachets, or ampoules with automatic fractional batch stock deduction.
- **Prescription Only Medicine (POM) Audit Compliance**: Flags controlled drugs and prompts for Prescribing Doctor, Medical Reg No, and Patient identification for regulatory recordkeeping.
- **Multi-Tender Payment Checkout**:
  - **Cash**: Preset denomination buttons (`1,000`, `5,000`, `10,000`, `20,000`, `50,000`) with live change calculation.
  - **Mobile Money**: M-Pesa, Tigo Pesa, Airtel Money, MTN with customer phone number and transaction reference logging.
  - **Debit / Credit Card**: Visa, Mastercard, with POS terminal approval auth code.
  - **Store Credit / Customer Ledger**: Records customer name, phone, promised due date, and debt notes.

### 3. Inventory & FEFO Expiry Control
- **Formulary Management**: Tracks Brand Name, Generic Formulation, Dosage Form (tablets, capsules, syrups, suspensions, ampoules, vials, inhalers, creams, drops), Pack Size, Stock on Hand, Reorder Threshold, Cost Price, and Selling Price.
- **Batch Expiry Color Codes**:
  - 🔴 **Expired (< 0 days)**: Red warning banner with immediate quarantine trigger.
  - 🟠 **Critical (≤ 30 days)**: Orange warning with FEFO fast-dispense priority.
  - 🟡 **Warning (≤ 90 days)**: Amber warning for near-term expiration monitoring.
  - 🟢 **Safe (> 90 days)**: Emerald badge for stable shelf life.
- **Stock Adjustment & Incident Logging**: Formally log adjustments for damage/breakage, theft/unaccounted shortage, audit count reconciliation, supplier recalls, and restocks with attendant signatures.

### 4. Owner Remote Supervision Hub
- **Real-Time KPI Cards**:
  - Today's Gross Sales Revenue
  - Estimated Gross Profit & Profit Margin %
  - Cash-at-Hand in Drawer vs. Mobile Money balance
  - Low Stock Alerts & Out of Stock count
  - Imminent Expirations Count (≤ 90 days)
- **Hourly Sales Velocity Curve**: Recharts interactive graph visualizing hourly transaction volume and customer traffic.
- **Top 10 Fastest-Moving Drugs**: Ranked by unit sales volume and revenue generation.
- **Operational Audit Trail**: Real-time event stream logging which attendant completed each sale, updated stock, or adjusted prices with timestamps.
- **Remote Supervisory Price Editing**: Adjust drug pricing on the fly directly from the hub.

### 5. Printing & Invoice Generation
- **80mm Thermal Receipt**: Compact thermal format (`font-mono`) with pharmacy header, tax registration, cashier name, patient reference, itemized table, tender breakdown, barcode, and regulatory notices.
- **A4 Medical Invoice**: Formal dispensary tax invoice with clinic reference, prescriber details, official dispensary stamp box, and pharmacist signature area.
- **Print Isolation**: CSS print media rules isolate `#thermal-receipt-print` and `#a4-invoice-print`, hiding all UI chrome.

### 6. Two-Way Local-First Sync Engine
- **Local Writes First**: All reads and writes target local IndexedDB tables immediately.
- **Outbox Queue Pattern**: Writes enqueue an entry in `sync_outbox` with table, action (`INSERT`, `UPDATE`, `DELETE`), and JSON payload.
- **Online/Offline Monitoring**: Automatically reacts to `navigator.onLine` and `window` network events.
- **Incremental Cloud Pull**: When connected to Supabase, pulls remote changes where `updated_at > last_sync_timestamp`.
- **Sync Badge**:
  - 🟢 **Synced**: All local changes synchronized.
  - 🟡 **Pending / Offline**: Device offline or outbox queue has records awaiting push.
  - 🔴 **Error**: Sync error with retry button and error details inspector.

### 7. Progressive Web App (PWA) Ready
- Configured with `manifest.json`, medical cross icons, and service worker (`public/sw.js`) for static asset caching, offline fallback, and installability onto Windows Desktop, macOS, Android, and iOS.

---

## 🏗️ Technical Stack

- **Frontend**: React 19, TypeScript
- **Bundler & Tooling**: Vite 8, `@tailwindcss/vite`
- **Styling**: Tailwind CSS v4, Lucide React
- **Local Database**: Dexie.js 4 (IndexedDB wrapper with `dexie-react-hooks`)
- **Remote Cloud Backend**: Supabase JS Client (`@supabase/supabase-js`)
- **Analytics & Visualizations**: Recharts
- **Micro-Interactions**: Canvas Confetti

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js 18+ (tested on v22)
- npm, pnpm, or yarn

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/Noldy22/PharmPulse.git
cd PharmPulse

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

### 3. Build for Production
```bash
npm run build
npm run preview
```

---

## 🔑 Demo Activation Keys

For instant testing and evaluation, the activation gate supports the following built-in keys:

| License Key | Plan Tier | Suggested Dispensary |
| :--- | :--- | :--- |
| `PHARM-2026-ALPHA-9921` | Enterprise | AuraCare Central Pharmacy |
| `PHARM-COMMUNITY-7734` | Standard | St. Jude Community Chemists |
| `PHARM-CLINIC-PRO-1029` | Enterprise | Amani Medical Dispensary |

---

## 🗄️ Database Architecture & Supabase SQL Migration

A complete PostgreSQL schema with compound indexes and Row-Level Security (RLS) policies is provided in `supabase/schema.sql`.

### Core Tables:
1. `store_licenses`: License keys, tenant identification, hardware fingerprints, offline grace windows.
2. `products`: Brand name, generic formulation, SKU, barcode, dosage form, pack sizes, buying/selling prices, POM status.
3. `batches`: FEFO tracking, batch numbers, expiration dates, stock on hand, quarantine status.
4. `sales`: Multi-tender checkout records, receipt numbers, totals, profits, patient and doctor references.
5. `sale_items`: Itemized sales lines with batch number, quantity, unit type, and line prices.
6. `stock_adjustments`: Incident logs for damage, loss, theft, count reconciliation, and supplier returns.
7. `audit_logs`: Operational activity history with attendant signatures and timestamps.

To connect your Supabase project:
1. Run `supabase/schema.sql` in the Supabase SQL Editor.
2. Open **Settings > Remote Supabase Sync** in the PharmPulse app.
3. Paste your **Supabase URL** and **Public Anon Key**, then click **Test Remote Connection**.

---

## ⌨️ Keyboard Shortcuts Reference

| Shortcut | Description |
| :--- | :--- |
| `F2` | New Sale / Reset Cart |
| `F4` | Open Tender Checkout & Pay |
| `F8` | Park / Hold Current Sale |
| `F9` | Recall Parked / Held Sales |
| `Enter` | Add Top Catalog Search Result to Cart |
| `Esc` | Close Open Modals / Dialogs |

---

## 📄 License
MIT License. Developed for modern pharmaceutical dispensaries and community healthcare facilities.
