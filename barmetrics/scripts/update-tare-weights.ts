#!/usr/bin/env tsx
/**
 * Backfill empty-bottle tare weights (Product.defaultTareG) from research.
 *
 * Values are primarily from the Navy MWR liquor tare-weight database (a public
 * inventory dataset covering ~944 SKUs at 750ml/1L), supplemented by:
 *   - Bartender inventory references (BarPatrol, AlcoholControls)
 *   - Manufacturer/packaging data (Open Food Facts, brand sustainability reports)
 *   - Category typicals for bottles with no public data (clearly labelled LOW).
 *
 * Confidence:
 *   HIGH   — direct citation from Navy MWR / corroborated published source.
 *   MEDIUM — single decent source, or a scaled analogue from same brand line.
 *   LOW    — no public data; category typical for the size/type.
 *
 * The Ethiopian local brands (Maraton, Kemila, Champion, Hankey Bannister,
 * King Robert II, Lion Pride, Gila Aenj/Rep, Arada, Habesha, Kegna, Ambo, and
 * the local wines) are ALL low-confidence — weighing one empty of each in the
 * bar and calibrating is recommended before trusting variance reports on them.
 *
 * Idempotent: only touches Products whose defaultTareG is currently NULL.
 * Dry-run by default. Pass --apply to write.
 *
 *   npx tsx --env-file=.env.local --env-file=.env scripts/update-tare-weights.ts
 */

import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const APPLY = process.argv.includes('--apply');

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

interface TareUpdate {
  brand: string;
  productName: string;
  sizeMl: number;
  tareG: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  source: string;
}

