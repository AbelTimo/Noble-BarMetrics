import { z } from 'zod';
import { LIQUOR_CATEGORIES, BOTTLE_SIZES } from './calculations';

// Product validation schemas
export const productSchema = z.object({
  brand: z.string().min(1, 'Brand is required').max(100, 'Brand must be 100 characters or less'),
  productName: z.string().min(1, 'Product name is required').max(100, 'Product name must be 100 characters or less'),
  category: z.enum(LIQUOR_CATEGORIES, { message: 'Please select a valid category' }),
  abvPercent: z.number()
    .min(0, 'ABV must be at least 0%')
    .max(100, 'ABV cannot exceed 100%'),
  nominalVolumeMl: z.number()
    .int('Volume must be a whole number')
    .min(1, 'Volume must be at least 1ml')
    .max(5000, 'Volume cannot exceed 5000ml'),
  defaultDensity: z.number()
    .min(0.7, 'Density must be at least 0.7 g/ml')
    .max(1.1, 'Density cannot exceed 1.1 g/ml')
    .default(0.95),
  defaultTareG: z.number()
    .min(0, 'Tare weight cannot be negative')
    .max(2000, 'Tare weight seems too high')
    .nullable()
    .optional(),
  isActive: z.boolean().default(true),
});

export const productCreateSchema = productSchema;
export const productUpdateSchema = productSchema.partial();

export type ProductFormData = z.input<typeof productSchema>;

// Calibration validation schemas
export const calibrationMethodSchema = z.enum([
  'MEASURED_EMPTY',
  'MEASURED_FULL',
  'ESTIMATED',
]);

export const calibrationSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  tareWeightG: z.number()
    .min(0, 'Tare weight cannot be negative')
    .max(2000, 'Tare weight seems too high'),
  fullBottleWeightG: z.number()
    .min(0, 'Full bottle weight cannot be negative')
    .max(5000, 'Full bottle weight seems too high')
    .optional()
    .nullable(),
  calibrationMethod: calibrationMethodSchema,
  notes: z.string().max(500, 'Notes must be 500 characters or less').optional().nullable(),
});

export const calibrationCreateSchema = calibrationSchema;
export const calibrationUpdateSchema = calibrationSchema.partial();

export type CalibrationFormData = z.infer<typeof calibrationSchema>;
export type CalibrationMethod = z.infer<typeof calibrationMethodSchema>;

// Session mode enum
export const sessionModeSchema = z.enum(['standard', 'quick_count']);
export type SessionMode = z.infer<typeof sessionModeSchema>;

// Session validation schemas
export const sessionSchema = z.object({
  name: z.string().max(100, 'Name must be 100 characters or less').optional().nullable(),
  location: z.string().max(100, 'Location must be 100 characters or less').optional().nullable(),
});

export const sessionCreateSchema = sessionSchema.extend({
  mode: sessionModeSchema.optional().default('standard'),
  sourceSessionId: z.string().optional().nullable(),
  defaultPourMl: z.number().min(1).max(500).optional().default(30),
});

export const sessionUpdateSchema = sessionSchema.extend({
  completedAt: z.string().datetime().optional().nullable(),
  hasAnomalies: z.boolean().optional(),
});

export type SessionFormData = z.infer<typeof sessionSchema>;
export type SessionCreateData = z.infer<typeof sessionCreateSchema>;

// Measurement validation schemas
export const measurementSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  calibrationId: z.string().optional().nullable(),
  grossWeightG: z.number()
    .min(0, 'Gross weight cannot be negative')
    .max(10000, 'Gross weight seems too high'),
  tareWeightG: z.number()
    .min(0, 'Tare weight cannot be negative')
    .max(2000, 'Tare weight seems too high'),
  standardPourMl: z.number()
    .min(1, 'Pour size must be at least 1ml')
    .max(500, 'Pour size seems too large')
    .optional()
    .nullable(),
});

export const measurementCreateSchema = measurementSchema.extend({
  sessionId: z.string().min(1, 'Session is required'),
});

export type MeasurementFormData = z.infer<typeof measurementSchema>;
export type MeasurementCreateData = z.infer<typeof measurementCreateSchema>;

