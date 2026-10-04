# Inventory module: functional spec (v1.1, 4 Oct 2026, as built)

This spec rebuilds the standalone **Athlete Fitness Inventory** app
(athletefitness.ae/inventory, source `template.html`, 5,106 lines) as the
**Inventory** module of the ATHL3TE module app. It works the same way the Café
module was built.

It covers **what the module does**: screens, fields, calculations,
permissions and data. **How it looks** follows DESIGN.md and the Café module.
A design pass (the canvas mockups) comes after this spec is approved.

Section references like "old §1855" point to line numbers in the old
`template.html`, so every rule can be checked against the original.

## v1.1: decisions and changes made during the build

The owner left the open points to me. Each decision below is built and tested.

**The §8 points**
1. **Hour chart:** sales now save the real time, and the chart uses only those.
   Imported sales, which have no time, are left out.
2. **Boxes:** a box counts as its units everywhere, Reports and Excel included.
3. **Margin:** net of VAT everywhere, so the category and brand margins add up
   to the headline figure.
4. **Exchanges:** counted as the old app counted them.
5. **Void:** allowed on any date, as in the old app. The record is kept, with
   who voided it, when and why.

**Layout, matched to the Café module**
- **Six tabs:** Dashboard · Sell · Sales log · Stock · Reports · Settings. Sales
  log has its own tab so the till keeps the full height.
- **Second row inside Stock:** Stock status · Items · Deliveries · Lookbook ·
  Suppliers.
- **Second row inside Reports:** Reports · Consignment.
- **Period control:** the Café's Day · Week · Month · Year · Custom · All time.
  It replaces the old Year + Month or From–To, and covers all of them.
- **Exports:** PDF, Excel and barcode labels sit behind one **Export** button on
  each screen. Void is an icon button in the row.
- **Tables:** some columns are folded into sub-lines so every table fits at
  1280 wide.
  - On Items, the barcode, gender and box price show under the name.
  - On Stock status, the brand, category and type show under the name.
- **Pop-ups:** the app's own pop-up (`modal modal-sheet`), the same as the Café's.

**Tests** (in athl3te-app, under `tests/`)
- `inv-calc.test.mjs`: 17 rule tests.
- `inv-parity.test.mjs`: 300 random transactions and 30 deliveries. Stock for
  all 187 items, period stock and every Dashboard figure match the old app's
  own code exactly.
- `inv-rules/rules.test.mjs`: 36 Firestore rule checks, run against the real
  emulator.
- **Layout check:** every screen at 1280×600, 1366×768 and 1920×1080 has no
  overflow, no clipped text and no wrapped buttons. On a 390 phone, only tables
  and tab rows scroll sideways, inside their own boxes.

**Supplier data:** the export had no supplier records. The import adds the 13
suppliers from the old app's built-in list (name, brand and consignment flag).
Contact details are added later, or come from a supplier export.

---

## 0. Scope

**Rebuilt, with every calculation unchanged (§3):**
- the 12 screens (§4)
- the till (Record Sale), including Sale, Return, Exchange and FOC
- stock: opening + additions + returns − sales − FOC
- consignment
- the lookbook with barcodes
- receipts
- exports (PDF and Excel)

**Replaced:**
- **Login:** the old app's username list, shared password and role switcher
  give way to the module app's sign-in.
- **Staff & Permissions screen:** replaced by Admin ticks (§5).
- **Firebase:** the old app's own project (`athlete-fitness-inventory`, one big
  document, anonymous sign-in) gives way to the module app's Firestore, one
  collection per record type (§2).

**Dropped:**
- "Reset to demo data"
- the embedded seed data and its data-stamp logic
- the 20 one-time cost migrations. They are already applied in the exported data.

**Start of the new books:**
- **Carried over:** the item list, the suppliers and the photos.
- **Stock:** opening balances are entered as of **1 Oct 2026**.
- **Transactions:** carried over from 1 October onwards (§7).

---

## 1. Owner decisions (final)

1. **Sign-in.** Everyone uses their own module app login. There is no separate
   inventory password.
2. **Permissions** are ticks in Admin (§5).
   - Every capability is its own tick.
   - **No role presets** grant any of them. Only the owner (`*`) has them
     automatically.
   - The owner decides per person after the module is built.
