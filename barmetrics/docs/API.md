# Noble BarMetrics API Documentation

This document describes the data structures, validation schemas, and calculation functions available in the Noble BarMetrics application.

---

## Table of Contents

- [Data Types](#data-types)
- [Validation Schemas](#validation-schemas)
- [Calculation Functions](#calculation-functions)
- [Constants](#constants)
- [Usage Examples](#usage-examples)

---

## Data Types

### Product

Represents a liquor product in the system.

```typescript
interface Product {
  id: string;                 // Unique identifier (CUID)
  brand: string;              // Brand name (e.g., "Tito's")
  productName: string;        // Product name (e.g., "Handmade Vodka")
  category: LiquorCategory;   // Category enum
  abvPercent: number;         // Alcohol by volume (0-100)
  nominalVolumeMl: number;    // Bottle size in ml
  defaultDensity: number;     // Default density (g/ml), typically 0.95
  defaultTareG: number | null;// Default empty bottle weight (g)
  isActive: boolean;          // Whether product is active
  createdAt: Date;
  updatedAt: Date;
}
```

### BottleCalibration

Stores calibration data for accurate tare weight measurements.

```typescript
interface BottleCalibration {
  id: string;                      // Unique identifier (CUID)
  productId: string;               // Reference to Product
  tareWeightG: number;             // Empty bottle weight (g)
  fullBottleWeightG: number | null;// Full bottle weight (g), optional
  calibrationMethod: CalibrationMethod;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

type CalibrationMethod = 'MEASURED_EMPTY' | 'MEASURED_FULL' | 'ESTIMATED';
```

### MeasurementSession

Groups related measurements for an inventory count.

```typescript
interface MeasurementSession {
  id: string;                  // Unique identifier (CUID)
  name: string | null;         // Session name (e.g., "Weekly Count")
  location: string | null;     // Location (e.g., "Main Bar")
  startedAt: Date;
  completedAt: Date | null;
}
```

### BottleMeasurement

Individual bottle measurement with calculated values.

```typescript
interface BottleMeasurement {
  id: string;                  // Unique identifier (CUID)
  sessionId: string;           // Reference to MeasurementSession
  productId: string;           // Reference to Product
  calibrationId: string | null;// Reference to BottleCalibration
  grossWeightG: number;        // Measured total weight (g)
  tareWeightG: number;         // Empty bottle weight used (g)
  netMassG: number;            // Calculated: gross - tare (g)
  densityGPerMl: number;       // Density used for calculation (g/ml)
  volumeMl: number;            // Calculated volume (ml)
  volumeL: number;             // Calculated volume (L)
  percentFull: number | null;  // Percent of nominal volume
  poursRemaining: number | null;// Standard pours remaining
  standardPourMl: number | null;// Pour size used (ml)
  measuredAt: Date;
}
```

---

## Validation Schemas

All validation schemas are defined using [Zod](https://zod.dev) and can be found in `src/lib/validations.ts`.

### productSchema

Validates product data for creation and updates.

| Field | Type | Constraints |
|-------|------|-------------|
| `brand` | string | Required, 1-100 characters |
| `productName` | string | Required, 1-100 characters |
| `category` | enum | Must be valid LiquorCategory |
| `abvPercent` | number | 0-100 |
| `nominalVolumeMl` | integer | 1-5000 |
| `defaultDensity` | number | 0.7-1.1 (optional, default: 0.95) |
| `defaultTareG` | number | 0-2000 (optional, nullable) |
| `isActive` | boolean | Optional, default: true |

### calibrationSchema

Validates calibration data.

| Field | Type | Constraints |
|-------|------|-------------|
| `productId` | string | Required |
| `tareWeightG` | number | 0-2000 |
| `fullBottleWeightG` | number | 0-5000 (optional, nullable) |
| `calibrationMethod` | enum | MEASURED_EMPTY, MEASURED_FULL, ESTIMATED |
| `notes` | string | Max 500 characters (optional, nullable) |

### sessionSchema

Validates measurement session data.

| Field | Type | Constraints |
|-------|------|-------------|
| `name` | string | Max 100 characters (optional, nullable) |
| `location` | string | Max 100 characters (optional, nullable) |

### measurementSchema

Validates individual measurement data.

| Field | Type | Constraints |
|-------|------|-------------|
| `productId` | string | Required |
| `calibrationId` | string | Optional, nullable |
| `grossWeightG` | number | 0-10000 |
| `tareWeightG` | number | 0-2000 |
| `standardPourMl` | number | 1-500 (optional, nullable) |

### quickMeasurementSchema

Simplified schema for quick measurements.

| Field | Type | Constraints |
|-------|------|-------------|
| `productId` | string | Required |
| `grossWeightG` | number | 0-10000 |
| `standardPourMl` | number | 1-500 (optional, default: 44) |

---

## Calculation Functions

Located in `src/lib/calculations.ts`.

### getDensityForABV

Returns the density (g/ml) for a given alcohol percentage.

```typescript
function getDensityForABV(abvPercent: number): number
```

**Parameters:**
- `abvPercent`: Alcohol by volume percentage (0-100)

**Returns:**
- Density in g/ml

**Example:**
```typescript
getDensityForABV(40);  // Returns 0.938 (standard spirits)
getDensityForABV(20);  // Returns 0.969 (liqueurs)
getDensityForABV(45);  // Returns 0.930 (interpolated)
```

### calculateVolumeFromWeight

Calculates liquid volume from weight measurements.

```typescript
function calculateVolumeFromWeight(params: VolumeCalculationParams): VolumeCalculationResult
```

**Parameters:**
```typescript
interface VolumeCalculationParams {
  grossWeightG: number;      // Total measured weight
  tareWeightG: number;       // Empty bottle weight
  abvPercent: number;        // Alcohol percentage
  nominalVolumeMl?: number;  // Bottle size (for percent calculation)
  standardPourMl?: number;   // Pour size (for pours remaining)
}
```

**Returns:**
```typescript
interface VolumeCalculationResult {
  netMassG: number;          // Liquid mass (g)
  densityGPerMl: number;     // Density used (g/ml)
  volumeMl: number;          // Calculated volume (ml)
  volumeL: number;           // Calculated volume (L)
  percentFull: number | null;// Percent of nominal volume
  poursRemaining: number | null; // Standard pours remaining
}
```

**Example:**
```typescript
const result = calculateVolumeFromWeight({
  grossWeightG: 850,
  tareWeightG: 480,
  abvPercent: 40,
  nominalVolumeMl: 750,
  standardPourMl: 44,
});

// Result:
// {
//   netMassG: 370,
//   densityGPerMl: 0.938,
//   volumeMl: 394.5,
//   volumeL: 0.395,
//   percentFull: 52.6,
//   poursRemaining: 9.0
// }
```

### suggestTareWeight

Suggests a tare weight based on bottle size.

```typescript
function suggestTareWeight(nominalVolumeMl: number): number
```

**Parameters:**
- `nominalVolumeMl`: Bottle size in ml

**Returns:**
- Suggested tare weight in grams

**Example:**
```typescript
suggestTareWeight(750);   // Returns 480
suggestTareWeight(1000);  // Returns 560
suggestTareWeight(600);   // Returns interpolated value
```

### calculateFullBottleWeight

Calculates the expected weight of a full bottle.

```typescript
function calculateFullBottleWeight(
  tareWeightG: number,
  nominalVolumeMl: number,
  abvPercent: number
): number
```

**Parameters:**
- `tareWeightG`: Empty bottle weight (g)
- `nominalVolumeMl`: Bottle capacity (ml)
- `abvPercent`: Alcohol percentage

**Returns:**
- Expected full bottle weight (g)

**Example:**
```typescript
calculateFullBottleWeight(480, 750, 40);  // Returns ~1183.5g
```

---

## Constants

### LIQUOR_CATEGORIES

Available product categories.

```typescript
const LIQUOR_CATEGORIES = [
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

type LiquorCategory = typeof LIQUOR_CATEGORIES[number];
```

### BOTTLE_SIZES

Common bottle sizes in ml.

```typescript
const BOTTLE_SIZES = [50, 100, 200, 375, 500, 700, 750, 1000, 1750] as const;
```

### STANDARD_POUR_SIZES

Standard pour sizes for different drink types.

```typescript
const STANDARD_POUR_SIZES = {
  shot: 44,      // 1.5 oz
  jigger: 44,    // 1.5 oz
  pony: 30,      // 1 oz
  double: 60,    // 2 oz
  wine: 150,     // 5 oz wine pour
  beer: 355,     // 12 oz beer
} as const;

const DEFAULT_STANDARD_POUR_ML = 44; // 1.5 oz standard shot
```

### Density Table

ABV to density mapping (internal).

| ABV % | Density (g/ml) |
|-------|----------------|
| 0 | 1.000 |
| 10 | 0.985 |
| 15 | 0.978 |
| 20 | 0.969 |
| 25 | 0.962 |
| 30 | 0.954 |
| 35 | 0.946 |
| 40 | 0.938 |
| 45 | 0.930 |
| 50 | 0.922 |
| 55 | 0.914 |
| 60 | 0.906 |
| 65 | 0.898 |
| 70 | 0.890 |
| 75 | 0.882 |
| 80 | 0.874 |

---

## Usage Examples

### Creating a Product

```typescript
import { productSchema } from '@/lib/validations';

const productData = {
  brand: "Tito's",
  productName: "Handmade Vodka",
  category: "VODKA",
  abvPercent: 40,
  nominalVolumeMl: 750,
  defaultTareG: 485,
};

const result = productSchema.safeParse(productData);
if (result.success) {
  // Use result.data to create product
}
```

### Taking a Measurement

```typescript
import { calculateVolumeFromWeight } from '@/lib/calculations';
import { measurementSchema } from '@/lib/validations';

// Validate input
const measurementData = {
  productId: 'clx123...',
  grossWeightG: 920,
  tareWeightG: 485,
  standardPourMl: 44,
};

const validated = measurementSchema.safeParse(measurementData);
if (validated.success) {
  // Calculate volume
  const result = calculateVolumeFromWeight({
    grossWeightG: validated.data.grossWeightG,
    tareWeightG: validated.data.tareWeightG,
    abvPercent: 40, // From product
    nominalVolumeMl: 750, // From product
    standardPourMl: validated.data.standardPourMl || 44,
  });

  // Save to database with calculated values
}
```

### Calibrating a New Bottle

```typescript
import { suggestTareWeight, calculateFullBottleWeight } from '@/lib/calculations';

// Get suggested tare weight for a 750ml bottle
const suggestedTare = suggestTareWeight(750); // 480g

// Calculate expected full weight for verification
const expectedFull = calculateFullBottleWeight(480, 750, 40); // ~1183.5g
```

---

## Error Handling

All validation schemas return detailed error messages:

```typescript
const result = productSchema.safeParse(invalidData);
if (!result.success) {
  console.log(result.error.issues);
  // [
  //   {
  //     code: 'too_small',
  //     minimum: 1,
  //     path: ['brand'],
  //     message: 'Brand is required'
  //   }
  // ]
}
```

---

## Database Connection

Use the Prisma client singleton from `src/lib/db.ts`:

```typescript
import { prisma } from '@/lib/db';

// Query products
const products = await prisma.product.findMany({
  where: { isActive: true },
  include: { calibrations: true },
});
```
