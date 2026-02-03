import { describe, it, expect } from 'vitest';
import { excelImportRowSchema, duplicateHandlingSchema } from '@/lib/validations';

describe('excelImportRowSchema', () => {
  it('validates a complete valid row', () => {
    const validRow = {
      brand: "Tito's",
      productName: 'Handmade Vodka',
      category: 'VODKA',
      abvPercent: 40,
      nominalVolumeMl: 750,
      defaultTareG: 485,
    };

    const result = excelImportRowSchema.safeParse(validRow);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.brand).toBe("Tito's");
      expect(result.data.category).toBe('VODKA');
      expect(result.data.abvPercent).toBe(40);
    }
  });

  it('handles string numbers from Excel', () => {
    const rowWithStrings = {
      brand: 'Grey Goose',
      productName: 'Original',
      category: 'VODKA',
      abvPercent: '40', // String instead of number
      nominalVolumeMl: '750',
      defaultTareG: '520',
    };

    const result = excelImportRowSchema.safeParse(rowWithStrings);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.abvPercent).toBe(40);
      expect(result.data.nominalVolumeMl).toBe(750);
      expect(result.data.defaultTareG).toBe(520);
    }
  });

  it('transforms lowercase category to uppercase', () => {
    const rowWithLowerCase = {
      brand: 'Hendricks',
      productName: 'Original',
      category: 'gin', // lowercase
      abvPercent: 41.4,
      nominalVolumeMl: 750,
    };

    const result = excelImportRowSchema.safeParse(rowWithLowerCase);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.category).toBe('GIN');
    }
  });

  it('allows optional tare weight to be null or undefined', () => {
    const rowWithoutTare = {
      brand: 'Jack Daniels',
      productName: 'Old No. 7',
      category: 'WHISKEY',
      abvPercent: 40,
      nominalVolumeMl: 750,
    };

    const result = excelImportRowSchema.safeParse(rowWithoutTare);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.defaultTareG).toBeUndefined();
    }
  });

  it('rejects missing required fields', () => {
    const missingBrand = {
      productName: 'Vodka',
      category: 'VODKA',
      abvPercent: 40,
      nominalVolumeMl: 750,
    };

    const result = excelImportRowSchema.safeParse(missingBrand);
    expect(result.success).toBe(false);
  });

  it('rejects empty brand', () => {
    const emptyBrand = {
      brand: '',
      productName: 'Vodka',
      category: 'VODKA',
      abvPercent: 40,
      nominalVolumeMl: 750,
    };

    const result = excelImportRowSchema.safeParse(emptyBrand);
    expect(result.success).toBe(false);
  });

  it('rejects invalid category', () => {
    const invalidCategory = {
      brand: 'Corona',
      productName: 'Extra',
      category: 'BEER', // Not a valid category
      abvPercent: 4.5,
      nominalVolumeMl: 355,
    };

    const result = excelImportRowSchema.safeParse(invalidCategory);
    expect(result.success).toBe(false);
  });

  it('rejects ABV outside valid range', () => {
    const invalidABV = {
      brand: 'Test',
      productName: 'Product',
      category: 'VODKA',
      abvPercent: 150, // Invalid - over 100
      nominalVolumeMl: 750,
    };

    const result = excelImportRowSchema.safeParse(invalidABV);
    expect(result.success).toBe(false);
  });

  it('rejects negative ABV', () => {
    const negativeABV = {
      brand: 'Test',
      productName: 'Product',
      category: 'VODKA',
      abvPercent: -5,
      nominalVolumeMl: 750,
    };

    const result = excelImportRowSchema.safeParse(negativeABV);
    expect(result.success).toBe(false);
  });

  it('rejects volume outside valid range', () => {
    const invalidVolume = {
      brand: 'Test',
      productName: 'Product',
      category: 'VODKA',
      abvPercent: 40,
      nominalVolumeMl: 10000, // Invalid - over 5000
    };

    const result = excelImportRowSchema.safeParse(invalidVolume);
    expect(result.success).toBe(false);
  });

  it('rejects negative tare weight', () => {
    const negativeTare = {
      brand: 'Test',
      productName: 'Product',
      category: 'VODKA',
      abvPercent: 40,
      nominalVolumeMl: 750,
      defaultTareG: -100,
    };

    const result = excelImportRowSchema.safeParse(negativeTare);
    expect(result.success).toBe(false);
  });

  it('rejects tare weight over 2000g', () => {
    const heavyTare = {
      brand: 'Test',
      productName: 'Product',
      category: 'VODKA',
      abvPercent: 40,
      nominalVolumeMl: 750,
      defaultTareG: 2500,
    };

    const result = excelImportRowSchema.safeParse(heavyTare);
    expect(result.success).toBe(false);
  });

  it('accepts all valid categories', () => {
    const categories = [
      'VODKA', 'GIN', 'WHISKEY', 'RUM', 'TEQUILA',
      'BRANDY', 'LIQUEUR', 'MEZCAL', 'COGNAC', 'SCOTCH', 'BOURBON', 'OTHER'
    ];

    for (const category of categories) {
      const row = {
        brand: 'Test',
        productName: 'Product',
        category,
        abvPercent: 40,
        nominalVolumeMl: 750,
      };

      const result = excelImportRowSchema.safeParse(row);
      expect(result.success).toBe(true);
    }
  });
});

describe('duplicateHandlingSchema', () => {
  it('accepts valid options', () => {
    expect(duplicateHandlingSchema.safeParse('skip').success).toBe(true);
    expect(duplicateHandlingSchema.safeParse('update').success).toBe(true);
    expect(duplicateHandlingSchema.safeParse('error').success).toBe(true);
  });

  it('rejects invalid options', () => {
    expect(duplicateHandlingSchema.safeParse('replace').success).toBe(false);
    expect(duplicateHandlingSchema.safeParse('ignore').success).toBe(false);
    expect(duplicateHandlingSchema.safeParse('').success).toBe(false);
  });
});