3. **Voids and refunds keep a record.** Nothing is ever deleted from the sales
   history (§3.6).
4. **Fresh stock start:** opening balances as of 1 Oct 2026. Sales from
   1 October onwards are imported or entered.
5. **Same look as the Café:** DESIGN.md, the module header, the account
   button, and no CDNs (§6).

---

## 2. Data (module app Firestore, via `store.js`)

All collections live under the business unit, like the Café's (`athlete-fitness::…`).

### `inv_items`, one doc per item (id kept from the old app: `item_1`…)
| Field | Type | Notes |
|---|---|---|
| `name` | string | Unique. The old app uses it as the SKU and the key everything joins on. Keep both `name` and `sku`, and keep them equal (old §2981). |
| `sku` | string | = name |
| `quickbooksSku` | string | Carried over. 132 items differ from `sku` (e.g. `Men-S-BLK` → `TS-BL-M101`). Shown and editable on the item form. Not used in any calculation. |
| `barcode` | string | EAN-13. Unique. Auto-assigned if blank (§3.8). |
| `brand`, `category`, `subcategory`, `gender` | string | `gender` ∈ Unisex / Men / Women / "" |
| `stockType` | `Stocked` \| `Consignment` | |
| `salePrice` | number | AED, **VAT-inclusive** |
| `cost` | number | AED per unit, **ex-VAT** |
| `boxPrice`, `unitsPerBox` | number \| null | Optional box sale (7 items today) |
| `openingQty` | integer | Stock on 1 Oct 2026 (the inventory start date) |
| `threshold` | integer | Low-stock level. Falls back to settings `defaultThreshold`. |
| `archived` | bool | Hidden from the till, lists and stock. History kept. |
| `pending` | bool | Suggested item awaiting approval (§4.4) |
| `createdAt`, `createdBy`, `approvedAt`, `approvedBy` | | |

**Stock on hand is never stored.** It is calculated (§3.1).

### `inv_sales`, one doc per **line** (as in the old app)
| Field | Notes |
|---|---|
| `txnId` | `TX-xxxxxxxx`, shared by all lines of one checkout |
| `exchangeId`, `exchangeRole` | Exchange only: one id for both legs; role `returned` or `issued` |
| `date` | **New:** full ISO date-time of the sale. The old app stored only `03-Oct-26`, with no time. |
| `day` | `YYYY-MM-DD`, for filtering |
| `itemId`, `itemName` | **New:** `itemId` is the join key. `itemName` is kept for display and history. |
| `category` | Copied at sale time (old §2271) |
| `transactionType` | `Sale` \| `Return` \| `FOC` (exchange legs are `Return` + `Sale`) |
| `saleUnit` | `Unit` \| `Box` |
| `qty`, `unitPrice`, `total` | `total` = qty × unitPrice. Negative for `Return`, 0 for `FOC`. |
| `customer`, `paymentMethod`, `cashier` | `cashier` = the signed-in person's name |
| `voided`, `voidedAt`, `voidedBy`, `voidReason` | **New**, §3.6 |

### `inv_additions`, stock deliveries
`date` (ISO), `day`, `itemId`, `itemName`, `brand`, `qtyAdded`, `notes`
(invoice / DO number), `by`. **New:** `deleted`, `deletedAt`, `deletedBy`
(§3.6).

### `inv_suppliers`
`company`, `brand` (links to items), `consignment` (bool), `contactName`,
`position`, `department`, `phone`, `email`, `website`, `address`, `vatTRN`,
`paymentTerms`, `currency` (default AED), `notes`, `archived`.

### `inv_settings` (one doc)
| Field | Default |
|---|---|
| `defaultThreshold` | 3 |
| `taxRate` | 5. VAT is **included** in prices. |
| `vatTRN` | |
| `studio` | 'Athlete Fitness' |
| `inventoryStartDate` | '2026-10-01' |
| `stockPending` | true until the opening balances are in (§4.12) |
| `currency` | 'AED' |
| studio address, phone | **New:** used on receipts and PDFs. The old app showed these fields but never saved them (old §3869). |

### `inv_photos`
One doc per product group: key = group key (§3.9), value = a JPEG data URL,
max 320 px, quality 0.82 (old §4187). Shared by all devices.

### `inv_notifications`
**New:** these replace the old per-browser bell (old §676), so a request made
at reception reaches the owner's computer. Fields: `to` (capability), `message`,
`screen`, `at`, `readBy[]`.

