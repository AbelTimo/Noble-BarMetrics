/**
 * Inventory Calculation Utilities for Weight-Based Counting
 *
 * These functions calculate remaining liquid volume from bottle weight measurements.
 */

/**
 * Calculate liquid density from ABV percentage
 * Uses weighted average of alcohol (0.789 g/ml) and water (1.0 g/ml)
 */
export function calculateDensityFromABV(abvPercent: number): number {
  const alcoholDensity = 0.789; // g/ml at 20°C
  const waterDensity = 1.0; // g/ml

  const alcoholFraction = abvPercent / 100;
  const waterFraction = 1 - alcoholFraction;

  // Weighted average density
  return (alcoholDensity * alcoholFraction) + (waterDensity * waterFraction);
}

/**
 * Get effective density for calculations
 * Priority: explicit densityGPerMl > calculated from ABV > default (0.95)
 */
export function getEffectiveDensity(
  densityGPerMl?: number | null,
  abvPercent?: number | null
): number {
  if (densityGPerMl && densityGPerMl > 0) {
    return densityGPerMl;
  }

  if (abvPercent && abvPercent > 0) {
    return calculateDensityFromABV(abvPercent);
  }

  // Default density (typical for spirits ~40% ABV)
  return 0.95;
}

/**
 * Calculate remaining volume from weight measurement
 */
export interface VolumeCalculationInput {
  grossWeightG: number;
  bottleTareG: number;
  sizeMl: number;
  densityGPerMl?: number | null;
  abvPercent?: number | null;
}

export interface VolumeCalculationResult {
  netLiquidG: number;
  remainingVolumeMl: number;
  remainingPercent: number;
  isValid: boolean;
  warnings: string[];
  errors: string[];
}

export function calculateVolumeFromWeight(
  input: VolumeCalculationInput
): VolumeCalculationResult {
  const { grossWeightG, bottleTareG, sizeMl, densityGPerMl, abvPercent } = input;

  const warnings: string[] = [];
  const errors: string[] = [];

  // Calculate net liquid weight
  const netLiquidG = grossWeightG - bottleTareG;

  // Validation: net weight must be positive
  if (netLiquidG < 0) {
    errors.push(`Weight is less than bottle tare (${bottleTareG}g). Please verify measurement.`);
    return {
      netLiquidG: 0,
      remainingVolumeMl: 0,
      remainingPercent: 0,
      isValid: false,
      warnings,
      errors,
    };
  }

  // Get density for calculation
  const density = getEffectiveDensity(densityGPerMl, abvPercent);

  // Calculate volume
  let remainingVolumeMl = netLiquidG / density;

  // Warning: if calculated volume exceeds bottle size
  if (remainingVolumeMl > sizeMl * 1.2) {
    warnings.push(`Calculated volume (${remainingVolumeMl.toFixed(0)}ml) exceeds bottle size (${sizeMl}ml) by >20%. Please verify weight.`);
  }

  // Clamp volume to reasonable bounds
  remainingVolumeMl = Math.max(0, Math.min(remainingVolumeMl, sizeMl));

  // Calculate percentage
  const remainingPercent = (remainingVolumeMl / sizeMl) * 100;

  return {
    netLiquidG: Math.round(netLiquidG * 10) / 10, // 1 decimal
    remainingVolumeMl: Math.round(remainingVolumeMl),
    remainingPercent: Math.round(remainingPercent * 10) / 10, // 1 decimal
    isValid: errors.length === 0,
    warnings,
    errors,
  };
}

/**
 * Validate weight input before calculation
 */
export interface WeightValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
}

export function validateWeightInput(
  grossWeightG: number,
  bottleTareG: number,
  sizeMl: number,
  densityGPerMl?: number | null,
  abvPercent?: number | null
): WeightValidationResult {
  // Must be positive
  if (grossWeightG <= 0) {
    return {
      isValid: false,
      error: 'Weight must be greater than 0',
    };
  }

  // Must be at least tare weight
  if (grossWeightG < bottleTareG) {
    return {
      isValid: false,
      error: `Weight (${grossWeightG}g) is less than empty bottle weight (${bottleTareG}g)`,
    };
  }

  // Sanity check: full bottle shouldn't weigh too much
  const density = getEffectiveDensity(densityGPerMl, abvPercent);
  const maxExpectedWeight = bottleTareG + (sizeMl * density * 1.2); // 20% buffer

  if (grossWeightG > maxExpectedWeight) {
    return {
      isValid: true,
      warning: `Weight seems high for this bottle size. Expected max ~${Math.round(maxExpectedWeight)}g`,
    };
  }

  return { isValid: true };
}

/**
 * Format volume for display (with unit)
 */
export function formatVolume(volumeMl: number): string {
  if (volumeMl >= 1000) {
    return `${(volumeMl / 1000).toFixed(2)}L`;
  }
  return `${Math.round(volumeMl)}ml`;
}

/**
 * Format weight for display (with unit)
 */
export function formatWeight(weightG: number): string {
  if (weightG >= 1000) {
    return `${(weightG / 1000).toFixed(2)}kg`;
  }
  return `${Math.round(weightG)}g`;
}

/**
 * Get bottle tare weight from SKU or linked Product
 */
export function getBottleTareWeight(
  sku: {
    bottleTareG?: number | null;
    products?: Array<{
      isPrimary: boolean;
      product: {
        defaultTareG?: number | null;
      };
    }>;
  }
): number | null {
  // First check SKU-level tare weight
  if (sku.bottleTareG && sku.bottleTareG > 0) {
    return sku.bottleTareG;
  }

  // Fall back to primary product's tare weight
  const primaryProduct = sku.products?.find((p) => p.isPrimary);
  if (primaryProduct?.product.defaultTareG && primaryProduct.product.defaultTareG > 0) {
    return primaryProduct.product.defaultTareG;
  }

  return null;
}

/**
 * Get density for SKU (from SKU or linked Product)
 */
export function getDensityForSKU(
  sku: {
    densityGPerMl?: number | null;
    abvPercent?: number | null;
    products?: Array<{
      isPrimary: boolean;
      product: {
        defaultDensity?: number | null;
        abvPercent?: number | null;
      };
    }>;
  }
): number {
  // Check SKU-level density first
  if (sku.densityGPerMl && sku.densityGPerMl > 0) {
    return sku.densityGPerMl;
  }

  // Check SKU-level ABV
  if (sku.abvPercent && sku.abvPercent > 0) {
    return calculateDensityFromABV(sku.abvPercent);
  }

  // Fall back to primary product
  const primaryProduct = sku.products?.find((p) => p.isPrimary);
  if (primaryProduct) {
    if (primaryProduct.product.defaultDensity && primaryProduct.product.defaultDensity > 0) {
      return primaryProduct.product.defaultDensity;
    }

    if (primaryProduct.product.abvPercent && primaryProduct.product.abvPercent > 0) {
      return calculateDensityFromABV(primaryProduct.product.abvPercent);
    }
  }

  // Default
  return 0.95;
}