// Bulk measurement item schema (for quick count mode)
export const bulkMeasurementItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  calibrationId: z.string().optional().nullable(),
  grossWeightG: z.number()
    .min(0, 'Gross weight cannot be negative')
    .max(10000, 'Gross weight seems too high'),
  previousMeasurementId: z.string().optional().nullable(),
  isSkipped: z.boolean().optional().default(false),
});

export const bulkMeasurementSchema = z.object({
  measurements: z.array(bulkMeasurementItemSchema).min(1, 'At least one measurement required'),
  standardPourMl: z.number().min(1).max(500).optional().default(44),
});

export type BulkMeasurementItem = z.infer<typeof bulkMeasurementItemSchema>;
export type BulkMeasurementData = z.infer<typeof bulkMeasurementSchema>;

// Quick measurement schema (for simplified measurement input)
export const quickMeasurementSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  grossWeightG: z.number()
    .min(0, 'Weight cannot be negative')
    .max(10000, 'Weight seems too high'),
  standardPourMl: z.number()
    .min(1, 'Pour size must be at least 1ml')
    .max(500, 'Pour size seems too large')
    .optional()
    .default(30), // 1 oz standard pour
});

export type QuickMeasurementFormData = z.infer<typeof quickMeasurementSchema>;

// Report/export validation schemas
export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  },
  { message: 'Start date must be before end date' }
);

export type DateRangeData = z.infer<typeof dateRangeSchema>;

// Common validation helpers
export const idSchema = z.string().min(1, 'ID is required');

export const paginationSchema = z.object({
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(100).optional().default(20),
});

export type PaginationParams = z.infer<typeof paginationSchema>;

// Search/filter schemas
export const productFilterSchema = z.object({
  search: z.string().optional(),
  category: z.enum(LIQUOR_CATEGORIES).optional(),
  isActive: z.boolean().optional(),
});

export type ProductFilterParams = z.infer<typeof productFilterSchema>;

// Excel import validation schema
// Handles both numbers and strings from Excel cells with proper transformation
export const excelImportRowSchema = z.object({
  brand: z.string().min(1, 'Brand is required'),
  productName: z.string().min(1, 'Product name is required'),
  category: z.string().transform((val) => val.toUpperCase()).pipe(
    z.enum(LIQUOR_CATEGORIES, { message: 'Invalid category' })
  ),
  abvPercent: z.union([
    z.number(),
    z.string().transform((val) => parseFloat(val)),
  ]).pipe(z.number().min(0, 'ABV must be at least 0%').max(100, 'ABV cannot exceed 100%')),
  nominalVolumeMl: z.union([
    z.number(),
    z.string().transform((val) => parseInt(val, 10)),
  ]).pipe(z.number().int('Volume must be a whole number').min(1, 'Volume must be at least 1ml').max(5000, 'Volume cannot exceed 5000ml')),
  defaultTareG: z.union([
    z.number(),
    z.string().transform((val) => parseFloat(val)),
    z.null(),
    z.undefined(),
  ]).pipe(z.number().min(0, 'Tare weight cannot be negative').max(2000, 'Tare weight seems too high').nullable().optional()),
});

export type ExcelImportRow = z.input<typeof excelImportRowSchema>;
export type ValidatedExcelRow = z.output<typeof excelImportRowSchema>;

// Duplicate handling options for import
export const duplicateHandlingSchema = z.enum(['skip', 'update', 'error']);
export type DuplicateHandling = z.infer<typeof duplicateHandlingSchema>;

// ============================================
// SKU & Label Management Schemas
// ============================================

// SKU unit types
export const skuUnitSchema = z.enum(['ml', 'oz', 'L', 'each']);
export type SKUUnit = z.infer<typeof skuUnitSchema>;

