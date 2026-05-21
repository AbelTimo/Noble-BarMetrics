#!/usr/bin/env tsx
/**
 * One-off importer for data/NOBLE_BEVERAGE_COGS_24_03_2026.xlsx.
 *
 * Two sheets are read:
 *   - "price"    → 75 unique ingredients → Products + SKUs (one SKU per size)
 *   - "cocktail" → 45 cocktails          → Recipes + RecipeIngredients
 *
 * Dry-run by default. Pass --apply to actually write to the database.
 *
 *   npx tsx scripts/import-noble-cogs.ts             # dry run
 *   npx tsx scripts/import-noble-cogs.ts --apply     # commit
 *
 * Defaults:
 *   - Category inferred from name keyword (see GUESS_CATEGORY).
 *   - ABV defaults: spirits 40, liqueurs 20, wine 12, beer 5, mixers 0.
 *   - For ingredients sold by "pc" (whole-can), sizeMl = 330 (typical can/bottle).
 *   - Cocktail ingredients with no product match → auto-create OTHER stubs (0% ABV).
 *   - Recipes default to category=COCKTAIL, method=BUILT.
 */

import * as XLSX from 'xlsx';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { computeSearchKey, getDensityForABV } from '../src/lib/calculations';

const APPLY = process.argv.includes('--apply');
const VERBOSE = process.argv.includes('--verbose');
const FILE = path.join(process.cwd(), 'data', 'NOBLE_BEVERAGE_COGS_24_03_2026.xlsx');

// ---------------------------------------------------------------------------
// DB client — mirrors src/lib/db.ts: prefer TURSO_DATABASE_URL whenever set so
// this script writes to the same DB the running app reads from.
// ---------------------------------------------------------------------------
const LIBSQL_SCHEMES = ['libsql://', 'https://', 'http://', 'wss://', 'ws://'];

function createPrismaClient(): PrismaClient {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoIsLibsql = !!tursoUrl && LIBSQL_SCHEMES.some((s) => tursoUrl.startsWith(s));
  const url = tursoIsLibsql ? tursoUrl : process.env.DATABASE_URL ?? tursoUrl;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (url && LIBSQL_SCHEMES.some((s) => url.startsWith(s))) {
    return new PrismaClient({ adapter: new PrismaLibSql({ url, authToken }) });
  }
  const filePath =
    url && url.startsWith('file:')
      ? path.resolve(process.cwd(), url.slice('file:'.length))
      : path.join(process.cwd(), 'prisma', 'dev.db');
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: filePath }) });
}

// ---------------------------------------------------------------------------
// Category + ABV inference
// ---------------------------------------------------------------------------
type Cat =
  | 'VODKA'
  | 'GIN'
  | 'WHISKEY'
  | 'RUM'
  | 'TEQUILA'
  | 'BRANDY'
  | 'LIQUEUR'
  | 'MEZCAL'
  | 'COGNAC'
  | 'SCOTCH'
  | 'BOURBON'
  | 'OTHER';