---

## 3. Calculations (implement exactly)

`units(line)` = `qty × unitsPerBox` if `saleUnit = Box` (unitsPerBox defaults
to 1), else `qty`.

Lines with `voided = true`, and additions with `deleted = true`, are
**ignored by every calculation below**.

### 3.1 Live stock (old §470)
For each item, count only movements dated **on or after `inventoryStartDate`**:
```
added    = Σ qtyAdded            (additions)
sold     = Σ units, type Sale    (includes exchange "issued" legs)
returned = Σ units, type Return  (includes exchange "returned" legs)
foc      = Σ units, type FOC
closing  = openingQty + added + returned − sold − foc
```

### 3.2 Stock for a period (Inventory Status screen, old §490)
For a period `from`–`to`, movements before the start date are ignored:
- **Opening** = `openingQty` + (added + returned − sold − foc dated before `from`).
- **In period:** `+Add`, `−Sold`, `+Ret`, `−FOC` are the movements between
  `from` and `to`.
- **Closing** = Opening + Add + Ret − Sold − FOC.

Movements after `to` are ignored.

### 3.3 Status (old §526)
| Status | Rule |
|---|---|
| `archived` | the item is archived |
| `out` | closing ≤ 0 |
| `low` | closing ≤ (item threshold, or the default threshold) |
| `ok` | anything else |

The "Inventory" menu badge counts active, non-pending items that are not `ok`.

### 3.4 Money (old §844–§881)
**Inputs:**
- `sales` = lines of type `Sale` in the period. This includes exchange
  "issued" legs.
- `vat` = settings `taxRate`.

**Calculations:**
- **Revenue** = Σ `total` of `sales`. It is gross and includes VAT.
- **Units sold** = Σ `units` of `sales`.
- **COGS** = Σ (`units` × item `cost`) over `sales`.
- **Net revenue** = Revenue ÷ (1 + vat/100).
- **Gross margin** = Net revenue − COGS. **Margin %** = margin ÷ net revenue × 100.
- **FOC cost** = Σ (`units` × `cost`) over FOC lines. It is kept out of COGS.

**Counts:**
- **Sale transactions** = Sale lines with no `exchangeId`.
- **Refund transactions** = Return lines with no `exchangeId`.
- **Exchanges** = the number of distinct `exchangeId`s.
- **FOC** = the number of FOC lines; **FOC units** = Σ their `units`.

### 3.5 Till totals and receipt (old §2122–§2200, §2282)
- **Normal sale:**
  - Gross = Σ qty × unitPrice.
  - Net = Gross ÷ (1 + vat/100).
  - VAT = Gross − Net.
  - The receipt shows "Subtotal (excl. VAT)", "VAT (5%)" and "TOTAL (incl. VAT)".
- **Return:** the same figures, each shown negative, under the label
  "REFUND TOTAL".
- **FOC:** the total is AED 0.00, labelled "FOC (NO CHARGE)", and there is no
  payment method.
- **Exchange:**
  - net = (taking gross) − (returning gross).
  - Above 0 the label reads "Customer pays", below 0 "Refund to customer", and
    at 0 "Even exchange".
  - An exchange must have at least one returned item **and** at least one new item.

### 3.6 Void (changed: the record is kept)
**Old behaviour:** Void removed the line from history; an exchange's two legs
were removed together (old §2577).

**New behaviour:**
- **What Void does:**
  - It sets `voided`, `voidedAt`, `voidedBy` and `voidReason` (the reason is
    optional) on **every line of the same `txnId`**. That includes both legs of
    an exchange.
  - The lines stay in the Sales Log, greyed out with a "Voided" badge.
  - They leave stock, revenue and every report.
- **Refund** is the old **Return** type, recorded through the till.

> **Open (owner, later):** should Void be allowed on any date, as in the old
> app, or only on the same day, as in the Café (where older sales get a Return
> instead)? **Default until decided: any date**, matching the old app.

**Deleting a stock addition** works the same way: it is marked `deleted`, never removed.

### 3.7 Consignment (old §3416)
For each consignment item in the period, using Sale lines only:
- **Units** = Σ `units`.
- **Revenue** = Σ `total`.
- **Cost owed** = units × cost.
- **Net revenue** = revenue ÷ (1 + vat/100).
- **Margin** = Net revenue − Cost owed.

