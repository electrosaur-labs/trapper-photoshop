/**
 * Unit tests for TrapSizeParser
 */

const TrapSizeParser = require('../src/utils/TrapSizeParser');

describe('TrapSizeParser', () => {
    describe('parse()', () => {
        test('parses fractional inches correctly', () => {
            expect(TrapSizeParser.parse('1/32')).toBeCloseTo(0.03125, 5);
            expect(TrapSizeParser.parse('1/64')).toBeCloseTo(0.015625, 5);
            expect(TrapSizeParser.parse('1/16')).toBeCloseTo(0.0625, 5);
            expect(TrapSizeParser.parse('3/32')).toBeCloseTo(0.09375, 5);
        });

        test('parses decimal inches correctly', () => {
            expect(TrapSizeParser.parse('0.03125')).toBeCloseTo(0.03125, 5);
            expect(TrapSizeParser.parse('0.5')).toBeCloseTo(0.5, 5);
            expect(TrapSizeParser.parse('1.0')).toBeCloseTo(1.0, 5);
        });

        test('parses points correctly', () => {
            expect(TrapSizeParser.parse('2pt')).toBeCloseTo(2 / 72, 5);
            expect(TrapSizeParser.parse('4pt')).toBeCloseTo(4 / 72, 5);
            expect(TrapSizeParser.parse('6pt')).toBeCloseTo(6 / 72, 5);
            expect(TrapSizeParser.parse('72pt')).toBeCloseTo(1.0, 5);
        });

        test('handles whitespace', () => {
            expect(TrapSizeParser.parse('  1/32  ')).toBeCloseTo(0.03125, 5);
            expect(TrapSizeParser.parse(' 4pt ')).toBeCloseTo(4 / 72, 5);
        });

        test('throws error for invalid input', () => {
            expect(() => TrapSizeParser.parse('')).toThrow();
            expect(() => TrapSizeParser.parse(null)).toThrow();
            expect(() => TrapSizeParser.parse(undefined)).toThrow();
            expect(() => TrapSizeParser.parse('invalid')).toThrow();
            expect(() => TrapSizeParser.parse('1/0')).toThrow('Division by zero');
            expect(() => TrapSizeParser.parse('-4pt')).toThrow('non-negative');
        });
    });

    describe('validateRange()', () => {
        test('validates valid ranges', () => {
            const result = TrapSizeParser.validateRange('0', '1/32');
            expect(result.min).toBeCloseTo(0, 5);
            expect(result.max).toBeCloseTo(0.03125, 5);
        });

        test('throws for invalid ranges', () => {
            expect(() => TrapSizeParser.validateRange('1/32', '0')).toThrow('less than or equal');
            expect(() => TrapSizeParser.validateRange('-1', '1/32')).toThrow('non-negative');
        });
    });

    describe('inchesToPixels()', () => {
        test('converts inches to pixels correctly', () => {
            expect(TrapSizeParser.inchesToPixels(1, 300)).toBe(300);
            expect(TrapSizeParser.inchesToPixels(0.5, 300)).toBe(150);
            expect(TrapSizeParser.inchesToPixels(1/32, 3000)).toBe(94);
        });
    });

    describe('calculateLayerTrap()', () => {
        test('calculates trap for layers correctly', () => {
            const min = 0;
            const max = 0.03125; // 1/32"

            // First layer (lightest) gets max trap
            expect(TrapSizeParser.calculateLayerTrap(0, 5, min, max)).toBeCloseTo(max, 5);

            // Last layer (darkest) gets min trap
            expect(TrapSizeParser.calculateLayerTrap(4, 5, min, max)).toBeCloseTo(min, 5);

            // Middle layers get interpolated values
            const middle = TrapSizeParser.calculateLayerTrap(2, 5, min, max);
            expect(middle).toBeGreaterThan(min);
            expect(middle).toBeLessThan(max);
        });

        test('handles single layer', () => {
            expect(TrapSizeParser.calculateLayerTrap(0, 1, 0, 0.03125)).toBe(0);
        });
    });

    describe('getRecommendedSizes()', () => {
        test('returns correct recommendations for offset', () => {
            const rec = TrapSizeParser.getRecommendedSizes('offset');
            expect(rec.min).toBe('0');
            expect(rec.max).toBe('1/32');
            expect(rec.maxInches).toBeCloseTo(0.03125, 5);
        });

        test('returns correct recommendations for screen', () => {
            const rec = TrapSizeParser.getRecommendedSizes('screen');
            expect(rec.min).toBe('0');
            expect(rec.max).toBe('4pt');
            expect(rec.maxInches).toBeCloseTo(4 / 72, 5);
        });

        test('throws for unknown mode', () => {
            expect(() => TrapSizeParser.getRecommendedSizes('unknown')).toThrow();
        });
    });
});