/**
 * Core calculation functions for bar inventory management
 * Based on the principle that liquor volume can be calculated from weight
 * using density values that vary with alcohol content (ABV)
 */

/**
 * Density lookup table for common ABV percentages
 * Density decreases as alcohol content increases (alcohol is less dense than water)
 * Values in g/ml
 */
const DENSITY_TABLE: Record<number, number> = {
  0: 1.0,    // Water
  10: 0.985, // Wine/low ABV
  15: 0.978, // Fortified wine
  20: 0.969, // Liqueurs
  25: 0.962, // Low-proof liqueurs
  30: 0.954, // Some liqueurs
  35: 0.946, // Some spirits
  40: 0.938, // Standard spirits (vodka, whiskey, gin, rum)
  45: 0.930, // Higher proof spirits
  50: 0.922, // 100 proof
  55: 0.914, // Overproof
  60: 0.906, // Cask strength whiskey
  65: 0.898,
  70: 0.890, // High-proof rum
  75: 0.882,
  80: 0.874, // Everclear-type
};

/**
 * Get density for a given ABV percentage using linear interpolation
 * @param abvPercent - Alcohol by volume percentage (0-100)
 * @returns Density in g/ml
 */
export function getDensityForABV(abvPercent: number): number {
  // Clamp ABV to valid range
  const clampedABV = Math.max(0, Math.min(80, abvPercent));

  // Find surrounding values in table
  const abvKeys = Object.keys(DENSITY_TABLE).map(Number).sort((a, b) => a - b);

  // Find the lower and upper bounds
  let lowerABV = 0;
  let upperABV = 80;

  for (const key of abvKeys) {
    if (key <= clampedABV) {
      lowerABV = key;
    }
    if (key >= clampedABV) {
      upperABV = key;
      break;
    }
  }

  // If exact match, return directly
  if (lowerABV === clampedABV) {
    return DENSITY_TABLE[lowerABV];
  }

  // Linear interpolation
  const lowerDensity = DENSITY_TABLE[lowerABV];
  const upperDensity = DENSITY_TABLE[upperABV];
  const ratio = (clampedABV - lowerABV) / (upperABV - lowerABV);

  return lowerDensity - (lowerDensity - upperDensity) * ratio;
}

export interface VolumeCalculationParams {
  grossWeightG: number;
  tareWeightG: number;
  abvPercent: number;
  nominalVolumeMl?: number;
  standardPourMl?: number;
}

export interface VolumeCalculationResult {
  netMassG: number;
  densityGPerMl: number;
  volumeMl: number;
  volumeL: number;
  percentFull: number | null;
  poursRemaining: number | null;
}

/**
 * Calculate volume of remaining liquor from weight measurements
 * @param params - Calculation parameters
 * @returns Calculated volume and related metrics
 */
export function calculateVolumeFromWeight(params: VolumeCalculationParams): VolumeCalculationResult {
  const { grossWeightG, tareWeightG, abvPercent, nominalVolumeMl, standardPourMl } = params;

  // Calculate net mass (liquid only)
  const netMassG = Math.max(0, grossWeightG - tareWeightG);

  // Get density for this ABV
  const densityGPerMl = getDensityForABV(abvPercent);

  // Calculate volume: mass / density
  const volumeMl = netMassG / densityGPerMl;
  const volumeL = volumeMl / 1000;

  // Calculate percent full if nominal volume provided, capped at 100%
  const percentFull = nominalVolumeMl && nominalVolumeMl > 0
    ? Math.min((volumeMl / nominalVolumeMl) * 100, 100)
    : null;

  // Calculate pours remaining if standard pour provided
  const poursRemaining = standardPourMl && standardPourMl > 0
    ? volumeMl / standardPourMl
    : null;

  return {
    netMassG: Math.round(netMassG * 100) / 100,
    densityGPerMl: Math.round(densityGPerMl * 1000) / 1000,
    volumeMl: Math.round(volumeMl * 10) / 10,
    volumeL: Math.round(volumeL * 1000) / 1000,
    percentFull: percentFull !== null ? Math.round(percentFull * 10) / 10 : null,
    poursRemaining: poursRemaining !== null ? Math.round(poursRemaining * 10) / 10 : null,
  };
}

/**
 * Typical tare weights by bottle size (in grams)
 * Based on industry averages for glass liquor bottles
 */
