/**
 * Anomaly detection functions for bar inventory measurements
 * Identifies issues like over-capacity readings, negative volumes,
 * and large variances from previous measurements
 */

export const ANOMALY_TYPES = {
  OVER_CAPACITY: 'OVER_CAPACITY',
  NEGATIVE_VOLUME: 'NEGATIVE_VOLUME',
  LARGE_VARIANCE_UP: 'LARGE_VARIANCE_UP',
  LARGE_VARIANCE_DOWN: 'LARGE_VARIANCE_DOWN',
  MISSING_BOTTLE: 'MISSING_BOTTLE',
} as const;

export type AnomalyType = typeof ANOMALY_TYPES[keyof typeof ANOMALY_TYPES];

export interface AnomalyInfo {
  type: AnomalyType;
  severity: 'warning' | 'error';
  message: string;
  suggestion: string;
}

export const ANOMALY_INFO: Record<AnomalyType, AnomalyInfo> = {
  OVER_CAPACITY: {
    type: 'OVER_CAPACITY',
    severity: 'error',
    message: 'Volume exceeds bottle capacity',
    suggestion: 'Check tare weight - bottle may be heavier than calibrated',
  },
  NEGATIVE_VOLUME: {
    type: 'NEGATIVE_VOLUME',
    severity: 'error',
    message: 'Negative volume detected',
    suggestion: 'Bottle is lighter than tare weight - recalibrate',
  },
  LARGE_VARIANCE_UP: {
    type: 'LARGE_VARIANCE_UP',
    severity: 'warning',
    message: 'Large increase from previous measurement',
    suggestion: 'Investigate - bottle may have been refilled or swapped',
  },
  LARGE_VARIANCE_DOWN: {
    type: 'LARGE_VARIANCE_DOWN',
    severity: 'warning',
    message: 'Large decrease from previous measurement',
    suggestion: 'Investigate - unusually high consumption or spillage',
  },
  MISSING_BOTTLE: {
    type: 'MISSING_BOTTLE',
    severity: 'warning',
    message: 'Bottle not measured in this session',
    suggestion: 'Product was in previous session but not current',
  },
};

// Thresholds for anomaly detection
export const ANOMALY_THRESHOLDS = {
  OVER_CAPACITY_PERCENT: 105,  // >105% triggers warning
  NEGATIVE_VOLUME_PERCENT: 0,   // <0% triggers error
  LARGE_VARIANCE_PERCENT: 30,   // >30% change triggers warning
} as const;

export interface MeasurementForAnomaly {
  percentFull: number | null;
  grossWeightG: number;
  tareWeightG: number;
  netMassG: number;
}

export interface PreviousMeasurement {
  percentFull: number | null;
}

/**
 * Detect anomalies in a measurement
 * @param measurement - Current measurement data
 * @param previousMeasurement - Optional previous measurement for variance check
 * @returns Array of anomaly types detected
 */
export function detectAnomalies(
  measurement: MeasurementForAnomaly,
  previousMeasurement?: PreviousMeasurement | null
): AnomalyType[] {
  const anomalies: AnomalyType[] = [];
  const percentFull = measurement.percentFull ?? 0;

  // Check for over capacity (>105%)
  if (percentFull > ANOMALY_THRESHOLDS.OVER_CAPACITY_PERCENT) {
    anomalies.push(ANOMALY_TYPES.OVER_CAPACITY);
  }

  // Check for negative volume (<0%)
  if (percentFull < ANOMALY_THRESHOLDS.NEGATIVE_VOLUME_PERCENT || measurement.netMassG < 0) {
    anomalies.push(ANOMALY_TYPES.NEGATIVE_VOLUME);
  }

  // Check for large variance from previous measurement
  if (previousMeasurement?.percentFull != null && measurement.percentFull != null) {
    const variance = measurement.percentFull - previousMeasurement.percentFull;

    if (Math.abs(variance) > ANOMALY_THRESHOLDS.LARGE_VARIANCE_PERCENT) {
      anomalies.push(
        variance > 0 ? ANOMALY_TYPES.LARGE_VARIANCE_UP : ANOMALY_TYPES.LARGE_VARIANCE_DOWN
      );
    }
  }

  return anomalies;
}

