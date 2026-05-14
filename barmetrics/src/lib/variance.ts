/**
 * Variance Engine
 *
 * Calculates the difference between theoretical usage (based on sales/recipes)
 * and actual depletion (based on inventory measurements between sessions).
 */

export interface ProductVariance {
  productId: string;
  productName: string;
  brand: string;
  category: string;
  theoreticalUsageMl: number;
  actualDepletionMl: number;
  varianceMl: number;
  variancePercent: number;
  costPerMl: number;
  costLoss: number;
  retailLoss: number;
  severity: 'NORMAL' | 'WARNING' | 'CRITICAL';
}

export interface VarianceSummary {
  startDate: string;
  endDate: string;
  openingSessionId: string | null;
  closingSessionId: string | null;
  totalTheoreticalMl: number;
  totalActualMl: number;
  totalVarianceMl: number;
  totalVariancePercent: number;
  totalCostLoss: number;
  totalRetailLoss: number;
  products: ProductVariance[];
  byCategory: CategoryVariance[];
  byShift: ShiftVariance[];
}

export interface CategoryVariance {
  category: string;
  theoreticalMl: number;
  actualMl: number;
  varianceMl: number;
  variancePercent: number;
  costLoss: number;
}

export interface ShiftVariance {
  shift: string;
  theoreticalMl: number;
  itemsSold: number;
}

const VARIANCE_THRESHOLDS = {
  WARNING: 5,   // 5% variance
  CRITICAL: 15, // 15% variance
};

export function getSeverity(variancePercent: number): 'NORMAL' | 'WARNING' | 'CRITICAL' {
  const abs = Math.abs(variancePercent);
  if (abs >= VARIANCE_THRESHOLDS.CRITICAL) return 'CRITICAL';
  if (abs >= VARIANCE_THRESHOLDS.WARNING) return 'WARNING';
  return 'NORMAL';
}

export function calculateProductVariance(
  productId: string,
  productName: string,
  brand: string,
  category: string,
  theoreticalUsageMl: number,
  actualDepletionMl: number,
  costPerBottle: number,
  nominalVolumeMl: number,
  retailPricePerServing: number = 0,
  standardPourMl: number = 30
): ProductVariance {
  const varianceMl = actualDepletionMl - theoreticalUsageMl;
  const variancePercent = theoreticalUsageMl > 0
    ? (varianceMl / theoreticalUsageMl) * 100
    : actualDepletionMl > 0 ? 100 : 0;

  const costPerMl = nominalVolumeMl > 0 ? costPerBottle / nominalVolumeMl : 0;
  const costLoss = Math.max(0, varianceMl) * costPerMl;

  const servingsLost = standardPourMl > 0 ? Math.max(0, varianceMl) / standardPourMl : 0;
  const retailLoss = servingsLost * retailPricePerServing;

  return {
    productId,
    productName,
    brand,
    category,
    theoreticalUsageMl: Math.round(theoreticalUsageMl * 10) / 10,
    actualDepletionMl: Math.round(actualDepletionMl * 10) / 10,
    varianceMl: Math.round(varianceMl * 10) / 10,
    variancePercent: Math.round(variancePercent * 10) / 10,
    costPerMl: Math.round(costPerMl * 100) / 100,
    costLoss: Math.round(costLoss * 100) / 100,
    retailLoss: Math.round(retailLoss * 100) / 100,
    severity: getSeverity(variancePercent),
  };
}

export function aggregateByCategory(products: ProductVariance[]): CategoryVariance[] {
  const map = new Map<string, CategoryVariance>();

  for (const p of products) {
    const existing = map.get(p.category) || {
      category: p.category,
      theoreticalMl: 0,
      actualMl: 0,
      varianceMl: 0,
      variancePercent: 0,
      costLoss: 0,
    };

    existing.theoreticalMl += p.theoreticalUsageMl;
    existing.actualMl += p.actualDepletionMl;
    existing.varianceMl += p.varianceMl;
    existing.costLoss += p.costLoss;
    map.set(p.category, existing);
  }

  return Array.from(map.values()).map((c) => ({
    ...c,
    variancePercent: c.theoreticalMl > 0
      ? Math.round((c.varianceMl / c.theoreticalMl) * 1000) / 10
      : 0,
    theoreticalMl: Math.round(c.theoreticalMl * 10) / 10,
    actualMl: Math.round(c.actualMl * 10) / 10,
    varianceMl: Math.round(c.varianceMl * 10) / 10,
    costLoss: Math.round(c.costLoss * 100) / 100,
  }));
}
