# BarMetrics — Product Naming Standard

> The contract for how spirits are named and identified in BarMetrics. Aligned with
> US TTB labeling rules (27 CFR Part 5) and GS1 product identification (GTIN/UPC).
> Any change to this document is a schema-affecting decision.

## TL;DR

A spirit in BarMetrics is uniquely identified by **(brand, productName, sizeMl)** — collapsed into a single normalized `searchKey` column with a `UNIQUE` constraint at the database. Duplicates are impossible by construction.

Optional canonical fields: `upc` (also `UNIQUE`), `ageStatement`, `subClass`.

## Authoritative sources

| Topic | Source |
|---|---|
| Distilled spirits labeling | [27 CFR Part 5 — Labeling and Advertising of Distilled Spirits](https://www.ecfr.gov/current/title-27/chapter-I/subchapter-A/part-5) |
| Authorized bottle sizes | [27 CFR Part 5 Subpart K — Standards of Fill](https://www.ecfr.gov/current/title-27/chapter-I/subchapter-A/part-5/subpart-K) |
| Mandatory label info | [TTB — Brand Label](https://www.ttb.gov/regulated-commodities/beverage-alcohol/distilled-spirits/ds-labeling-home/ds-brand-label) |
| Product identifiers | [GS1 US — GTIN/UPC](https://www.gs1us.org/faqs/gs1-company-prefix-barcodes-and-indentification) |
| Spirits master data | [U.P.C. Data 4 Beverage Alcohol](https://upcdata4spirits.com/) |
| Industry practice | [Backbar — How to do bar inventory](https://www.getbackbar.com/how-to-do-bar-inventory-guide) |

## The canonical Product record

| Field | Type | Rule |
|---|---|---|
| `brand` | text | The brand name as on the label, with diacritics preserved (`Rémy Martin`, `Tito's`). Normalized on write: trim, collapse whitespace, fold smart quotes (`’` → `'`). |
| `productName` | text | The expression/class+type *without* the brand (`Handmade Vodka`, `Single Malt 12 Year`, `Blanco`). Normalized same as `brand`. |
| `category` | enum (top-level TTB class) | One of `VODKA`, `GIN`, `RUM`, `TEQUILA`, `MEZCAL`, `WHISKEY`, `BRANDY`, `LIQUEUR`, `BITTERS`, `VERMOUTH`, `OTHER`. Legacy values (`BOURBON`, `SCOTCH`, `COGNAC`) are tolerated on read for backward compatibility but new entries must use the class+`subClass` pair. |
| `subClass` | text, nullable | Specific sub-type within the class. See `LIQUOR_SUBCLASSES` in `src/lib/calculations.ts`. Examples: Whiskey → `BOURBON`, `SCOTCH_SINGLE_MALT`, `IRISH`, `TENNESSEE`; Brandy → `COGNAC`; Tequila → `BLANCO`/`REPOSADO`/`ANEJO`/`EXTRA_ANEJO`/`CRISTALINO`. |
| `abvPercent` | float | `0 ≤ abv ≤ 95`. Per TTB §5.65, label may state up to 0.15% **below** actual but never above. |
| `nominalVolumeMl` | int | **Must** be a TTB Standard of Fill: `50, 100, 187, 200, 250, 350, 375, 500, 700, 720, 750, 1000, 1500, 1750, 3000`. Free-form sizes are rejected. |
| `ageStatement` | int, nullable | Whole years where mandated/stated by TTB (whisky, brandy). Auto-derived from `productName` on save when an obvious pattern exists (`12 Year`, `VS`, `VSOP`, `XO`). |
| `upc` | text, nullable, `UNIQUE` | GS1 GTIN-12 (UPC-A) or GTIN-13. Digits only; check digit is validated. When present, this is the authoritative dedup key. |
| `defaultDensity`, `defaultTareG` | float | Weight-inventory math. Density is g/ml of the liquid at room temperature. |
| `searchKey` | text, `UNIQUE` | Server-derived. Format: `${normalize(brand)}-${normalize(productName)}-${sizeMl}` where `normalize()` is `NFKD-fold → lowercase → strip non-alphanumeric`. Examples: `titos-handmadevodka-750`, `remymartin-vsop-750`. |
| `isActive` | bool | Soft-delete flag; defaults `true`. |

## Display name template

Render consistently across the app as:

```
{Brand} — {Product Name}{, age yr if ageStatement}{ · sizeMl ml}{ · ABV%}
```

Examples:
- `Glenlivet — 12 Year, 12 yr · 750 ml · 40%`
- `Tito's — Handmade Vodka · 750 ml · 40%`
- `Hennessy — VS, 2 yr · 750 ml · 40%`

## Dedup keys, in order

1. **UPC match** (`upc` equality on a non-null value) → same product. Authoritative.
2. **`searchKey` match** → same product. Authoritative; enforced by `UNIQUE` constraint.
3. **Fuzzy match** (Levenshtein on `brand` + same `category` + same `sizeMl`, threshold ≤ 2) → *suggest* to user on create; never auto-merge.

## Normalization performed on every write

| Step | Logic | Where |
|---|---|---|
| Trim + collapse whitespace | `s.replace(/\s+/g,' ').trim()` | `normalizeSpiritName()` in `calculations.ts`, called by Zod transform |
| Smart-quote → ASCII | `’` → `'`, `“”` → `"` | `normalizeSpiritName()` |
| Diacritic preservation for display | NFC stable | `normalizeSpiritName()` |
| `searchKey` derivation | `normalizeForKey(brand) + '-' + normalizeForKey(productName) + '-' + sizeMl` | `computeSearchKey()`, called by `/api/products` POST |
| Diacritic strip for key | NFKD then drop combining marks | `normalizeForKey()` |
| Size enum | Reject non-SOF sizes | `productSchema` (Zod) |
| ABV range | `0 ≤ abv ≤ 95` | `productSchema` (Zod) |
| UPC normalization | Strip non-digits; validate GTIN check digit | `isValidGtin()` + Zod transform |

## Hard rules in the database

- `UNIQUE(searchKey)` on `Product` — duplicates impossible at the storage layer.
- `UNIQUE(upc)` on `Product` (where not null).
- `BottleWeightDatabase` retains its own composite `UNIQUE(brand, productName, sizeMl)` plus a non-unique `upc` index.

## Class & sub-class table

| Class | Sub-classes |
|---|---|
| VODKA | (none) |
| GIN | `LONDON_DRY`, `PLYMOUTH`, `OLD_TOM`, `GENEVER`, `CONTEMPORARY` |
| RUM | `WHITE`, `GOLD`, `DARK`, `SPICED`, `OVERPROOF`, `AGED` |
| TEQUILA | `BLANCO`, `REPOSADO`, `ANEJO`, `EXTRA_ANEJO`, `CRISTALINO` |
| MEZCAL | `JOVEN`, `REPOSADO`, `ANEJO` |
| WHISKEY | `BOURBON`, `RYE`, `TENNESSEE`, `SCOTCH_SINGLE_MALT`, `SCOTCH_BLENDED`, `IRISH`, `CANADIAN`, `JAPANESE`, `AMERICAN` |
| BRANDY | `COGNAC`, `ARMAGNAC`, `CALVADOS`, `PISCO`, `AMERICAN` |
| LIQUEUR | `CREAM`, `COFFEE`, `HERBAL`, `FRUIT`, `NUT`, `CHOCOLATE`, `TRIPLE_SEC`, `AMARO` |
| BITTERS | (none) |
| VERMOUTH | `DRY`, `SWEET`, `BLANC` |
| OTHER | (none) |

(Source of truth: `LIQUOR_SUBCLASSES` in `src/lib/calculations.ts`.)

## Migration history

- **2026-05-20:** First standardization pass. Added `subClass`, `ageStatement`, `upc`, `searchKey` to `Product`; `subClass`, `ageStatement` to `BottleWeightDatabase`. Collapsed legacy `BOURBON`/`SCOTCH`/`COGNAC` categories into class+subClass (25 Products + 73 catalog rows). Backfilled all `searchKey` values. No duplicates found.

## Adding a new spirit — checklist

1. Search the bottle catalog first (`/products/new` → "Quick fill from bottle catalog"). Pick if it's there.
2. If not, fill manually. Required: `brand`, `productName`, `category`, `abvPercent`, `nominalVolumeMl`.
3. Pick a `subClass` when one applies (the dropdown filters to your chosen class).
4. Add an `ageStatement` when stated on the label (otherwise leave blank).
5. Add the `upc` when known — paste the 12 or 13 digit barcode; the check digit is validated.
6. Submit. If a 409 comes back, the product already exists — search for and edit the existing row instead.