/**
 * Calculate variance percentage between two measurements
 * @param currentPercent - Current percent full
 * @param previousPercent - Previous percent full
 * @returns Variance as a percentage (positive = increase, negative = decrease)
 */
export function calculateVariance(
  currentPercent: number | null,
  previousPercent: number | null
): number | null {
  if (currentPercent == null || previousPercent == null) {
    return null;
  }
  return Math.round((currentPercent - previousPercent) * 10) / 10;
}

/**
 * Get anomaly info for a list of anomaly types
 * @param anomalyFlags - JSON string of anomaly types or array
 * @returns Array of AnomalyInfo objects
 */
export function getAnomalyInfoList(anomalyFlags: string | AnomalyType[] | null): AnomalyInfo[] {
  if (!anomalyFlags) return [];

  const flags: AnomalyType[] = typeof anomalyFlags === 'string'
    ? JSON.parse(anomalyFlags)
    : anomalyFlags;

  return flags.map(flag => ANOMALY_INFO[flag]).filter(Boolean);
}

/**
 * Check if measurement has any anomalies
 * @param anomalyFlags - JSON string of anomaly types
 * @returns boolean
 */
export function hasAnomalies(anomalyFlags: string | null): boolean {
  if (!anomalyFlags) return false;
  try {
    const flags = JSON.parse(anomalyFlags);
    return Array.isArray(flags) && flags.length > 0;
  } catch {
    return false;
  }
}

/**
 * Get the highest severity from a list of anomalies
 * @param anomalyFlags - JSON string of anomaly types
 * @returns 'error' | 'warning' | null
 */
export function getHighestSeverity(anomalyFlags: string | null): 'error' | 'warning' | null {
  const infoList = getAnomalyInfoList(anomalyFlags);
  if (infoList.length === 0) return null;

  if (infoList.some(info => info.severity === 'error')) {
    return 'error';
  }
  return 'warning';
}

export interface AnomalySummary {
  totalMeasurements: number;
  measurementsWithAnomalies: number;
  anomalyCounts: Record<AnomalyType, number>;
  missingBottles: { productId: string; brand: string; productName: string }[];
  errorCount: number;
  warningCount: number;
}

/**
 * Generate a summary of anomalies for a session
 * @param measurements - Array of measurements with anomaly data
 * @param missingProducts - Products from source session not in current session
 * @returns AnomalySummary object
 */
export function generateAnomalySummary(
  measurements: Array<{ anomalyFlags: string | null }>,
  missingProducts: Array<{ productId: string; brand: string; productName: string }> = []
): AnomalySummary {
  const anomalyCounts: Record<AnomalyType, number> = {
    OVER_CAPACITY: 0,
    NEGATIVE_VOLUME: 0,
    LARGE_VARIANCE_UP: 0,
    LARGE_VARIANCE_DOWN: 0,
    MISSING_BOTTLE: missingProducts.length,
  };

  let measurementsWithAnomalies = 0;
  let errorCount = 0;
  let warningCount = 0;

  for (const measurement of measurements) {
    const infoList = getAnomalyInfoList(measurement.anomalyFlags);

    if (infoList.length > 0) {
      measurementsWithAnomalies++;

      for (const info of infoList) {
        anomalyCounts[info.type]++;
        if (info.severity === 'error') {
          errorCount++;
        } else {
          warningCount++;
        }
      }
    }
  }

  // Add missing bottles to warning count
  warningCount += missingProducts.length;

  return {
    totalMeasurements: measurements.length,
    measurementsWithAnomalies,
    anomalyCounts,
    missingBottles: missingProducts.map(p => ({
      productId: p.productId,
      brand: p.brand,
      productName: p.productName,
    })),
    errorCount,
    warningCount,
  };
}