// SKU validation schemas
export const skuSchema = z.object({
  code: z.string()
    .min(1, 'SKU code is required')
    .max(50, 'SKU code must be 50 characters or less')
    .regex(/^[A-Z0-9-]+$/, 'SKU code must contain only uppercase letters, numbers, and hyphens'),
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional().nullable(),
  category: z.enum(LIQUOR_CATEGORIES, { message: 'Please select a valid category' }),
  sizeMl: z.number()
    .int('Size must be a whole number')
    .min(1, 'Size must be at least 1ml')
    .max(5000, 'Size cannot exceed 5000ml'),
  unit: skuUnitSchema.default('ml'),
  barcode: z.string().max(50, 'Barcode must be 50 characters or less').optional().nullable(),
  isActive: z.boolean().default(true),
  // Weight-based inventory fields (optional)
  bottleTareG: z.number()
    .min(0, 'Tare weight must be positive')
    .max(5000, 'Tare weight cannot exceed 5000g')
    .optional()
    .nullable(),
  densityGPerMl: z.number()
    .min(0.7, 'Density must be at least 0.7 g/ml')
    .max(1.1, 'Density cannot exceed 1.1 g/ml')
    .optional()
    .nullable(),
  abvPercent: z.number()
    .min(0, 'ABV must be at least 0%')
    .max(100, 'ABV cannot exceed 100%')
    .optional()
    .nullable(),
});

export const skuCreateSchema = skuSchema;
export const skuUpdateSchema = skuSchema.partial();

export type SKUFormData = z.input<typeof skuSchema>;
export type SKUData = z.output<typeof skuSchema>;

// Label status enum
export const labelStatusSchema = z.enum(['UNASSIGNED', 'ASSIGNED', 'RETIRED']);
export type LabelStatus = z.infer<typeof labelStatusSchema>;

// Label event type enum
export const labelEventTypeSchema = z.enum(['CREATED', 'ASSIGNED', 'LOCATION_CHANGED', 'SCANNED', 'RETIRED', 'REPRINTED']);
export type LabelEventType = z.infer<typeof labelEventTypeSchema>;

// Label validation schemas
export const labelSchema = z.object({
  code: z.string()
    .min(1, 'Label code is required')
    .regex(/^BM-[A-Z0-9]{8}$/, 'Label code must be in format BM-XXXXXXXX'),
  skuId: z.string().min(1, 'SKU is required'),
  status: labelStatusSchema.default('UNASSIGNED'),
  location: z.string().max(100, 'Location must be 100 characters or less').optional().nullable(),
  batchId: z.string().optional().nullable(),
});

export type LabelFormData = z.infer<typeof labelSchema>;

// Label generation schema
export const labelGenerateSchema = z.object({
  skuId: z.string().min(1, 'SKU is required'),
  quantity: z.number()
    .int('Quantity must be a whole number')
    .min(1, 'Must generate at least 1 label')
    .max(500, 'Cannot generate more than 500 labels at once'),
  notes: z.string().max(500, 'Notes must be 500 characters or less').optional().nullable(),
  createdBy: z.string().max(100, 'Created by must be 100 characters or less').optional().nullable(),
});

export type LabelGenerateData = z.infer<typeof labelGenerateSchema>;

// Label assignment schema
export const labelAssignSchema = z.object({
  location: z.string()
    .min(1, 'Location is required')
    .max(100, 'Location must be 100 characters or less'),
  locationId: z.string().optional().nullable(),
  skuId: z.string().optional().nullable(),  // Optional SKU reassignment
  userId: z.string().max(100).optional().nullable(),
  deviceId: z.string().max(100).optional().nullable(),
  performedBy: z.string().max(100, 'Performed by must be 100 characters or less').optional().nullable(),
});

export type LabelAssignData = z.infer<typeof labelAssignSchema>;

// Label retirement schema
export const labelRetireSchema = z.object({
  reason: z.enum(['DAMAGED', 'LOST', 'EXPIRED', 'OTHER'], { message: 'Please select a valid reason' }),
  description: z.string().max(500, 'Description must be 500 characters or less').optional().nullable(),
  userId: z.string().max(100).optional().nullable(),
  deviceId: z.string().max(100).optional().nullable(),
  performedBy: z.string().max(100, 'Performed by must be 100 characters or less').optional().nullable(),
});

export type LabelRetireData = z.infer<typeof labelRetireSchema>;