// Brand/productName strings below match the live DB values exactly (including
// quirks: curly apostrophes, "Hennesy", "Kahula", "Bailys", etc.).
const UPDATES: TareUpdate[] = [
  // VODKA
  { brand: 'Absolute',    productName: 'Vodka',       sizeMl: 1000, tareG: 734, confidence: 'HIGH',   source: 'Navy MWR 25.9 oz' },
  { brand: 'Smirnoff',    productName: 'Vodka',       sizeMl: 1000, tareG: 580, confidence: 'MEDIUM', source: 'Navy MWR 17.5 oz nudged to 1L category typical' },
  { brand: 'Stolichnaya', productName: 'Vodka',       sizeMl: 1000, tareG: 600, confidence: 'MEDIUM', source: 'Navy MWR 18.2 oz, nudged to category typical' },
  { brand: 'Kemila',      productName: 'Vodka',       sizeMl: 750,  tareG: 500, confidence: 'LOW',    source: 'category typical for 750 ml spirits (Ethiopian)' },
  { brand: 'Maraton',     productName: 'vodka',       sizeMl: 750,  tareG: 500, confidence: 'LOW',    source: 'category typical for 750 ml spirits (Ethiopian)' },

  // GIN
  { brand: 'Beefeater',   productName: 'Gin',         sizeMl: 1000, tareG: 641, confidence: 'HIGH',   source: 'Navy MWR 22.6 oz' },
  { brand: 'Bombay',      productName: 'Gin',         sizeMl: 1000, tareG: 689, confidence: 'HIGH',   source: 'Navy MWR Bombay Sapphire 24.3 oz' },
  { brand: 'Gordon’s',    productName: 'Gin',         sizeMl: 1000, tareG: 592, confidence: 'HIGH',   source: 'Navy MWR 20.9 oz' },
  { brand: 'Maraton',     productName: 'Gin',         sizeMl: 750,  tareG: 500, confidence: 'LOW',    source: 'category typical for 750 ml spirits (Ethiopian)' },
  { brand: 'Pink',        productName: 'Beefeater',   sizeMl: 1000, tareG: 641, confidence: 'MEDIUM', source: 'same Beefeater 1L bottle' },

  // WHISKEY / SCOTCH / BOURBON
  { brand: 'Black',         productName: 'Label',       sizeMl: 1000, tareG: 703, confidence: 'HIGH',   source: 'Navy MWR JW Black 24.8 oz' },
  { brand: 'Blue',          productName: 'Label',       sizeMl: 1000, tareG: 900, confidence: 'MEDIUM', source: 'JW Blue 750 = 635 g; scaled premium 1L ~900 g' },
  { brand: 'Red',           productName: 'Label',       sizeMl: 1000, tareG: 689, confidence: 'HIGH',   source: 'Navy MWR JW Red 24.3 oz' },
  { brand: 'Gold',          productName: 'Label',       sizeMl: 1000, tareG: 750, confidence: 'MEDIUM', source: 'JW Gold premium 1L estimate' },
  { brand: 'Double',        productName: 'Black Label', sizeMl: 1000, tareG: 720, confidence: 'MEDIUM', source: 'JW Black analogue + premium surcharge' },
  { brand: 'Champion',      productName: 'Scotch',      sizeMl: 750,  tareG: 500, confidence: 'LOW',    source: 'category typical for 750 ml spirits (Ethiopian)' },
  { brand: 'Chivas',        productName: 'Scotch',      sizeMl: 1000, tareG: 595, confidence: 'HIGH',   source: 'Navy MWR 21.0 oz' },
  { brand: 'Glenfiddich',   productName: 'Scotch',      sizeMl: 1000, tareG: 706, confidence: 'HIGH',   source: 'Navy MWR 24.9 oz (triangular heavy bottle)' },
  { brand: 'Grant',         productName: 'Scotch',      sizeMl: 1000, tareG: 663, confidence: 'HIGH',   source: 'Navy MWR 23.4 oz' },
  { brand: 'Hankey',        productName: 'whiskey',     sizeMl: 1000, tareG: 600, confidence: 'LOW',    source: 'category typical 1L spirits (no public data)' },
  { brand: 'Jack',          productName: 'Daniel Honey',sizeMl: 1000, tareG: 595, confidence: 'HIGH',   source: 'Navy MWR JD Honey 21.0 oz' },
  { brand: 'Jameson',       productName: 'Whiskey',     sizeMl: 1000, tareG: 604, confidence: 'HIGH',   source: 'Navy MWR 21.3 oz' },
  { brand: 'King',          productName: 'Roberts whisky',sizeMl: 1000, tareG: 580, confidence: 'LOW',  source: 'category typical for budget Scotch 1L' },
  { brand: 'Lion',          productName: 'pride whiskey',sizeMl: 1000, tareG: 580, confidence: 'LOW',   source: 'category typical 1L spirits (Ethiopian)' },
  { brand: 'Maker’s',       productName: 'Mark',        sizeMl: 1000, tareG: 694, confidence: 'HIGH',   source: 'Navy MWR 24.5 oz (wax-dipped neck)' },

  // RUM (Bacardi only exists at 30 ml in the DB — skipped, no bottle entry)
  { brand: 'Havana',  productName: 'Rum',  sizeMl: 1000, tareG: 600, confidence: 'LOW',    source: 'category typical 1L spirits (Havana Club Anejo)' },
  { brand: 'Havana',  productName: 'Dark', sizeMl: 1000, tareG: 650, confidence: 'LOW',    source: 'category typical, 7yr uses slightly heavier glass' },
  { brand: 'Malibu',  productName: 'Rum',  sizeMl: 1000, tareG: 646, confidence: 'HIGH',   source: 'Navy MWR 22.8 oz (opaque white bottle)' },

  // TEQUILA
  { brand: 'Anejo',    productName: 'Patron',    sizeMl: 1000, tareG: 1250, confidence: 'MEDIUM', source: 'Patron heavy hand-blown clear glass; scaled from 750ml 714 g' },
  { brand: 'Camino',   productName: 'tequila',   sizeMl: 750,  tareG: 500,  confidence: 'LOW',    source: 'category typical 750 ml spirits' },
  { brand: 'Casamigos',productName: 'Tequila',   sizeMl: 1000, tareG: 900,  confidence: 'MEDIUM', source: 'heavy decorative bottle, premium 1L' },
  { brand: 'Corralejo',productName: 'Tequila',   sizeMl: 750,  tareG: 700,  confidence: 'MEDIUM', source: 'tall heavy distinctive bottle' },
  { brand: 'Gila',     productName: 'Aenj',      sizeMl: 750,  tareG: 500,  confidence: 'LOW',    source: 'category typical 750 ml spirits (Ethiopian)' },
  { brand: 'Gila',     productName: 'Rep',       sizeMl: 750,  tareG: 500,  confidence: 'LOW',    source: 'category typical 750 ml spirits (Ethiopian)' },
  { brand: 'Jose',     productName: 'Cuervo Silve', sizeMl: 1000, tareG: 585, confidence: 'HIGH', source: 'Navy MWR Cuervo White (Silver) 20.5 oz' },
  { brand: 'Olmeca',   productName: 'chocolate', sizeMl: 1000, tareG: 620,  confidence: 'LOW',    source: 'category typical 1L spirits (Olmeca std bottle)' },
  { brand: 'Sierra',   productName: 'Tequila',   sizeMl: 1000, tareG: 720,  confidence: 'MEDIUM', source: 'Sierra sombrero-cap bottle, heavier glass' },

  // BRANDY / COGNAC
  { brand: 'Hennesy',  productName: 'v.s.o.p',   sizeMl: 1000, tareG: 850,  confidence: 'MEDIUM', source: 'Hennessy VSOP 1L heavy cognac glass 800–900 g (industry analogue)' },

  // LIQUEURS
  { brand: 'Amarula',      productName: 'Liqueur',     sizeMl: 1000, tareG: 700, confidence: 'MEDIUM', source: 'opaque cream-liqueur bottle, Baileys analogue +40 g' },
  { brand: 'Aperol',       productName: 'Liqueur',     sizeMl: 1000, tareG: 620, confidence: 'MEDIUM', source: 'Aperol 1L medium-heavy bottle' },
  { brand: 'Bailys',       productName: 'Liqueur',     sizeMl: 1000, tareG: 660, confidence: 'HIGH',   source: 'Navy MWR Baileys 23.3 oz' },
  { brand: 'Bols',         productName: 'Blue',        sizeMl: 750,  tareG: 607, confidence: 'HIGH',   source: 'Navy MWR Bols Blue Curacao 21.4 oz' },
  { brand: 'Bols',         productName: 'White( bols Triple sec)', sizeMl: 750, tareG: 607, confidence: 'HIGH', source: 'Navy MWR Bols Triple Sec 21.4 oz' },
  { brand: 'Campari',      productName: 'Liqueur',     sizeMl: 1000, tareG: 646, confidence: 'HIGH',   source: 'Navy MWR 22.8 oz' },
  { brand: 'Fernet',       productName: 'Liqueur',     sizeMl: 1000, tareG: 730, confidence: 'MEDIUM', source: 'Fernet 750 = 592 g; scaled to 1L dark heavy glass' },
  { brand: 'Kahula',       productName: 'Liqueur',     sizeMl: 1000, tareG: 697, confidence: 'HIGH',   source: 'Navy MWR Kahlua 24.6 oz' },
  { brand: 'Luxardo',      productName: 'Liqueur',     sizeMl: 750,  tareG: 650, confidence: 'MEDIUM', source: 'Luxardo Maraschino tall straw-wrapped heavier glass' },
  { brand: 'Martini',      productName: 'Bianco',      sizeMl: 1000, tareG: 570, confidence: 'MEDIUM', source: 'Bacardi 2025 MARTINI lighter-bottle redesign ~570 g' },
  { brand: 'Martini',      productName: 'Extra Dry',   sizeMl: 750,  tareG: 470, confidence: 'MEDIUM', source: 'same MARTINI line scaled to 750 ml' },
  { brand: 'Martini',      productName: 'Rosso',       sizeMl: 1000, tareG: 570, confidence: 'MEDIUM', source: 'same MARTINI 1L bottle as Bianco' },
  { brand: 'Villia',       productName: 'Massa',       sizeMl: 1000, tareG: 700, confidence: 'LOW',    source: 'Villa Massa Limoncello premium frosted bottle' },

  // WINES (Ethiopian, all 750 ml)
  { brand: 'Acacia',       productName: 'Dry Red',           sizeMl: 750, tareG: 500, confidence: 'LOW', source: 'category typical 750 ml wine' },
  { brand: 'Acacia',       productName: 'Medium Sweet Red',  sizeMl: 750, tareG: 500, confidence: 'LOW', source: 'category typical 750 ml wine' },
  { brand: 'Acacia',       productName: 'Medium Sweet Rose', sizeMl: 750, tareG: 500, confidence: 'LOW', source: 'category typical 750 ml wine' },
  { brand: 'Acacia',       productName: 'Medium Sweet White',sizeMl: 750, tareG: 500, confidence: 'LOW', source: 'category typical 750 ml wine' },
  { brand: 'Rift',         productName: 'valley dry red',    sizeMl: 750, tareG: 500, confidence: 'LOW', source: 'category typical 750 ml wine' },
  { brand: 'Rift',         productName: 'valley dry white',  sizeMl: 750, tareG: 500, confidence: 'LOW', source: 'category typical 750 ml wine' },

  // BEERS (330 ml)
  { brand: 'Arada',        productName: 'Beer',     sizeMl: 330, tareG: 215, confidence: 'LOW',    source: 'category typical 330 ml beer (Ethiopian)' },
  { brand: 'Habesha',      productName: 'Beer',     sizeMl: 330, tareG: 215, confidence: 'LOW',    source: 'category typical 330 ml beer (Ethiopian)' },
  { brand: 'Heineken',     productName: 'Beer',     sizeMl: 330, tareG: 210, confidence: 'MEDIUM', source: 'Heineken 330 ml green glass ~205–215 g (widely cited)' },
  { brand: 'Kegna',        productName: 'Beer',     sizeMl: 330, tareG: 215, confidence: 'LOW',    source: 'category typical 330 ml beer (Ethiopian)' },

  // MIXERS / WATER (real bottles, not the 1-ml recipe stubs)
  { brand: 'Ambo',         productName: 'Water',    sizeMl: 330,  tareG: 210, confidence: 'LOW', source: 'category typical 330 ml glass sparkling water bottle' },
  { brand: 'Soda',         productName: 'Water',    sizeMl: 300,  tareG: 200, confidence: 'LOW', source: 'category typical 300 ml glass soda bottle' },
  { brand: 'water',        productName: '0.5 L',    sizeMl: 500,  tareG: 18,  confidence: 'LOW', source: 'category typical 500 ml PET water bottle' },
  { brand: 'water',        productName: '1L',       sizeMl: 1000, tareG: 28,  confidence: 'LOW', source: 'category typical 1000 ml PET water bottle' },
];

