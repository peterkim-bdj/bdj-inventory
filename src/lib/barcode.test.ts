import { describe, it, expect } from 'vitest';
import { generateBarcodePrefix } from './barcode';

describe('generateBarcodePrefix', () => {
  it('starts with BDJ-', () => {
    const prefix = generateBarcodePrefix();
    expect(prefix).toMatch(/^BDJ-/);
  });

  it('has total length of 10 (BDJ- + 6 chars)', () => {
    const prefix = generateBarcodePrefix();
    expect(prefix).toHaveLength(10);
  });

  it('only contains uppercase alphanumeric after prefix', () => {
    const prefix = generateBarcodePrefix();
    const suffix = prefix.slice(4);
    expect(suffix).toMatch(/^[A-Z0-9]{6}$/);
  });

  it('generates different values (not always identical)', () => {
    const prefixes = new Set(
      Array.from({ length: 20 }, () => generateBarcodePrefix()),
    );
    expect(prefixes.size).toBeGreaterThan(1);
  });
});