The screen also shows the item's closing stock.

### 3.8 Barcode (old §2924)
- **Internal EAN-13:** `'2'` + an 11-digit sequence + a check digit.
- **Check digit:** sum the first 12 digits with weights 1, 3, 1, 3, …; the check
  digit is (10 − sum mod 10) mod 10.
- **Next barcode:** the highest sequence among existing `2xxxxxxxxxxxx`
  barcodes, plus 1.
- It is assigned when an item is saved with the barcode left blank.

### 3.9 Product groups and sizes (old §4156)
- **Sizes** are `XS S M L XL XXL XXXL 2XL 3XL`, or a number of 1–2 digits.
- **Group key** = the SKU split on `-` or `_`, with size tokens removed, then
  joined with `-`. So `Hoodie-S-BLK` → `Hoodie-BLK`.
- **Size order** = the letter order above, then numbers (as 100 + n), then
  anything else.

Used by the till grid, the Items list and the Lookbook.

### 3.10 Items to keep exactly as the old app does them, though they look wrong
Rebuild them as they are. They are listed in §8 for the owner to decide on.

---

## 4. Screens

Navigation is the module's own page header with section tabs, like the Café:
- **Sell:** Dashboard, Record Sale, Sales Log
- **Stock:** Inventory Status, Items, Stock Additions, Lookbook, Suppliers
- **Reports:** Reports, Consignment
- **Settings**

Tabs the person has no tick for are not shown.

Every list with a period uses the **same period filter** (old §570):
- **Year** and **Month**, *or* **From–To**. Using one clears the other.
- It defaults to the current month.
- **Clear** resets it.
- The current period is shown as "Showing: October 2026".

### 4.1 Dashboard (`inv.dashboard`)
- **Period filter.**
- **With `inv.cost`:**
  - Revenue · COGS · Gross margin (shown with its %) · FOC cost.
  - Then: Sale tx · Units sold · Refund tx · Exchanges · FOC (with units).
- **Without `inv.cost`:**
  - Revenue · Sale tx · Refund tx.
  - Then: Exchanges · Units sold · FOC units. No money figure for FOC.
- **Daily revenue bar chart:**
  - One bar per day of the period, or one per month for more than 62 days.
  - Zero days are shown, and value labels sit on the bars.
  - It also shows "N of M days had sales" and "Total for period".
- **Sales by category and by brand.** Each has:
  - a donut of sales;
  - with `inv.cost`, a second donut of gross margin (negatives shown as 0);
  - a legend table: Sales, %, then with `inv.cost` Margin, % and Margin %.
  - Sorted by sales, largest first. One colour per category across both donuts.
- **Sales by SKU** (every SKU sold), sorted by revenue:
  - Columns: #, Item, Brand, Units, Revenue, % of revenue (with a bar).
  - TOTAL row.
- **Transactions** for the period, newest first:
  - Columns: Date, Type (Exchange shows "↩ returned" / "＋ new"), Item, Brand,
    Customer, Qty, Unit, Unit price, Total, Payment.
  - Footer: "TOTAL · n TRANSACTIONS · n SALE · n RETURN · n FOC", Σqty, net of
    returns, and a second line with sales revenue only.
  - Buttons: PDF and Excel.
- **Page actions:** PDF of the dashboard, and **New sale**.

### 4.2 Record Sale: the till (`inv.sell`)
**Left side: the product grid**
- **Search box:**
  - Focused automatically on open, and again when the window regains focus.
  - Placeholder: "Scan barcode or search by name / brand / SKU…".
  - Shows "Scanner ready".
- **Enter in the search box:**
  - With an exact SKU or barcode match, it adds that item.
  - Otherwise it adds the first in-stock card.
  - Either way, it clears the box and keeps the cursor there for the next scan.
- **Filters:** Brand, Category, Sub-category, and "Hide out-of-stock". That last
  one is not shown while stock is pending.
- **Match line:** "N items match · N in stock · N out", plus "showing first 80"
  when there are more than 80.
- **Cards:**
  - Each shows a photo (or a placeholder), name, brand · sub-category, price
    and "N left".
  - Out-of-stock cards are dimmed and can't be added.
  - Sorted by brand → category → sub-category → gender → group → size.
  - At most 80 cards.
  - With no match, a hint shows example searches and a "Clear all filters" button.