async function main() {
  const prisma = createPrismaClient();
  console.log(APPLY ? '🟢 APPLY — writing tare weights\n' : '🔵 DRY-RUN — no writes\n');

  try {
    const all = await prisma.product.findMany({
      where: { defaultTareG: null },
      select: { id: true, brand: true, productName: true, nominalVolumeMl: true, category: true },
    });

    // Build a quick (brand|productName|size) → product map for exact lookup.
    const productByKey = new Map<string, typeof all[number]>();
    for (const p of all) {
      productByKey.set(`${p.brand}|${p.productName}|${p.nominalVolumeMl}`, p);
    }

    const planned: Array<{ id: string; brand: string; productName: string; sizeMl: number; tareG: number; confidence: string; source: string }> = [];
    const missingFromDb: TareUpdate[] = [];

    for (const u of UPDATES) {
      const k = `${u.brand}|${u.productName}|${u.sizeMl}`;
      const p = productByKey.get(k);
      if (!p) {
        missingFromDb.push(u);
        continue;
      }
      planned.push({ id: p.id, brand: u.brand, productName: u.productName, sizeMl: u.sizeMl, tareG: u.tareG, confidence: u.confidence, source: u.source });
    }

    console.log(`Planned updates: ${planned.length} of ${UPDATES.length}`);
    const byConf = planned.reduce<Record<string, number>>((a, p) => ((a[p.confidence] = (a[p.confidence] ?? 0) + 1), a), {});
    console.log(`  by confidence: ${Object.entries(byConf).map(([k, v]) => `${k}=${v}`).join('  ')}`);
    console.log(`Products still missing tare after this run: ${all.length - planned.length}  (mostly 1-ml recipe stubs and 30-ml pour-only entries)\n`);

    for (const p of planned) {
      console.log(`  [${p.confidence}] ${p.brand} ${p.productName} (${p.sizeMl}ml) → ${p.tareG}g  // ${p.source}`);
    }

    if (missingFromDb.length > 0) {
      console.log('\nResearch entries with no matching DB product (skipped):');
      for (const m of missingFromDb) console.log(`  - ${m.brand} ${m.productName} ${m.sizeMl}ml`);
    }

    if (!APPLY) {
      console.log('\n(Dry-run complete. Re-run with --apply to write.)');
      return;
    }

    let n = 0;
    for (const p of planned) {
      await prisma.product.update({ where: { id: p.id }, data: { defaultTareG: p.tareG } });
      n++;
    }
    console.log(`\n✅ Updated ${n} products.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
