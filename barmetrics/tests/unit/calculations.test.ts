import { describe, it, expect } from 'vitest';
import {
  getDensityForABV,
  calculateVolumeFromWeight,
  suggestTareWeight,
  calculateFullBottleWeight,
} from '@/lib/calculations';

describe('getDensityForABV', () => {
  it('returns correct density for common ABV values', () => {
    expect(getDensityForABV(0)).toBe(1.0);
    expect(getDensityForABV(40)).toBe(0.938);
    expect(getDensityForABV(50)).toBe(0.922);
  });

  it('interpolates between table values', () => {
    const density37 = getDensityForABV(37);
    // Should be between 35% (0.946) and 40% (0.938)
    expect(density37).toBeGreaterThan(0.938);
    expect(density37).toBeLessThan(0.946);
  });

  it('clamps ABV to valid range', () => {
    expect(getDensityForABV(-10)).toBe(1.0); // Clamps to 0%
    expect(getDensityForABV(100)).toBe(0.874); // Clamps to 80%
  });
});

describe('calculateVolumeFromWeight', () => {
  it('calculates volume correctly for a standard 750ml vodka bottle', () => {
    // Example: 750ml vodka at 40% ABV
    // Tare: 480g, Gross: 1180g
    // Net mass: 700g, Density: 0.938 g/ml
    // Expected volume: ~746ml
    const result = calculateVolumeFromWeight({
      grossWeightG: 1180,
      tareWeightG: 480,
      abvPercent: 40,
      nominalVolumeMl: 750,
      standardPourMl: 44,
    });

    expect(result.netMassG).toBe(700);
    expect(result.densityGPerMl).toBe(0.938);
    expect(result.volumeMl).toBeCloseTo(746.3, 0);
    expect(result.volumeL).toBeCloseTo(0.746, 2);
    expect(result.percentFull).toBeCloseTo(99.5, 0);
    expect(result.poursRemaining).toBeCloseTo(17, 0);
  });

  it('handles empty bottle (zero net mass)', () => {
    const result = calculateVolumeFromWeight({
      grossWeightG: 480,
      tareWeightG: 480,
      abvPercent: 40,
      nominalVolumeMl: 750,
    });

    expect(result.netMassG).toBe(0);
    expect(result.volumeMl).toBe(0);
    expect(result.percentFull).toBe(0);
  });

  it('handles gross weight less than tare (protects against negative)', () => {
    const result = calculateVolumeFromWeight({
      grossWeightG: 400, // Less than tare
      tareWeightG: 480,
      abvPercent: 40,
      nominalVolumeMl: 750,
    });

    expect(result.netMassG).toBe(0);
    expect(result.volumeMl).toBe(0);
  });

  it('returns null for percentFull when nominalVolumeMl not provided', () => {
    const result = calculateVolumeFromWeight({
      grossWeightG: 1180,
      tareWeightG: 480,
      abvPercent: 40,
    });

    expect(result.percentFull).toBeNull();
  });

  it('returns null for poursRemaining when standardPourMl not provided', () => {
    const result = calculateVolumeFromWeight({
      grossWeightG: 1180,
      tareWeightG: 480,
      abvPercent: 40,
      nominalVolumeMl: 750,
    });

    expect(result.poursRemaining).toBeNull();
  });

  it('caps percentFull at 100%', () => {
    // Overfilled bottle scenario
    const result = calculateVolumeFromWeight({
      grossWeightG: 1300,
      tareWeightG: 480,
      abvPercent: 40,
      nominalVolumeMl: 750,
    });

    expect(result.percentFull).toBe(100);
  });

  it('matches verification example from plan', () => {
    // From plan: 750ml bottle, 480g tare, 1180g gross = ~736ml remaining (~98% full)
    // Note: The plan example has a slight error. Let's calculate:
    // Net mass: 1180 - 480 = 700g
    // Density at 40%: 0.938 g/ml
    // Volume: 700 / 0.938 = ~746ml (~99.5% full)
    const result = calculateVolumeFromWeight({
      grossWeightG: 1180,
      tareWeightG: 480,
      abvPercent: 40,
      nominalVolumeMl: 750,
    });

    // Volume should be approximately 746ml
    expect(result.volumeMl).toBeGreaterThan(740);
    expect(result.volumeMl).toBeLessThan(750);
    // Percent full should be approximately 99%
    expect(result.percentFull).toBeGreaterThan(98);
    expect(result.percentFull).toBeLessThan(100);
  });
});

describe('suggestTareWeight', () => {
  it('returns correct tare for standard bottle sizes', () => {
    expect(suggestTareWeight(50)).toBe(50);
    expect(suggestTareWeight(375)).toBe(280);
    expect(suggestTareWeight(750)).toBe(480);
    expect(suggestTareWeight(1000)).toBe(560);
    expect(suggestTareWeight(1750)).toBe(800);
  });

  it('interpolates for non-standard sizes', () => {
    const tare600 = suggestTareWeight(600);
    // Should be between 500ml (350g) and 700ml (420g)
    expect(tare600).toBeGreaterThan(350);
    expect(tare600).toBeLessThan(420);
  });

  it('handles edge cases at boundaries', () => {
    expect(suggestTareWeight(10)).toBe(50); // Below minimum
    expect(suggestTareWeight(2000)).toBe(800); // Above maximum
  });
});

describe('calculateFullBottleWeight', () => {
  it('calculates full bottle weight correctly', () => {
    // 480g tare + 750ml at 40% ABV (density 0.938)
    // Liquid weight: 750 * 0.938 = 703.5g
    // Full bottle: 480 + 703.5 = 1183.5g
    const fullWeight = calculateFullBottleWeight(480, 750, 40);
    expect(fullWeight).toBeCloseTo(1183.5, 0);
  });

  it('accounts for different ABV densities', () => {
    const fullWeight20 = calculateFullBottleWeight(480, 750, 20);
    const fullWeight40 = calculateFullBottleWeight(480, 750, 40);
    const fullWeight60 = calculateFullBottleWeight(480, 750, 60);

    // Higher ABV = lower density = lower full weight
    expect(fullWeight20).toBeGreaterThan(fullWeight40);
    expect(fullWeight40).toBeGreaterThan(fullWeight60);
  });
});

describe('integration: round-trip calculation', () => {
  it('can derive original volume from weight measurements', () => {
    // Start with known values
    const knownVolumeMl = 500;
    const tareWeightG = 480;
    const abvPercent = 40;
    const density = getDensityForABV(abvPercent);

    // Calculate what gross weight would be
    const liquidWeightG = knownVolumeMl * density;
    const grossWeightG = tareWeightG + liquidWeightG;

    // Now reverse the calculation
    const result = calculateVolumeFromWeight({
      grossWeightG,
      tareWeightG,
      abvPercent,
      nominalVolumeMl: 750,
    });

    // Should get back our original volume
    expect(result.volumeMl).toBeCloseTo(knownVolumeMl, 0);
  });
});