// NOTE: We keep COGNAC/SCOTCH/BOURBON here because the current LIQUOR_CATEGORIES
// (and the DB) still accept them. Once the enum consolidation (b) lands, these
// will fold under WHISKEY/BRANDY + subClass.
const KEYWORDS: Array<[RegExp, Cat, number /* default ABV */]> = [
  // Brandy/Cognac
  [/hennes?y|remy|courvoisier/i, 'COGNAC', 40],
  // Scotch
  [/glenfiddich|glenlivet|chivas|johnnie|black\s*label|blue\s*label|red\s*label|double\s*black|gold\s*label|grant|hankey|king\s*robert|lion\s*pride|champion/i, 'SCOTCH', 40],
  // Bourbon
  [/maker['’‘]?s|jim\s*beam|wild\s*turkey|bourbon|jack\s*daniel/i, 'BOURBON', 40],
  // Whiskey (generic) — covers Irish (Jameson, Tullamore, Bushmills) and anything tagged whisky/whiskey
  [/whisk(e)?y|jameson|tullamore|bushmills|powers\s*irish|paddy/i, 'WHISKEY', 40],
  // Vodka
  [/vodka|absolute|smirnoff|stolichnaya|grey\s*goose|ketel|kemila|kegna(?!\s*beer)/i, 'VODKA', 40],
  // Gin
  [/gin|gordon|bombay|beefeater|tanqueray|hendrick/i, 'GIN', 40],
  // Tequila / Mezcal
  [/mezcal/i, 'MEZCAL', 40],
  [/tequila|patron|cuervo|don\s*julio|donjulio|sierra|olmeca|camino|casamigos|corralejo|gila/i, 'TEQUILA', 40],
  // Rum
  [/rum|bacardi|havana|malibu|captain\s*morgan/i, 'RUM', 40],
  // Vermouth
  [/martini\s*(bianco|extra\s*dry|rosso)|vermouth|noilly/i, 'WHISKEY' /* placeholder, see below */, 15],
  // Liqueurs / amaros / cordials
  [/amarula|baile?y?s|kahl(u|ú)a|kahula|aperol|campari|jagermeister|fernet|luxardo|pimm['’‘]?s|villia|cointreau|grand\s*marnier|frangelico|amaretto|bols|olmeca\s*chocolate/i, 'LIQUEUR', 20],
  // Bitters
  [/bitters?|angostura|\bbetters\b/i, 'LIQUEUR' /* placeholder */, 40],
];

// Non-spirit catch-alls — map to OTHER for now.
const NON_SPIRIT = [
  /wine|acacia|rift\s*valley|merlot|cabernet|shiraz|chardonnay|sauvignon|pinot/i,
  /beer|heineken|arada|habesha|kegna\s*beer/i,
  /redbull|red\s*bull|soda|water|ambo|tonic|juice|syrup|coffee|tea|cola|sprite|fanta/i,
];

function guessCategory(name: string): { category: Cat; abv: number; isWine: boolean; isBeer: boolean } {
  const n = name.trim();
  // Non-spirit first (so "Heineken" doesn't accidentally match a spirit keyword)
  if (/wine|acacia|rift\s*valley|merlot|cabernet|shiraz|chardonnay|sauvignon|pinot/i.test(n)) {
    return { category: 'OTHER', abv: 12, isWine: true, isBeer: false };
  }
  if (/beer|heineken|arada|habesha|kegna\s*beer/i.test(n)) {
    return { category: 'OTHER', abv: 5, isWine: false, isBeer: true };
  }
  if (/\b(redbull|red\s*bull|soda|water|ambo|tonic|juice|syrup|coffee|tea|cola|sprite|fanta)\b/i.test(n)) {
    return { category: 'OTHER', abv: 0, isWine: false, isBeer: false };
  }
  for (const [re, cat, abv] of KEYWORDS) {
    if (re.test(n)) {
      // Vermouth/Bitters placeholders — treat as LIQUEUR (closest in old enum)
      const finalCat: Cat = cat === 'WHISKEY' && /martini|vermouth|noilly/i.test(n) ? 'LIQUEUR' : cat;
      return { category: finalCat, abv, isWine: false, isBeer: false };
    }
  }
  return { category: 'OTHER', abv: 0, isWine: false, isBeer: false };
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------
interface PriceRow {
  ingredient: string;
  amount: number;
  uom: string;
}
interface CocktailLine {
  cocktail: string;
  ingredient: string;
  amount: number;
}

function parsePriceSheet(wb: XLSX.WorkBook): PriceRow[] {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets['price'], { defval: null }) as Array<Record<string, unknown>>;
  const out: PriceRow[] = [];
  for (const r of rows) {
    const ing = String(r.Ingredient ?? '').trim();
    let amount = Number(r.Amount);
    const uom = String(r.Uom ?? '').trim().toLowerCase();
    if (!ing || !Number.isFinite(amount) || amount <= 0) continue;
    // Spreadsheet quirk: ingredients named "Water 0.5 L" / "Water 1L" sometimes
    // carry the Amount in litres. Detect "L" suffix and convert to ml.
    if (uom === 'ml' && amount < 10 && /\d\s*[Ll]\b/.test(ing)) {
      amount = Math.round(amount * 1000);
    }
    out.push({ ingredient: ing, amount, uom });
  }
  return out;
}

function parseCocktailSheet(wb: XLSX.WorkBook): CocktailLine[] {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets['cocktail'], { defval: null }) as Array<Record<string, unknown>>;
  const out: CocktailLine[] = [];
  let current = '';
  for (const r of rows) {
    if (r.name) current = String(r.name).trim();
    const ing = String(r.Ingredient ?? '').trim();
    const amount = Number(r.Amount);
    if (!current || !ing || !Number.isFinite(amount) || amount <= 0) continue;
    out.push({ cocktail: current, ingredient: ing, amount });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------
interface PlannedProduct {
  brand: string;
  productName: string;
  category: Cat;
  abvPercent: number;
  nominalVolumeMl: number;
  /** All distinct sizes seen for this product (each becomes a SKU). */
  sizesMl: number[];
}

function aggregateProducts(priceRows: PriceRow[]): Map<string, PlannedProduct> {
  const byKey = new Map<string, PlannedProduct>();
  for (const row of priceRows) {
    const ing = row.ingredient;
    const key = ing.toUpperCase().replace(/\s+/g, ' ');
    const { category, abv } = guessCategory(ing);
    const sizeMl = row.uom === 'pc' ? 330 : Math.round(row.amount);
    // Brand vs productName split: first word = brand, rest = productName.
    // For single-word names, productName mirrors brand only so the DB row is valid;
    // matching code dedupes brand tokens out of nameTokens to avoid double-counting.
    const parts = ing.split(/\s+/);
    const brand = parts[0];
    const productName = parts.length > 1 ? parts.slice(1).join(' ') : brand;

    if (!byKey.has(key)) {
      byKey.set(key, {
        brand,
        productName,
        category,
        abvPercent: abv,
        nominalVolumeMl: sizeMl,
        sizesMl: [sizeMl],
      });
    } else {
      const p = byKey.get(key)!;
      if (!p.sizesMl.includes(sizeMl)) p.sizesMl.push(sizeMl);
      // nominalVolumeMl = the largest size (the "bottle" entry)
      if (sizeMl > p.nominalVolumeMl) p.nominalVolumeMl = sizeMl;
    }
  }
  // Sort sizes descending so the biggest is "primary"
  for (const p of byKey.values()) p.sizesMl.sort((a, b) => b - a);
  return byKey;
}

// ---------------------------------------------------------------------------
// Ingredient → product matching (for cocktails)
// ---------------------------------------------------------------------------
function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritics
    .replace(/\b(shot|bottle|half|glass|cup)\b/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

/** Damerau-style Levenshtein distance, capped early for performance. */
function editDistance(a: string, b: string, cap = 4): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  const m = a.length, n = b.length;
  let prev = new Array(n + 1).fill(0);
  let curr = new Array(n + 1).fill(0);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > cap) return cap + 1;
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/** Generic category words that should NOT count as distinguishing productNames. */
const GENERIC_WORDS = new Set([
  'vodka', 'gin', 'whiskey', 'whisky', 'rum', 'tequila', 'brandy', 'liqueur',
  'wine', 'beer', 'water', 'cup', 'shot', 'red', 'white', 'rose', 'black',
  'blue', 'gold', 'silver',
]);

/** Tokenize a name into normalized words, dropping generics. */
function meaningfulTokens(s: string): string[] {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !GENERIC_WORDS.has(w));
}

/**
 * Find the closest product key for an unmatched ingredient name.
 *
 * Strict matching rules — false matches are worse than stubs:
 *   1. Token overlap: at least one meaningful (non-generic) token shared, and if the
 *      brand is ambiguous (>1 product shares it) require an additional product-name
 *      token match.
 *   2. Edit distance ≤ 2 against the full normalized name (typo tolerance only).
 */
/**
 * Hand-curated overrides for ingredient names that the heuristic can't match.
 * Keys are the cocktail-sheet ingredient string; values are the product KEY
 * (uppercased, single-spaced inventory name from the price sheet).
 */
const EXPLICIT_ALIASES: Record<string, string> = {
  'Acacia wine Medium Sweet White': 'ACACIA MEDIUM SWEET WHITE',
  'Amarulla': 'AMARULA',
  'Bols Blue Curaçao': 'BOLS BLUE',
  'Havana Club Añejo 3 Años': 'HAVANA',
  'Havava Rum Shot': 'HAVANA',
  'Kahlua': 'KAHULA',
};

function fuzzyMatch(
  ingredient: string,
  productByKey: Map<string, PlannedProduct>,
  brandCount: Map<string, number>,
): string | null {
  // Explicit overrides first.
  const aliased = EXPLICIT_ALIASES[ingredient.trim()];
  if (aliased && productByKey.has(aliased)) return aliased;

  const ingTokens = new Set(meaningfulTokens(ingredient));
  if (ingTokens.size === 0) return null;
  const normIng = normalize(ingredient);
  const firstIngToken = [...ingTokens][0];

  let best: { key: string; score: number; firstTokenBonus: number } | null = null;
  for (const [key, p] of productByKey) {
    const brandKey = p.brand.toUpperCase();
    const brandTokens = new Set(meaningfulTokens(p.brand));
    // Exclude brand tokens from name tokens to avoid double-counting when the brand
    // word appears inside the productName (e.g. "Bols White (bols Triple sec)").
    const rawNameTokens = new Set(meaningfulTokens(p.productName));
    const nameTokens = new Set([...rawNameTokens].filter((t) => !brandTokens.has(t)));
    const productTokens = new Set([...brandTokens, ...nameTokens]);

    const depl = (s: string) => (s.endsWith('s') && s.length > 3 ? s.slice(0, -1) : s);
    const brandHit = brandTokens.size === 0
      ? false
      : [...brandTokens].some((t) =>
          ingTokens.has(t) ||
          [...ingTokens].some((it) => depl(it) === t || depl(t) === it),
        );

    if (!brandHit) {
      // Typo fallback only for ingredients of ≥6 chars to avoid common-English-word
      // collisions ("Milk"→"Gila", "coca"→"Soda", "Honey"→"Hankey").
      if (normIng.length >= 6 && brandTokens.size > 0) {
        const targetBrand = normalize(p.brand);
        const targetFull = normalize(`${p.brand} ${p.productName === p.brand ? '' : p.productName}`.trim());
        const d = Math.min(
          editDistance(normIng, targetBrand, 2),
          editDistance(normIng, targetFull, 2),
        );
        if (d <= 2) {
          const candidate = { key, score: d, firstTokenBonus: 0 };
          if (!best || d < best.score) best = candidate;
        }
      }
      continue;
    }

    // Ambiguous brand (multiple products) — require a productName-token hit too.
    if ((brandCount.get(brandKey) ?? 0) > 1) {
      const nameHit = nameTokens.size > 0 && [...nameTokens].some((t) => ingTokens.has(t));
      if (!nameHit) continue;
    }

    // Score by token overlap (lower negative = more overlap = better).
    const overlap = [...ingTokens].filter((t) => productTokens.has(t)).length;
    const firstTokenBonus = brandTokens.has(firstIngToken) ? 1 : 0;
    const score = -overlap;
    if (
      !best ||
      score < best.score ||
      (score === best.score && firstTokenBonus > best.firstTokenBonus)
    ) {
      best = { key, score, firstTokenBonus };
    }
  }
  return best?.key ?? null;
}

interface PlannedRecipe {
  name: string;
  lines: Array<{ ingredient: string; matchedKey: string | null; stubKey: string | null; quantityMl: number }>;
}

function aggregateRecipes(
  cocktailLines: CocktailLine[],
  productByKey: Map<string, PlannedProduct>,
): { recipes: PlannedRecipe[]; stubs: Map<string, string> } {
  // Build a lookup: normalized ingredient name → product key
  const normToKey = new Map<string, string>();
  for (const [key, p] of productByKey) {
    const full = `${p.brand} ${p.productName}`;
    normToKey.set(normalize(full), key);
    normToKey.set(normalize(p.brand), key);
    normToKey.set(normalize(p.productName), key);
  }

  // Count how many products share a brand (case-insensitive) — needed by fuzzyMatch
  // to know when to require productName disambiguation.
  const brandCount = new Map<string, number>();
  for (const p of productByKey.values()) {
    const k = p.brand.toUpperCase();
    brandCount.set(k, (brandCount.get(k) ?? 0) + 1);
  }

  const recipes = new Map<string, PlannedRecipe>();
  // stubs: normalized name → first-seen display name (so "Lemon Juice"/"Lemon  Juice" collapse to one).
  const stubs = new Map<string, string>();
  for (const line of cocktailLines) {
    if (!recipes.has(line.cocktail)) recipes.set(line.cocktail, { name: line.cocktail, lines: [] });
    const rec = recipes.get(line.cocktail)!;
    const norm = normalize(line.ingredient);
    const matchedKey = normToKey.get(norm) ?? fuzzyMatch(line.ingredient, productByKey, brandCount);
    let stubKey: string | null = null;
    if (!matchedKey) {
      stubKey = norm;
      if (!stubs.has(norm)) stubs.set(norm, line.ingredient.trim().replace(/\s+/g, ' '));
    }
    rec.lines.push({ ingredient: line.ingredient, matchedKey, stubKey, quantityMl: line.amount });
  }
  return { recipes: [...recipes.values()], stubs };
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
async function main() {
  console.log(APPLY ? '🟢 APPLY mode — writes will be committed' : '🔵 DRY-RUN — no writes\n');

  const wb = XLSX.readFile(FILE);
  const priceRows = parsePriceSheet(wb);
  const cocktailLines = parseCocktailSheet(wb);

  const productPlan = aggregateProducts(priceRows);
  const { recipes, stubs } = aggregateRecipes(cocktailLines, productPlan);

  // ---------- summary ----------
  console.log(`Products planned: ${productPlan.size}`);
  console.log(`  by category:`);
  const byCat = new Map<string, number>();
  for (const p of productPlan.values()) byCat.set(p.category, (byCat.get(p.category) ?? 0) + 1);
  for (const [cat, n] of [...byCat].sort()) console.log(`    ${cat.padEnd(10)} ${n}`);

  const totalSkus = [...productPlan.values()].reduce((a, p) => a + p.sizesMl.length, 0);
  console.log(`\nSKUs planned: ${totalSkus} (one per distinct size)`);

  console.log(`\nRecipes planned: ${recipes.length}`);
  console.log(`  ingredient lines: ${recipes.reduce((a, r) => a + r.lines.length, 0)}`);
  console.log(`  unmatched ingredient names: ${stubs.size} (will be auto-created as OTHER stubs)`);

  if (stubs.size) {
    console.log(`  unmatched names:`);
    for (const [, display] of [...stubs].sort()) console.log(`    - ${display}`);
  }

  // ---------- detail dump ----------
  const sliceLen = VERBOSE ? productPlan.size : 10;
  console.log(`\n${VERBOSE ? 'All' : 'First 10'} product plans:`);
  for (const [, p] of [...productPlan.entries()].slice(0, sliceLen)) {
    console.log(
      `  ${p.brand.padEnd(15)} ${p.productName.padEnd(25)} ${p.category.padEnd(8)} ${p.abvPercent}%   sizes: ${p.sizesMl.join(', ')}ml`,
    );
  }
  console.log(`\nFirst 5 recipe plans:`);
  for (const r of recipes.slice(0, 5)) {
    console.log(`  ${r.name}`);
    for (const l of r.lines) {
      console.log(`    ${l.quantityMl}ml ${l.ingredient}${l.matchedKey ? '' : '  ⚠ STUB'}`);
    }
  }

  if (VERBOSE) {
    console.log('\nEvery cocktail ingredient → product match:');
    const seen = new Set<string>();
    for (const r of recipes) {
      for (const l of r.lines) {
        const k = l.ingredient + '||' + (l.matchedKey ?? '');
        if (seen.has(k)) continue;
        seen.add(k);
        const target = l.matchedKey
          ? `→ ${productPlan.get(l.matchedKey)!.brand} ${productPlan.get(l.matchedKey)!.productName}`
          : '→ STUB';
        console.log(`  ${l.ingredient.padEnd(45)} ${target}`);
      }
    }
  }

  if (!APPLY) {
    console.log('\n(Dry-run complete. Re-run with --apply to write.)');
    return;
  }

  // ---------- APPLY (no big transaction — Turso's per-statement latency makes
  // long-lived transactions fragile; idempotency makes re-runs safe instead) ----------
  const prisma = createPrismaClient();
  try {
    // Build all product plans (real + stubs) into a unified list keyed by their searchKey.
    interface ProductWriteSpec {
      key: string;            // logical lookup key used by SKUs & recipes
      searchKey: string;      // DB-side unique
      brand: string;
      productName: string;
      category: string;
      abvPercent: number;
      nominalVolumeMl: number;
    }
    const productSpecs: ProductWriteSpec[] = [];
    for (const [key, plan] of productPlan) {
      productSpecs.push({
        key,
        searchKey: computeSearchKey(plan.brand, plan.productName, plan.nominalVolumeMl),
        brand: plan.brand,
        productName: plan.productName,
        category: plan.category,
        abvPercent: plan.abvPercent,
        nominalVolumeMl: plan.nominalVolumeMl,
      });
    }
    const stubKeyByProductKey = new Map<string, string>(); // stub normalized name → ProductWriteSpec.key
    for (const [stubKey, display] of stubs) {
      const brand = display.split(/\s+/)[0];
      const productName = display.split(/\s+/).slice(1).join(' ') || display;
      const specKey = `__STUB__${stubKey}`;
      stubKeyByProductKey.set(stubKey, specKey);
      productSpecs.push({
        key: specKey,
        searchKey: computeSearchKey(brand, productName, 1),
        brand,
        productName,
        category: 'OTHER',
        abvPercent: 0,
        nominalVolumeMl: 1,
      });
    }

    // 1) ONE findMany to discover any existing products by searchKey.
    const allSearchKeys = productSpecs.map((s) => s.searchKey);
    const existingProducts = await prisma.product.findMany({
      where: { searchKey: { in: allSearchKeys } },
      select: { id: true, searchKey: true },
    });
    const productIdBySearchKey = new Map(existingProducts.map((p) => [p.searchKey!, p.id]));
    const toCreateProducts = productSpecs.filter((s) => !productIdBySearchKey.has(s.searchKey));

    console.log(`Products: ${existingProducts.length} already exist, ${toCreateProducts.length} to create.`);

    // 2) Bulk insert new products via createMany (no id returned for sqlite — we re-query).
    if (toCreateProducts.length > 0) {
      await prisma.product.createMany({
        data: toCreateProducts.map((s) => ({
          brand: s.brand,
          productName: s.productName,
          category: s.category,
          abvPercent: s.abvPercent,
          nominalVolumeMl: s.nominalVolumeMl,
          defaultDensity: getDensityForABV(s.abvPercent),
          searchKey: s.searchKey,
          isActive: true,
        })),
      });
      const justCreated = await prisma.product.findMany({
        where: { searchKey: { in: toCreateProducts.map((s) => s.searchKey) } },
        select: { id: true, searchKey: true },
      });
      for (const p of justCreated) productIdBySearchKey.set(p.searchKey!, p.id);
    }

    // Resolve productIdByKey for SKU/recipe joins.
    const productIdByKey = new Map<string, string>();
    for (const s of productSpecs) {
      const id = productIdBySearchKey.get(s.searchKey);
      if (id) productIdByKey.set(s.key, id);
    }

    // 3) SKUs — pre-resolve codes (collision-safe via suffix) and bulk insert missing.
    interface SkuWriteSpec {
      productKey: string;
      sizeMl: number;
      code: string;
      name: string;
      category: string;
      abv: number;
      isPrimary: boolean;
    }
    const skuSpecs: SkuWriteSpec[] = [];
    for (const [key, plan] of productPlan) {
      for (let i = 0; i < plan.sizesMl.length; i++) {
        const sizeMl = plan.sizesMl[i];
        const slug = `${plan.brand}-${plan.productName}-${sizeMl}ML`
          .toUpperCase()
          .normalize('NFKD')
          .replace(/[̀-ͯ]/g, '')
          .replace(/[^A-Z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
        skuSpecs.push({
          productKey: key,
          sizeMl,
          code: slug,
          name: `${plan.brand} ${plan.productName} ${sizeMl}ml`.trim(),
          category: plan.category,
          abv: plan.abvPercent,
          isPrimary: i === 0,
        });
      }
    }
    const allCodes = skuSpecs.map((s) => s.code);
    const existingSkus = await prisma.sKU.findMany({
      where: { code: { in: allCodes } },
      select: { id: true, code: true },
    });
    const skuIdByCode = new Map(existingSkus.map((s) => [s.code, s.id]));
    const toCreateSkus = skuSpecs.filter((s) => !skuIdByCode.has(s.code));
    console.log(`SKUs: ${existingSkus.length} already exist, ${toCreateSkus.length} to create.`);

    if (toCreateSkus.length > 0) {
      await prisma.sKU.createMany({
        data: toCreateSkus.map((s) => ({
          code: s.code,
          name: s.name,
          category: s.category,
          sizeMl: s.sizeMl,
          unit: 'ml',
          abvPercent: s.abv,
          densityGPerMl: getDensityForABV(s.abv),
          isActive: true,
        })),
      });
      const justCreated = await prisma.sKU.findMany({
        where: { code: { in: toCreateSkus.map((s) => s.code) } },
        select: { id: true, code: true },
      });
      for (const s of justCreated) skuIdByCode.set(s.code, s.id);
    }

    // 4) ProductSKU links — rely on the @@unique([productId, skuId]) constraint
    //    + skipDuplicates instead of a giant OR-existence check (SQLite caps OR
    //    depth at 100, and this list has hundreds of pairs).
    const linkSpecs = skuSpecs
      .map((s) => {
        const productId = productIdByKey.get(s.productKey);
        const skuId = skuIdByCode.get(s.code);
        if (!productId || !skuId) return null;
        return { productId, skuId, isPrimary: s.isPrimary };
      })
      .filter((x): x is { productId: string; skuId: string; isPrimary: boolean } => x !== null);

    // Insert per-row and swallow unique-constraint errors so re-runs are idempotent.
    // (libsql adapter doesn't support createMany skipDuplicates.)
    let linksCreated = 0, linksSkipped = 0;
    for (const link of linkSpecs) {
      try {
        await prisma.productSKU.create({ data: link });
        linksCreated++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : '';
        if (msg.includes('P2002') || msg.toLowerCase().includes('unique constraint')) {
          linksSkipped++;
        } else {
          throw e;
        }
      }
    }
    console.log(`ProductSKU links: ${linksCreated} created, ${linksSkipped} already existed.`);

    // 5) Recipes — check by name, then create (with nested ingredients). Done individually
    //    because each recipe has its own ingredient list. ~45 round-trips; tolerable.
    const existingRecipeNames = new Set(
      (await prisma.recipe.findMany({
        where: { name: { in: recipes.map((r) => r.name) } },
        select: { name: true },
      })).map((r) => r.name),
    );
    const toCreateRecipes = recipes.filter((r) => !existingRecipeNames.has(r.name));
    console.log(`Recipes: ${existingRecipeNames.size} already exist, ${toCreateRecipes.length} to create.`);

    for (const r of toCreateRecipes) {
      const ingredientCreates = r.lines
        .map((l) => {
          const productId = l.matchedKey
            ? productIdByKey.get(l.matchedKey)
            : l.stubKey
              ? productIdByKey.get(stubKeyByProductKey.get(l.stubKey)!)
              : undefined;
          if (!productId) return null;
          return { productId, quantityMl: l.quantityMl };
        })
        .filter((x): x is { productId: string; quantityMl: number } => x !== null);
      await prisma.recipe.create({
        data: {
          name: r.name,
          category: 'COCKTAIL',
          method: 'BUILT',
          isActive: true,
          ingredients: { create: ingredientCreates },
        },
      });
    }

    console.log('\n✅ Import committed.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
