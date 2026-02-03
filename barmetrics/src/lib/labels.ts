/**
 * Label management utilities for QR code generation and SKU code handling
 */

import { LIQUOR_CATEGORIES } from './calculations';

/**
 * Characters used for label code generation
 * Excludes I and O to avoid confusion with 1 and 0
 */
const LABEL_CODE_CHARS = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Generate a unique label code in format BM-XXXXXXXX
 * @returns A unique label code string
 */
export function generateLabelCode(): string {
  let code = '';
  for (let i = 0; i < 8; i++) {
    const randomIndex = Math.floor(Math.random() * LABEL_CODE_CHARS.length);
    code += LABEL_CODE_CHARS[randomIndex];
  }
  return `BM-${code}`;
}

/**
 * Generate multiple unique label codes
 * @param count - Number of codes to generate
 * @returns Array of unique label codes
 */
export function generateLabelCodes(count: number): string[] {
  const codes = new Set<string>();
  while (codes.size < count) {
    codes.add(generateLabelCode());
  }
  return Array.from(codes);
}

/**
 * Generate QR code content for a label
 * Format: barmetrics://label/BM-XXXXXXXX
 * @param labelCode - The label code
 * @returns QR code content string
 */
export function generateQRContent(labelCode: string): string {
  return `barmetrics://label/${labelCode}`;
}

/**
 * Parse a QR code content to extract the label code
 * @param qrContent - The scanned QR content
 * @returns The extracted label code or null if invalid
 */
export function parseLabelFromQR(qrContent: string): string | null {
  // Handle direct label codes
  if (/^BM-[A-Z0-9]{8}$/.test(qrContent)) {
    return qrContent;
  }

  // Handle full URL format
  const match = qrContent.match(/barmetrics:\/\/label\/(BM-[A-Z0-9]{8})$/);
  return match ? match[1] : null;
}

/**
 * Validate a label code format
 * @param code - The code to validate
 * @returns True if valid, false otherwise
 */
export function isValidLabelCode(code: string): boolean {
  return /^BM-[A-Z0-9]{8}$/.test(code);
}

/**
 * Generate a suggested SKU code based on category, size, and sequence
 * Format: {CATEGORY}-{SIZE}-{SEQUENCE}
 * @param category - The liquor category
 * @param sizeMl - The bottle size in ml
 * @param sequence - The sequence number (padded to 3 digits)
 * @returns Suggested SKU code
 */
export function generateSKUCode(
  category: typeof LIQUOR_CATEGORIES[number],
  sizeMl: number,
  sequence: number
): string {
  const paddedSequence = String(sequence).padStart(3, '0');
  return `${category}-${sizeMl}-${paddedSequence}`;
}

/**
 * Label status types
 */
export const LABEL_STATUSES = ['UNASSIGNED', 'ASSIGNED', 'RETIRED'] as const;
export type LabelStatus = typeof LABEL_STATUSES[number];

/**
 * Label event types
 */
export const LABEL_EVENT_TYPES = ['CREATED', 'ASSIGNED', 'LOCATION_CHANGED', 'SCANNED', 'RETIRED', 'REPRINTED'] as const;
export type LabelEventType = typeof LABEL_EVENT_TYPES[number];

/**
 * Retirement reasons
 */
export const RETIREMENT_REASONS = ['DAMAGED', 'LOST', 'EXPIRED', 'OTHER'] as const;
export type RetirementReason = typeof RETIREMENT_REASONS[number];

/**
 * Reprint reasons
 */
export const REPRINT_REASONS = ['DAMAGED', 'LOST', 'FADED', 'OTHER'] as const;
export type ReprintReason = typeof REPRINT_REASONS[number];

/**
 * Get display color class for label status
 * @param status - The label status
 * @returns Tailwind color classes for the status
 */
export function getLabelStatusColor(status: LabelStatus): string {
  const colors: Record<LabelStatus, string> = {
    UNASSIGNED: 'bg-yellow-100 text-yellow-800',
    ASSIGNED: 'bg-green-100 text-green-800',
    RETIRED: 'bg-gray-100 text-gray-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

/**
 * Get display color class for label event type
 * @param eventType - The event type
 * @returns Tailwind color classes for the event type
 */
export function getLabelEventColor(eventType: LabelEventType): string {
  const colors: Record<LabelEventType, string> = {
    CREATED: 'bg-blue-100 text-blue-800',
    ASSIGNED: 'bg-green-100 text-green-800',
    LOCATION_CHANGED: 'bg-cyan-100 text-cyan-800',
    SCANNED: 'bg-purple-100 text-purple-800',
    RETIRED: 'bg-red-100 text-red-800',
    REPRINTED: 'bg-orange-100 text-orange-800',
  };
  return colors[eventType] || 'bg-gray-100 text-gray-800';
}

/**
 * Default predefined locations
 */
export const DEFAULT_LOCATIONS = [
  'Main Bar',
  'Back Bar',
  'Stock Room',
  'Walk-in Cooler',
  'Service Bar',
  'Patio Bar',
  'VIP Lounge',
  'Kitchen',
] as const;

/**
 * Print format options
 */
export const PRINT_FORMATS = {
  THERMAL_2INCH: {
    name: '2" Thermal (DYMO/Brother/Zebra)',
    width: 50,
    height: 25,
    unit: 'mm',
    labelsPerRow: 1,
  },
  AVERY_5160: {
    name: 'Avery 5160 (30 labels/sheet)',
    width: 66.7,
    height: 25.4,
    unit: 'mm',
    labelsPerRow: 3,
    labelsPerColumn: 10,
    marginTop: 12.7,
    marginLeft: 4.8,
    gapX: 3.2,
    gapY: 0,
  },
} as const;

export type PrintFormat = keyof typeof PRINT_FORMATS;