// Label reprint schema
export const labelReprintSchema = z.object({
  reason: z.enum(['DAMAGED', 'LOST', 'FADED', 'OTHER'], { message: 'Please select a valid reason' }),
  description: z.string().max(500, 'Description must be 500 characters or less').optional().nullable(),
  userId: z.string().max(100).optional().nullable(),
  deviceId: z.string().max(100).optional().nullable(),
  performedBy: z.string().max(100, 'Performed by must be 100 characters or less').optional().nullable(),
});

export type LabelReprintData = z.infer<typeof labelReprintSchema>;

// Label event schema
export const labelEventSchema = z.object({
  labelId: z.string().min(1, 'Label ID is required'),
  eventType: labelEventTypeSchema,
  description: z.string().max(500, 'Description must be 500 characters or less').optional().nullable(),
  location: z.string().max(100, 'Location must be 100 characters or less').optional().nullable(),
  metadata: z.string().optional().nullable(),
  performedBy: z.string().max(100, 'Performed by must be 100 characters or less').optional().nullable(),
});

export type LabelEventData = z.infer<typeof labelEventSchema>;

// Location validation schema
export const locationSchema = z.object({
  name: z.string()
    .min(1, 'Location name is required')
    .max(100, 'Location name must be 100 characters or less'),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export type LocationFormData = z.infer<typeof locationSchema>;

// Product-SKU link schema
export const productSkuLinkSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  isPrimary: z.boolean().default(false),
});

export type ProductSkuLinkData = z.infer<typeof productSkuLinkSchema>;

// Label filter schema
export const labelFilterSchema = z.object({
  status: labelStatusSchema.optional(),
  skuId: z.string().optional(),
  batchId: z.string().optional(),
  location: z.string().optional(),
});

export type LabelFilterParams = z.infer<typeof labelFilterSchema>;

// SKU filter schema
export const skuFilterSchema = z.object({
  search: z.string().optional(),
  category: z.enum(LIQUOR_CATEGORIES).optional(),
  isActive: z.boolean().optional(),
});

export type SKUFilterParams = z.infer<typeof skuFilterSchema>;

// ============================================
// Liquor Request Schemas
// ============================================

// Urgency levels
export const requestUrgencySchema = z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']);
export type RequestUrgency = z.infer<typeof requestUrgencySchema>;

// Request status
export const requestStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'FULFILLED']);
export type RequestStatus = z.infer<typeof requestStatusSchema>;

// Create liquor request
export const liquorRequestCreateSchema = z.object({
  skuId: z.string().optional().nullable(),
  productId: z.string().optional().nullable(),
  quantity: z.number()
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1')
    .max(1000, 'Quantity cannot exceed 1000'),
  urgency: requestUrgencySchema.default('NORMAL'),
  reason: z.string().max(200, 'Reason must be 200 characters or less').optional().nullable(),
  notes: z.string().max(500, 'Notes must be 500 characters or less').optional().nullable(),
}).refine(
  (data) => data.skuId || data.productId,
  { message: 'Either SKU or Product must be specified' }
);

export type LiquorRequestCreateData = z.infer<typeof liquorRequestCreateSchema>;

// Update request (for review)
export const liquorRequestReviewSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED'], { message: 'Status must be APPROVED or REJECTED' }),
  reviewNotes: z.string().max(500, 'Review notes must be 500 characters or less').optional().nullable(),
});

export type LiquorRequestReviewData = z.infer<typeof liquorRequestReviewSchema>;

// Mark as fulfilled
export const liquorRequestFulfillSchema = z.object({
  notes: z.string().max(500, 'Notes must be 500 characters or less').optional().nullable(),
});

export type LiquorRequestFulfillData = z.infer<typeof liquorRequestFulfillSchema>;

// Filter requests
export const liquorRequestFilterSchema = z.object({
  status: requestStatusSchema.optional(),
  urgency: requestUrgencySchema.optional(),
  requestedBy: z.string().optional(),
});

export type LiquorRequestFilterParams = z.infer<typeof liquorRequestFilterSchema>;
