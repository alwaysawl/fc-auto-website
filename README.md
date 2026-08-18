# FC Auto Export

A modern bilingual (English/French) used car export website built with **Next.js 15** and **Tailwind CSS**.

## Features

- **Bilingual Support** — English and French with language switcher in the header
- **Premium Design** — Black, white, and gold color scheme, mobile-friendly
- **Vehicle Inventory** — Browse vehicles with photos, specs, pricing, and VIN
- **Tier-Based Shipping Calculator** — Shipping prices follow per-vehicle tier tables (not per-unit multiplication)
- **Admin Panel** — Edit shipping prices and vehicle details at `/admin`
- **WhatsApp Integration** — Floating button and contact links (+86 166 7636 4929)

## Pages

| Page | Route |
|------|-------|
| Home | `/en` or `/fr` |
| Inventory | `/en/inventory` |
| Vehicle Detail | `/en/inventory/[id]` |
| Shipping Calculator | `/en/shipping-calculator` |
| About Us | `/en/about` |
| Contact | `/en/contact` |
| Admin Dashboard | `/admin` |
| Admin Shipping | `/admin/shipping` |
| Admin Vehicles | `/admin/vehicles` |

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to `/en`.

## Shipping Tier Pricing

Each vehicle has its own shipping price table. When a customer changes quantity, the total shipping cost is looked up from the tier table:

| Toyota RAV4 | Price |
|-------------|-------|
| 1 vehicle | $1,200 |
| 2 vehicles | $2,200 |
| 3 vehicles | $2,200 |

| Landwind X7 | Price |
|-------------|-------|
| 1 vehicle | $1,100 |
| 2 vehicles | $2,000 |
| 3 vehicles | $2,000 |
| 4 vehicles | $2,000 |

Admins can edit all shipping prices at `/admin/shipping`.

## Data Storage

Vehicle and shipping data is stored in `data/store.json`. The admin panel writes changes directly to this file via API routes.

## Tech Stack

- Next.js 15 (App Router)
- React 19
- Tailwind CSS 3
- TypeScript

## Project Structure

```
src/
├── app/
│   ├── [locale]/          # Localized pages (en, fr)
│   ├── admin/             # Admin panel
│   └── api/               # REST API routes
├── components/            # Reusable UI components
├── lib/                   # Data layer, i18n, types
└── messages/              # Translation files (en.json, fr.json)
data/
└── store.json             # Vehicle & shipping data
```