**Right side: the cart**
- **Type:** Sale / Return / Exchange / FOC.
- **Payment:** Card / Cash / Apple Pay / Bank Transfer. Hidden for FOC.
- **Customer** (required):
  - Suggestions come from past customers.
  - Two buttons fill it in: **+ Walk-in** and **+ Guest**.
  - Completing without a customer gives an error and focuses the field.
- **Lines:**
  - Each line has − / qty / + and ✕ buttons.
  - Qty 0 removes the line.
  - "Switch to Box/Unit pricing" appears when the item has a box price.
  - In FOC, prices are shown struck through.
- **Exchange:**
  - A toggle chooses where tapped items go: "＋ New item (taking)" or
    "↩ Return (giving back)".
  - The cart has two groups, Returning and Taking.
- **Totals** follow §3.5.
- **Complete transaction:**
  - Writes the lines (§2) and opens the receipt.
  - The receipt has the logo, VAT TRN (or "TAX INVOICE"), date, txn id,
    customer, cashier, payment and type.
  - Receipt buttons: **Print** (via `cafe-print.js printHtml`, no pop-up
    window) · **Save PDF** · **Done**.
- **Clear cart.**
- **Return and Exchange need `inv.refund`.** Without it, the Type choice offers
  only Sale and FOC.

### 4.3 Sales Log (`inv.sell`)
- **Filters:** Search (item, customer, notes), the period filter, Brand,
  Category, Type (Sale / Return / Exchange / FOC), **New: Show voided**.
- **Summary:** "N transactions · Revenue (sales only) AED x".
- **Table:** the same columns as the Dashboard's transactions, plus a **Void**
  button (needs `inv.void`).
  - It shows 200 rows, with "Showing first 200 of N".
  - Void asks for confirmation and an optional reason.
  - **New:** "Voided by X on date" shows on voided rows.
- **Page actions:** PDF, Excel, New sale.

### 4.4 Items (`inv.items.manage`, or `inv.items.suggest` for the request button only)
**Filters:** Search, Brand, Category, Sub-category, Stock type, Status.
Status options: All active (the default) / All incl. pending / OK / Low / Out /
Pending approval / Archived.

**Table:** products grouped by §3.9.
- A **group row** shows:
  - a caret, the group key and "N sizes";
  - brand, category, sub-category, type and gender;
  - the price, or a price range;
  - total stock;
  - a status summary ("2 low · 1 out").
  - Click the row to expand or collapse it.
- **Item rows** show: checkbox, name, brand, category, sub-category, type,
  gender, price, cost (needs `inv.cost`), box ("150 / 10"), stock, threshold,
  status, and Edit.
- **Pending items** show **✓ Approve** and **✕ Reject**.
- **Footer:** TOTAL UNITS ON HAND.

**Info line:** "N products · N of N SKUs · N pending approval (review →) ·
N archived (view archived →)".

**Bulk selection:**
- Checkboxes work per row, per group and for all visible rows.
- A bar appears with: "N selected · Archive selected · Unarchive selected ·
  Delete selected · Clear selection".

**Item form** (new item and edit). Fields:
- SKU / item name
- Barcode (blank = auto-assigned)
- Brand (a list, or "+ New brand…")
- Category
- Sub-category (a type-ahead list that also accepts a new value)
- Stock type
- Gender
- Sale price (incl. VAT)
- Cost per unit (ex-VAT), which needs `inv.cost` to see
- Opening qty
- Low-stock threshold
- Box price and units per box
- **New:** QuickBooks SKU

**Saving a live item:**
- Needs a name, brand, category, sub-category, stock type, sale price > 0 and
  cost > 0 (old §719).
- If anything is missing, a message lists the missing fields.

**Suggesting an item** (`inv.items.suggest` without `inv.items.manage`):
- The new item is saved as **pending** and needs only a name.
- People with `inv.items.manage` get a notification.
- **Approve:** checks the same required fields first, sets `approvedBy`, and
  notifies the person who suggested it.
- **Reject:** removes the pending item and notifies them.

**Edit form buttons:**
- **Archive / Unarchive.**
- **Delete permanently:** a red button, behind a confirmation. Sales history is kept.

