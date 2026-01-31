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
