/**
 * Re-tag products that were imported as `OTHER` into the proper
 * BEER / WINE / NON_ALCOHOLIC buckets now that those categories exist.
 *
 * Matches by (brand, productName) — case-insensitive, trimmed.
 * Dry-run by default. Pass `--apply` to write.
 *
 *   pnpm tsx --env-file=.env.local --env-file=.env scripts/retag-other-products.ts
 *   pnpm tsx --env-file=.env.local --env-file=.env scripts/retag-other-products.ts --apply
 *
 * The 1 ml recipe-ingredient stubs (Coca/Cola, juices, syrups, egg, milk, …)
 * are intentionally not touched — they are recipe text refs, not stocked bottles.
 */
import { prisma } from '../src/lib/db';

type Mapping = {
  brand: string;
  productName: string;
  category: 'BEER' | 'WINE' | 'NON_ALCOHOLIC';
  subClass: string;
};

const MAPPINGS: Mapping[] = [
  // ---- Beers (Ethiopian + Heineken, all pale lagers) ----
  { brand: 'Arada',    productName: 'Beer', category: 'BEER', subClass: 'LAGER' },
  { brand: 'Habesha',  productName: 'Beer', category: 'BEER', subClass: 'LAGER' },
  { brand: 'Heineken', productName: 'Beer', category: 'BEER', subClass: 'LAGER' },
  { brand: 'Kegna',    productName: 'Beer', category: 'BEER', subClass: 'LAGER' },

  // ---- Wines ----
  { brand: 'Acacia', productName: 'Dry Red',            category: 'WINE', subClass: 'RED'   },
  { brand: 'Acacia', productName: 'Medium Sweet Red',   category: 'WINE', subClass: 'RED'   },
  { brand: 'Acacia', productName: 'Medium Sweet Rose',  category: 'WINE', subClass: 'ROSE'  },
  { brand: 'Acacia', productName: 'Medium Sweet White', category: 'WINE', subClass: 'WHITE' },
  { brand: 'Rift',   productName: 'valley dry red',     category: 'WINE', subClass: 'RED'   },
  { brand: 'Rift',   productName: 'valley dry white',   category: 'WINE', subClass: 'WHITE' },

  // ---- Non-alcoholic bottled drinks (real stocked items, not 1ml recipe stubs) ----
  { brand: 'Ambo',  productName: 'Water', category: 'NON_ALCOHOLIC', subClass: 'WATER' },
  { brand: 'Soda',  productName: 'Water', category: 'NON_ALCOHOLIC', subClass: 'SODA'  },
  { brand: 'water', productName: '0.5 L', category: 'NON_ALCOHOLIC', subClass: 'WATER' },
  { brand: 'water', productName: '1L',    category: 'NON_ALCOHOLIC', subClass: 'WATER' },
];

async function main() {
  const apply = process.argv.includes('--apply');
  console.log(`Mode: ${apply ? 'APPLY (writing to DB)' : 'DRY RUN (no writes)'}\n`);

  const candidates = await prisma.product.findMany({
    where: { category: 'OTHER' },
    select: { id: true, brand: true, productName: true, category: true, subClass: true },
  });

  const norm = (s: string | null | undefined) =>
    (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

  let updated = 0;
  const unmatched: typeof MAPPINGS = [];

  for (const m of MAPPINGS) {
    const hit = candidates.find(
      (c) => norm(c.brand) === norm(m.brand) && norm(c.productName) === norm(m.productName),
    );
    if (!hit) {
      unmatched.push(m);
      continue;
    }
    const before = `${hit.category}/${hit.subClass ?? '—'}`;
    const after  = `${m.category}/${m.subClass}`;
    if (before === after) {
      console.log(`  · already correct: ${hit.brand} ${hit.productName} (${after})`);
      continue;
    }
    console.log(`  → ${hit.brand.padEnd(10)} ${(hit.productName ?? '').padEnd(22)}  ${before.padEnd(15)} → ${after}`);
    if (apply) {
      await prisma.product.update({
        where: { id: hit.id },
        data: { category: m.category, subClass: m.subClass },
      });
    }
    updated++;
  }

  console.log(`\n${apply ? 'Updated' : 'Would update'} ${updated} products.`);
  if (unmatched.length) {
    console.log(`\nUnmatched mappings (${unmatched.length}):`);
    for (const u of unmatched) console.log(`  · ${u.brand} / ${u.productName}`);
  }

  await prisma.$disconnect();
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