**Page actions:**
- **PDF** and **Excel**.
- **Barcodes:** an Excel file with two columns, "Item Name" and
  "Barcode Number" (kept as text), for OpenLabel+. It excludes archived items.
- **New item.**

### 4.5 Stock Additions (`inv.items.manage`)
- **Filters:** From–To, Brand.
- **Summary:** "N stock-in records · Total units added N".
- **Table:** Date, Item, Brand, Qty added, Notes / invoice, and Delete (§3.6).
- **Record stock-in form:** Date (today by default), Item, Quantity (≥ 1),
  Brand (filled in from the item, read-only), Notes ("Invoice No, DO No, etc.").
- **Page actions:** PDF, Excel, Record stock-in.

### 4.6 Inventory Status (`inv.stock`)
**While stock is pending:**
- The screen shows an "Opening balances pending" card instead of the table.
- It explains that sales are still being recorded, and how to switch the hold off.

**Otherwise:**
- **Filters:** the period filter, Search, Brand, Status (OK / Low / Out, "live").
- **Info:** the period shown, and the number of items.
- With `inv.cost`, it also shows **Live stock value (at cost)** = Σ live closing × cost.
- **Table** (§3.2): Item, Brand, Category, Type, Price, Open, +Add, −Sold,
  +Ret, −FOC, Stock, Status. Plus a TOTALS row.
- **Page actions:** PDF, Excel, and "+ New item" (it opens the request form for
  people with suggest rights only).

### 4.7 Lookbook (`inv.stock`)
**Layout:**
- Products are grouped (§3.9) and sorted by category → sub-category → brand →
  gender → key.
- Category and sub-category headers stay attached to the first product under
  them, so a header never ends a page.
- Each product shows: a photo box, its name and tags, and a table of Size,
  SKU and Barcode. The barcode is CODE128, drawn by JsBarcode, **self-hosted**.
- Products are packed into A4 pages (an 880 px budget per page). Each page has
  a header ("Athlete Fitness — Inventory List") and a footer ("Page n of N",
  with the print time).

**Photos:**
- Click to choose a file, drag and drop it, or paste it (Ctrl+V on a hovered box).
- Images are resized to 320 px and saved to `inv_photos`, so all devices see them.
- ✕ removes a photo.
- Adding or removing photos needs `inv.items.manage`.
- The counter reads "N / N photos added".

**Print:**
- **First print:** prints the full book and saves a baseline.
- **Later prints:**
  - The app lists the pages that changed since the baseline.
  - It offers **Print changed · N pages** or **Print full**.
  - When printing only the changed pages, it shows "Replace these pages in the
    binder: 3, 7".
- **New:** the baseline is saved per business, not per browser.
- The print dialog tip about turning off headers and footers is kept.

### 4.8 Suppliers (`inv.suppliers`)
- **Filters:** Search (name, brand, contact, email, phone), Type (All /
  Stocked / Consignment / Archived).
- **Summary:** "N of N suppliers · N consignment".
- **Table:** Company (with the brand under it), Contact, Position, Department,
  Phone (a tel: link), Email (a mailto: link), Type badge, Edit.
- **Form** (§2 fields):
  - Sections: Company, Primary contact, Business details.
  - Buttons: Archive / Unarchive, **Delete permanently** (needs
    `inv.suppliers.delete`).
  - Without `inv.suppliers.manage`, the person can edit but can't clear a field
    that already has a value (old §3642).
- **Page actions:** PDF (the directory), Excel, Add supplier.

### 4.9 Reports (`inv.reports`)
- **Filters:** the period filter, Brand, Category, Search.
- **Summary:** "N sales · N units · AED x".
- **Tables:**
  - Sales by brand (Tx, Units, Revenue)
  - Top 15 items by revenue
  - Sales by category
  - Sales by sub-category
- **Charts:**
  - Sales by day of week.
  - Sales by hour of day. **See §8 item 1**: the old chart is invented.
- **Slowest movers** (not shown while stock is pending):
  - Items in stock, sorted by days since their last sale (or "Never").
  - Over 30 days is shown in red, over 14 in amber.
- **Page action:** PDF.

### 4.10 Consignment (`inv.reports`)
- **Filters:** the period filter, Brand, Search.
- **Summary figures:**
  - Consignment items (with the number of brands)
  - Units sold
  - Revenue (collected from customers)
  - Cost owed (to the brands), with the margin
