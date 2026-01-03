/**
 * Trap Size Parser
 * Parses trap size specifications in various formats
 * Ported from Java PsdColorSeparator.parseTrapSize()
 */

class TrapSizeParser {
    /**
     * Parse a trap size specification
     * @param {string} spec - The trap size specification
     * @returns {number} - The trap size in inches
     * @throws {Error} - If the specification is invalid
     */
    static parse(spec) {
        if (!spec || typeof spec !== 'string') {
            throw new Error('Invalid trap size specification: empty or not a string');
        }

        spec = spec.trim();

        // Check for point specification (e.g., "2pt", "4pt", "6pt")
        if (spec.toLowerCase().endsWith('pt')) {
            return this.parsePoints(spec);
        }

        // Check for fraction (e.g., "1/32", "1/64")
        if (spec.includes('/')) {
            return this.parseFraction(spec);
        }

        // Parse as decimal inches
        return this.parseDecimal(spec);
    }

    /**
     * Parse points specification
     * @param {string} spec - Points specification (e.g., "4pt")
     * @returns {number} - Size in inches
     */
    static parsePoints(spec) {
        const pointStr = spec.substring(0, spec.length - 2).trim();
        const points = parseFloat(pointStr);

        if (isNaN(points)) {
            throw new Error(`Invalid point format: ${spec}. Use format like 2pt or 4pt`);
        }

        if (points < 0) {
            throw new Error(`Points must be non-negative: ${spec}`);
        }

        // Convert points to inches: 72 points = 1 inch
        return points / 72.0;
    }

    /**
     * Parse fractional inches
     * @param {string} spec - Fraction specification (e.g., "1/32")
     * @returns {number} - Size in inches
     */
    static parseFraction(spec) {
        const parts = spec.split('/');

        if (parts.length !== 2) {
            throw new Error(`Invalid fraction format: ${spec}. Use format like 1/32`);
        }

        const numerator = parseFloat(parts[0].trim());
        const denominator = parseFloat(parts[1].trim());

        if (isNaN(numerator) || isNaN(denominator)) {
            throw new Error(`Invalid fraction format: ${spec}. Use numbers like 1/32`);
        }

        if (denominator === 0) {
            throw new Error(`Division by zero in fraction: ${spec}`);
        }

        return numerator / denominator;
    }

    /**
     * Parse decimal inches
     * @param {string} spec - Decimal specification (e.g., "0.03125")
     * @returns {number} - Size in inches
     */
    static parseDecimal(spec) {
        const value = parseFloat(spec);

        if (isNaN(value)) {
            throw new Error(`Invalid decimal format: ${spec}. Use format like 0.03125, 1/32, or 4pt`);
        }

        return value;
    }

    /**
     * Convert inches to pixels based on DPI
     * @param {number} inches - Size in inches
     * @param {number} dpi - Dots per inch
     * @returns {number} - Size in pixels
     */
    static inchesToPixels(inches, dpi) {
        return Math.round(inches * dpi);
    }

    /**
     * Format trap size for display
     * @param {number} inches - Size in inches
     * @param {string} mode - Display mode ('fraction', 'decimal', 'points')
     * @returns {string} - Formatted string
     */
    static format(inches, mode = 'fraction') {
        if (mode === 'points') {
            const points = inches * 72;
            return `${points.toFixed(1)}pt`;
        }

        if (mode === 'fraction') {
            // Try to find a clean fraction representation
            const commonFractions = [
                { value: 1/64, str: '1/64"' },
                { value: 1/32, str: '1/32"' },
                { value: 3/64, str: '3/64"' },
                { value: 1/16, str: '1/16"' },
                { value: 5/64, str: '5/64"' },
                { value: 3/32, str: '3/32"' },
                { value: 1/8, str: '1/8"' }
            ];

            for (const frac of commonFractions) {
                if (Math.abs(inches - frac.value) < 0.0001) {
                    return frac.str;
                }
            }
        }

        // Default to decimal
        return `${inches.toFixed(5)}"`;
    }

    /**
     * Validate trap size range
     * @param {string} minSpec - Minimum trap size specification
     * @param {string} maxSpec - Maximum trap size specification
     * @throws {Error} - If validation fails
     */
    static validateRange(minSpec, maxSpec) {
        const min = this.parse(minSpec);
        const max = this.parse(maxSpec);

        if (min < 0 || max < 0) {
            throw new Error('Trap sizes must be non-negative');
        }

        if (min > max) {
            throw new Error('Minimum trap size must be less than or equal to maximum trap size');
        }

        // Warn for unusual values
        if (max > 0.25) { // More than 1/4 inch
            console.warn(`Warning: Maximum trap size ${maxSpec} (${max}" ) is unusually large`);
        }

        return { min, max };
    }

    /**
     * Get recommended trap sizes for different modes
     * @param {string} mode - Printing mode ('offset' or 'screen')
     * @returns {Object} - Recommended min and max trap sizes
     */
    static getRecommendedSizes(mode) {
        if (mode === 'offset') {
            return {
                min: '0',
                max: '1/32',
                minInches: 0,
                maxInches: 0.03125,
                description: 'Offset lithography typically uses 0 to 1/32" trapping'
            };
        } else if (mode === 'screen') {
            return {
                min: '0',
                max: '4pt',
                minInches: 0,
                maxInches: 0.0556, // 4/72
                description: 'Screen printing typically uses 0 to 4-6 points trapping'
            };
        } else {
            throw new Error(`Unknown mode: ${mode}`);
        }
    }

    /**
     * Calculate trap size for a specific layer using linear interpolation
     * @param {number} layerIndex - Index of the layer (0 = lightest)
     * @param {number} totalLayers - Total number of layers
     * @param {number} minTrap - Minimum trap size in inches
     * @param {number} maxTrap - Maximum trap size in inches
     * @returns {number} - Trap size for this layer in inches
     */
    static calculateLayerTrap(layerIndex, totalLayers, minTrap, maxTrap) {
        if (totalLayers === 1) {
            return minTrap;
        }

        // Linear interpolation from max (lightest) to min (darkest)
        const t = layerIndex / (totalLayers - 1);
        return maxTrap - (t * (maxTrap - minTrap));
    }
}

// Export for Node.js
module.exports = TrapSizeParser;