const TARE_WEIGHTS_BY_SIZE: Record<number, number> = {
  50: 50,     // Mini/nip
  100: 80,    // 100ml
  200: 150,   // 200ml
  375: 280,   // Half bottle
  500: 350,   // 500ml
  700: 420,   // 700ml (common in Europe)
  750: 480,   // Standard 750ml
  1000: 560,  // 1 liter
  1750: 800,  // Handle
};

/**
 * Suggest a tare weight based on bottle size
 * Uses linear interpolation for non-standard sizes
 * @param nominalVolumeMl - Bottle size in ml
 * @returns Suggested tare weight in grams
 */
export function suggestTareWeight(nominalVolumeMl: number): number {
  // Check for exact match
  if (TARE_WEIGHTS_BY_SIZE[nominalVolumeMl]) {
    return TARE_WEIGHTS_BY_SIZE[nominalVolumeMl];
  }

  // Find surrounding sizes for interpolation
  const sizes = Object.keys(TARE_WEIGHTS_BY_SIZE).map(Number).sort((a, b) => a - b);

  // Handle edge cases
  if (nominalVolumeMl <= sizes[0]) {
    return TARE_WEIGHTS_BY_SIZE[sizes[0]];
  }
  if (nominalVolumeMl >= sizes[sizes.length - 1]) {
    return TARE_WEIGHTS_BY_SIZE[sizes[sizes.length - 1]];
  }

  // Find bounds
  let lowerSize = sizes[0];
  let upperSize = sizes[sizes.length - 1];

  for (let i = 0; i < sizes.length - 1; i++) {
    if (sizes[i] <= nominalVolumeMl && sizes[i + 1] >= nominalVolumeMl) {
      lowerSize = sizes[i];
      upperSize = sizes[i + 1];
      break;
    }
  }

  // Linear interpolation
  const lowerTare = TARE_WEIGHTS_BY_SIZE[lowerSize];
  const upperTare = TARE_WEIGHTS_BY_SIZE[upperSize];
  const ratio = (nominalVolumeMl - lowerSize) / (upperSize - lowerSize);

  return Math.round(lowerTare + (upperTare - lowerTare) * ratio);
}

/**
 * Calculate expected full bottle weight
 * @param tareWeightG - Empty bottle weight in grams
 * @param nominalVolumeMl - Bottle capacity in ml
 * @param abvPercent - Alcohol by volume percentage
 * @returns Expected full bottle weight in grams
 */
export function calculateFullBottleWeight(
  tareWeightG: number,
  nominalVolumeMl: number,
  abvPercent: number
): number {
  const density = getDensityForABV(abvPercent);
  const liquidWeightG = nominalVolumeMl * density;
  return Math.round((tareWeightG + liquidWeightG) * 10) / 10;
}

/**
 * TTB Standards of Fill — authorized US bottle sizes for distilled spirits.
 * 27 CFR Part 5, Subpart K. New imports/forms should restrict to this set.
 */
export const STANDARD_BOTTLE_SIZES = [
  50, 100, 187, 200, 250, 350, 375, 500, 700, 720, 750, 1000, 1500, 1750, 3000,
] as const;
export type StandardBottleSize = typeof STANDARD_BOTTLE_SIZES[number];

/**
 * Backward-compatible alias used by older imports. Prefer STANDARD_BOTTLE_SIZES.
 */
export const BOTTLE_SIZES = STANDARD_BOTTLE_SIZES;

/**
 * TTB top-level distilled-spirits classes (the broad "what is it" bucket).
 * Sub-types like BOURBON/SCOTCH/COGNAC live under LIQUOR_SUBCLASSES.
 */
export const LIQUOR_CLASSES = [
  'VODKA',
  'GIN',
  'RUM',
  'TEQUILA',
  'MEZCAL',
  'WHISKEY',
  'BRANDY',
  'LIQUEUR',
  'BITTERS',
  'VERMOUTH',
  'OTHER',
] as const;
export type LiquorClass = typeof LIQUOR_CLASSES[number];

/**
 * Sub-classes per top-level class. Empty array = no sub-classification used.
 */