- **Table** (§3.7): Item, Brand, Closing stock, Units sold, Revenue, Cost owed,
  Margin, and a TOTAL row.
- **Page actions:** PDF (per brand), Excel.

### 4.11 Notifications
Same as the old bell:
- It shows the unread count.
- The list has 30 rows, with "Mark all read".
- Tapping a row goes to that screen; "items:pending" opens Items filtered to Pending.

Put it in the module page header, next to the tabs, not in the app's top bar.

### 4.12 Settings (`inv.settings`)
**General:**
- **Fields:** Studio name, Currency, Default low-stock threshold, VAT %
  (included in prices).
- **Save.**
- **"Apply default threshold to ALL items now…"**, with a confirmation.

**Go-live:**
- **"Hold stock balances (opening balances pending)":**
  - While it is on, every stock balance is hidden and any item can be sold.
- **Inventory start date.** Only movements on or after this date count.

**Opening balances (new):**
- A table of every active item with an **Opening qty** box, filterable by
  brand and category.
- **Save all.**
- **Import from Excel/CSV:** two columns, SKU and Qty. It shows a preview,
  lists any unknown SKUs, then applies.
- This is how the 1 October counts get in. Then the hold is switched off.

**Data:**
- **Export all data (Excel):** Items, Sales_Log, Additions and Inventory sheets.
- **Backup to file (.json).**
- **Restore** (merges, never overwrites).
- The storage status line is kept.
- **Removed:** "Reset to demo data".

**Studio info** for receipts and PDFs: address line 1, address line 2, phone,
VAT TRN. **New:** these are actually saved.

---

## 5. Permissions (Admin ticks). Add to `CAP_GROUPS` in `admin-store.js`

Module id `inventory`. Every capability is its own tick. **Add none of them to
any `ROLE_PRESETS`.**

| Capability | Label in Admin | Opens |
|---|---|---|
| `inv.dashboard` | See the inventory dashboard | Dashboard |
| `inv.sell` | Record sales | Record Sale, Sales Log (Sale and FOC) |
| `inv.refund` | Returns and exchanges | the Return and Exchange types on the till |
| `inv.void` | Void a sale | the Void button in the Sales Log |
| `inv.stock` | See stock | Inventory Status, Lookbook |
| `inv.items.suggest` | Suggest new items | New item → pending, waits for approval |
| `inv.items.manage` | Manage items and deliveries | Items, Stock Additions, approve / reject, photos, opening balances |
| `inv.cost` ⚠ | See cost and margin | Cost column, COGS, margin, FOC cost, stock value |
| `inv.suppliers` | See suppliers | Suppliers: view, add, and edit without clearing a filled field (old cashier rule) |
| `inv.suppliers.manage` | Manage suppliers | Full edit (may clear fields), archive |
| `inv.suppliers.delete` | Delete suppliers | Delete permanently |
| `inv.reports` | See inventory reports | Reports, Consignment |
| `inv.settings` ⚠ | Change inventory settings | Settings, including opening balances |

⚠ = `sensitive: true`, styled like the Café's.

**How the old roles map**, for reference only. These are not presets.
- **Old cashier:** dashboard, sell, refund, void, stock, items.suggest, suppliers.
- **Old manager:** everything except settings.
- **Old admin:** everything.

**Firestore rules:**
- **Reading** `inv_*` needs any `inv.` capability.
- **Writing:**
  - `inv_sales`: `inv.sell`. Setting `voided` also needs `inv.void`.
  - `inv_items`: `inv.items.manage`, or `inv.items.suggest` for
    `pending: true` creates only.
  - `inv_additions`, `inv_photos`: `inv.items.manage`.
  - `inv_suppliers`: the supplier caps.
  - `inv_settings`: `inv.settings`.
- Use the same `profile().caps.hasAny` pattern as the existing rules.

---

## 6. Build rules

1. **Look:** DESIGN.md throughout, with the Café as the reference. That covers
   tokens, the module header, tabs, cards, tables, buttons and pills.
   - No two-line button or tab text.
   - Nothing cut off where there is room.
   - Text vertically centred in pills and buttons.
   - Test at 1280×600 first, then 1366×768, 1920×1080 and a phone.
