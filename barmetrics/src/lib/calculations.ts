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

  // Calculate percent full if nominal volume provided
  const percentFull = nominalVolumeMl && nominalVolumeMl > 0
    ? Math.min(100, (volumeMl / nominalVolumeMl) * 100)
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
 * Liquor categories for product classification
 */
export const LIQUOR_CATEGORIES = [
  'VODKA',
  'GIN',
  'WHISKEY',
  'RUM',
  'TEQUILA',
  'BRANDY',
  'LIQUEUR',
  'MEZCAL',
  'COGNAC',
  'SCOTCH',
  'BOURBON',
  'OTHER',
] as const;

export type LiquorCategory = typeof LIQUOR_CATEGORIES[number];

/**
 * Common bottle sizes in ml
 */
export const BOTTLE_SIZES = [50, 100, 200, 375, 500, 700, 750, 1000, 1750] as const;

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

export const DEFAULT_STANDARD_POUR_ML = 44; // 1.5 oz standard shot
