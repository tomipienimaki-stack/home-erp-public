# Pantry + Shopping List Module — Technical Specification

## Context

This module is part of a personal Home ERP application. Stack: NestJS (backend), React + Vite (frontend), Supabase (Postgres + Auth). Single user. The module is self-contained and has no dependencies on the financial modules (finance tracker, portfolio, conviction).

---

## Core Concept

Two linked domains:

- **Pantry** — what is currently at home (inventory)
- **Shopping List** — what needs to be bought

The key automation: when a pantry item's quantity drops to or below its minimum threshold, it is automatically added to the shopping list. When a shopping list item is marked as bought, the pantry quantity is updated accordingly.

---

## Data Model

### `pantry_items`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| name | text | e.g. "Maito" |
| category | text | enum (see below) |
| current_quantity | numeric | Current amount at home |
| unit | text | enum: kpl, l, dl, kg, g, pkt, prk, tlk |
| min_threshold | numeric | Auto-add to shopping list when current_quantity <= this |
| preferred_store | text | nullable, e.g. "K-Market", "Lidl" |
| notes | text | nullable |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**Categories:** maitotuotteet, lihat ja kala, kasvikset ja hedelmät, kuivatuotteet, säilykkeet, pakasteet, juomat, hygienia ja siisteys, taloustarvikkeet, muu

### `shopping_list_items`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| pantry_item_id | uuid | FK to pantry_items, nullable (allows ad hoc items) |
| name | text | Copied from pantry item or entered manually |
| quantity_to_buy | numeric | |
| unit | text | |
| category | text | Copied from pantry item or set manually |
| store | text | nullable |
| status | text | enum: pending, bought |
| auto_generated | boolean | true if created by threshold trigger |
| bought_at | timestamptz | nullable, set when status → bought |
| created_at | timestamptz | |

---

## Backend — NestJS

### Modules

#### PantryModule

**Endpoints:**

```
GET    /pantry                     — List all pantry items
POST   /pantry                     — Create pantry item
GET    /pantry/:id                 — Get single item
PATCH  /pantry/:id                 — Update item (including quantity)
DELETE /pantry/:id                 — Delete item
POST   /pantry/:id/consume         — Decrement quantity by given amount
POST   /pantry/check-thresholds    — Manually trigger threshold check (also runs automatically)
```

**Threshold logic (run on every quantity update and on a daily schedule):**
- For each pantry item where `current_quantity <= min_threshold`:
  - Check if a `pending` shopping list item already exists for this pantry_item_id
  - If not, create one automatically with `auto_generated: true` and `quantity_to_buy` set to a sensible default (e.g. enough to refill to 2× threshold)

#### ShoppingListModule

**Endpoints:**

```
GET    /shopping-list              — List all pending items (grouped by store, then category)
GET    /shopping-list/all          — List all items including bought (for history)
POST   /shopping-list              — Add ad hoc item manually
PATCH  /shopping-list/:id          — Update item
DELETE /shopping-list/:id          — Delete item
POST   /shopping-list/:id/bought   — Mark as bought (body: { quantity_bought: number })
POST   /shopping-list/clear-bought — Remove all bought items from list
```

**When marking an item as bought:**
- Set `status: bought`, set `bought_at`
- If `pantry_item_id` is set: increment `pantry_items.current_quantity` by `quantity_bought`
- Update `pantry_items.updated_at`

---

## Frontend — React + Vite

### Views

#### 1. Pantry View (`/pantry`)

- Grid/list of all pantry items
- Filter by category (tab or dropdown)
- Each item card shows: name, current quantity + unit, threshold indicator (green/yellow/red)
- Quick actions on card: **+** / **−** buttons to adjust quantity in small increments
- "Edit" opens a side panel or modal with all fields
- "Add item" button opens create form
- Items below threshold are visually highlighted (yellow/red border)
- Sort options: category, name, status (below threshold first)

#### 2. Shopping List View (`/shopping`)

**Two sub-views toggled by tab:**

**List view** — flat list of pending items
- Each item: checkbox, name, quantity, unit, store badge
- Tap checkbox → mark as bought (prompt for quantity if pantry-linked)
- Swipe or long-press → delete
- "Add item" → quick-add form (name, quantity, optional: link to pantry item, store)
- "Clear bought" button

**Shop view** — grouped for in-store use
- Items grouped first by store, then by category within store
- Optimised for mobile use: large tap targets, minimal chrome
- Items with no store assigned shown under "Ei kauppaa"
- Progress indicator: X / Y items bought

#### 3. Shared Components

- `QuantityInput` — numeric input with unit selector
- `CategoryBadge` — colour-coded pill per category
- `StoreBadge` — store name pill
- `ThresholdIndicator` — green (ok) / yellow (getting low) / red (below threshold)

---

## Automation

### Daily threshold check

Run a NestJS scheduled task (`@Cron`) once per day (e.g. 07:00) that calls the `check-thresholds` logic and creates any missing shopping list items.

This ensures items that weren't manually consumed but naturally ran low still appear on the shopping list.

---

## Supabase Setup

### Tables
Create the two tables above with appropriate indexes:
- `pantry_items`: index on `category`, `current_quantity`
- `shopping_list_items`: index on `status`, `pantry_item_id`

### RLS
Single user — enable RLS with a policy that allows all operations for the authenticated user (user_id matches `auth.uid()`). Add `user_id` column to both tables.

---

## Implementation Notes

- No real-time sync needed (single user, no websockets required)
- Keep the pantry and shopping list in sync via the service layer, not database triggers — easier to debug
- Ad hoc shopping list items (not linked to pantry) are fully supported — useful for one-off purchases
- The "Shop view" should work well on mobile (used in-store) — prioritise large touch targets and readability
- Do not implement: meal planning, recipes, expense tracking, barcode scanning (out of scope)

---

## Suggested Build Order

1. Supabase schema (both tables + RLS)
2. NestJS PantryModule (CRUD + consume endpoint)
3. Threshold check logic + scheduled task
4. NestJS ShoppingListModule (CRUD + bought endpoint)
5. React Pantry View
6. React Shopping List (List view)
7. React Shopping List (Shop view)