2. **No CDNs** (the gym machines block them).
   - **Charts:** hand-drawn SVG, like the Café board. No Chart.js.
   - **Barcodes:** `vendor/jsbarcode.min.js`, from the old `_jsbarcode.js`.
   - **Excel:** a self-hosted SheetJS (`vendor/xlsx.full.min.js`), so files stay
     `.xlsx` as today. If that is too heavy, `.csv` like the Café, but tell the
     owner first.
   - **PDF:** print-to-PDF through `printHtml` with its own `@page`, like the
     Café reports. No html2canvas or jsPDF.
3. **Pop-ups:** only the dialogs the old app has (item form, stock-in form,
   supplier form, receipt, confirmations, print choice), all built with the
   app's own modal component.
4. **Files:** `src/modules/inventory/` with `inventory.js` (screens),
   `inv-store.js` (data and §3 calculations, pure functions), `inv-till.js`,
   `inv-lookbook.js`, `inv-export.js`, and `src/data/inventory-seed/` (§7).
   **Do not touch** the Café files, `store.js` or `cafe-finance.js`.
5. `inv-store.js` calculations are **pure and unit-tested** against §9.

---

## 7. Data import (one-off, owner-run, from Settings → Data)

| Source | Into | Notes |
|---|---|---|
| `items.csv` (187 rows, 19 columns) | `inv_items` | Keep `id`. `archived` "true"/"false" → bool. Blank `boxPrice`/`unitsPerBox` → null. **`openingQty` is reset to 0.** The old values were end-of-May counts; the 1 Oct counts are entered fresh (§4.12). |
| `transactions_from_2026-10-01.csv` (6 rows) | `inv_sales` | `date` = `date_as_stored` at 12:00 local (the old app has no time). Look up `itemId` by `itemName`. `cashier` "Reception". |
| **Missing from the export:** suppliers (13), photos (`photos` collection), and any sales after the export was taken | | The owner's PowerShell Claude exports these on switch-over day. The import must accept them in the same CSV shapes. |

**Re-running the import is safe:** it matches on `id` and never duplicates.

---

## 8. Things in the old app that look wrong. The owner decides each; until then, build as the old app does
1. **The "Sales by hour" chart is invented.**
   - What happens: it puts each sale at an hour made up from the item name's
     first letter and the quantity (old §3295). The old app saved no times.
   - Recommendation: the new app saves the real time (§2), so draw the chart
     from real times. Until enough October data exists, label it "from 1 Oct".
2. **Reports and the consignment Excel count boxes as single units.**
   - What happens: they add `qty`, not `units`. A box of 24 counts as 1 (old
     §3267, §4045). The Dashboard and Consignment screen count them correctly.
   - Recommendation: use `units` everywhere.
3. **Category and brand margin include VAT.**
   - What happens: the donut margins use total − cost (VAT-inclusive), while
     the headline Gross margin uses net − cost. The two don't add up (old §927).
   - Recommendation: use net − cost for both.
4. **The Exchange revenue count.**
   - What happens: exchange "issued" legs count as Sales in revenue, and the
     returned legs as Returns. Revenue therefore shows the new item at full
     price, while the money back appears only in the "net of returns" total.
   - Recommendation: keep as is. It matches how the old numbers were read.
5. **Void on any date.** See §3.6.

---

## 9. Definition of done
1. With the imported data and the old app's numbers for **1–4 Oct 2026**, these
   match the old app to the fil:
   - every Dashboard figure;
   - every Sales Log total;
   - Inventory Status open / +add / −sold / +ret / −FOC / closing (opening
     balances set the same in both);
   - the Consignment totals.
   Exceptions are the §8 items the owner has changed.
2. **Unit tests for §3**, with one test per rule:
   - every transaction type;
   - box units;
   - movements before the start date (ignored);
   - period opening and closing;
   - voided lines and deleted additions (ignored);
   - the EAN-13 check digit;
   - group keys and size order.
3. **A person with no `inv.` tick** sees no Inventory tile. **A person with only
   `inv.sell`** sees only Record Sale and Sales Log, with no cost anywhere and
   no Void.
4. **Every screen** passes the layout checks at 1280×600 (DESIGN.md §9): no
   overflow, no clipped text, no two-line buttons.
5. **Barcode scanning:** a USB scanner typing a barcode plus Enter adds the item
   and keeps focus for the next scan.