export const LIQUOR_SUBCLASSES: Record<LiquorClass, readonly string[]> = {
  VODKA:    [],
  GIN:      ['LONDON_DRY', 'PLYMOUTH', 'OLD_TOM', 'GENEVER', 'CONTEMPORARY'],
  RUM:      ['WHITE', 'GOLD', 'DARK', 'SPICED', 'OVERPROOF', 'AGED'],
  TEQUILA:  ['BLANCO', 'REPOSADO', 'ANEJO', 'EXTRA_ANEJO', 'CRISTALINO'],
  MEZCAL:   ['JOVEN', 'REPOSADO', 'ANEJO'],
  WHISKEY:  ['BOURBON', 'RYE', 'TENNESSEE', 'SCOTCH_SINGLE_MALT', 'SCOTCH_BLENDED', 'IRISH', 'CANADIAN', 'JAPANESE', 'AMERICAN'],
  BRANDY:   ['COGNAC', 'ARMAGNAC', 'CALVADOS', 'PISCO', 'AMERICAN'],
  LIQUEUR:  ['CREAM', 'COFFEE', 'HERBAL', 'FRUIT', 'NUT', 'CHOCOLATE', 'TRIPLE_SEC', 'AMARO'],
  BITTERS:  [],
  VERMOUTH: ['DRY', 'SWEET', 'BLANC'],
  OTHER:    [],
} as const;

/**
 * NFKD-fold a string and reduce to lowercase alphanumeric only.
 * Stable across accents/whitespace/punctuation — safe for dedup keys.
 */
export function normalizeForKey(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[\u0300-\u036F]/g, '') // strip combining diacritical marks (NFKD residue)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

/**
 * Canonical search key: NFKD(brand + productName) + sizeMl.
 * Used as the UNIQUE natural key on Product to prevent duplicate spirits.
 */
export function computeSearchKey(brand: string, productName: string, sizeMl: number): string {
  return `${normalizeForKey(brand)}-${normalizeForKey(productName)}-${sizeMl}`;
}

/**
 * Normalize free-text brand/productName: trim, fold smart quotes, collapse whitespace.
 * Diacritics are preserved for display (only stripped inside searchKey).
 */
export function normalizeSpiritName(s: string): string {
  return s
    .replace(/[‘’‚‛]/g, "'") // smart quotes -> ASCII apostrophe
    .replace(/[“”„‟]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Derive an age statement in whole years from a productName string.
 * Returns null if no obvious age is implied.
 * Heuristics: explicit "12 Year" / "12yr", and well-known cognac grades.
 */
export function deriveAgeStatement(productName: string): number | null {
  const m = productName.match(/(\d+)\s*(?:yr|year|yo|y\.o\.)\b/i);
  if (m) return parseInt(m[1], 10);
  const n = productName.match(/\b(\d{1,2})\s*y(ear)?s?\b/i);
  if (n) return parseInt(n[1], 10);
  // Cognac age grades (minimum cask years, per BNIC)
  if (/\bVS\b/.test(productName)) return 2;
  if (/\bVSOP\b/i.test(productName)) return 4;
  if (/\bXO\b/i.test(productName)) return 10;
  if (/\bNapole(o|ó)n\b/i.test(productName)) return 6;
  return null;
}

/**
 * Validate a GS1 GTIN-12 (UPC-A) or GTIN-13 (EAN-13) check digit.
 * Returns true if the string is digits-only and the checksum matches.
 */
export function isValidGtin(raw: string): boolean {
  const s = raw.replace(/\D/g, '');
  if (s.length !== 12 && s.length !== 13) return false;
  const digits = s.split('').map(Number);
  const check = digits.pop()!;
  // GS1 weights: alternate 3,1 from right-to-left of body.
  let sum = 0;
  for (let i = digits.length - 1, mul = 3; i >= 0; i--, mul = mul === 3 ? 1 : 3) {
    sum += digits[i] * mul;
  }
  const expected = (10 - (sum % 10)) % 10;
  return expected === check;
}

/**
 * Standard pour sizes in ml
 */
export const STANDARD_POUR_SIZES = {
  shot: 44,      // 1.5 oz
  jigger: 44,    // 1.5 oz
  pony: 30,      // 1 oz
  double: 60,    // 2 oz
  wine: 150,     // 5 oz wine pour
  beer: 355,     // 12 oz beer
} as const;

export const DEFAULT_STANDARD_POUR_ML = 30; // 1 oz standard pour
