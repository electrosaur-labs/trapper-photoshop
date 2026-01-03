/**
 * Trapping Engine
 * Core color separation and trapping algorithms
 * Ported from Java implementation
 */

class TrappingEngine {
    constructor(options = {}) {
        this.minTrap = options.minTrap || 0;
        this.maxTrap = options.maxTrap || 0.03125; // 1/32"
        this.dpi = options.dpi || 300;
        this.mode = options.mode || 'offset';
    }

    /**
     * Create an ImageData-like object (compatible with UXP)
     * @param {number} width - Width in pixels
     * @param {number} height - Height in pixels
     * @param {Uint8ClampedArray} data - Optional existing data
     * @returns {Object} - ImageData-like object
     */
    createImageData(width, height, data = null) {
        return {
            width: width,
            height: height,
            data: data || new Uint8ClampedArray(width * height * 4)
        };
    }

    /**
     * Analyze colors in image data
     * @param {ImageData} imageData - Flattened image data
     * @returns {Object} - Color analysis results
     */
    analyzeColors(imageData) {
        const colorMap = new Map();
        const { data, width, height } = imageData;

        // Count each unique color
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                const a = data[idx + 3];

                // Ignore transparent pixels
                if (a === 0) continue;

                // Create color key
                const key = `${r},${g},${b}`;

                if (colorMap.has(key)) {
                    colorMap.get(key).count++;
                } else {
                    colorMap.set(key, {
                        r, g, b,
                        count: 1,
                        lightness: this.calculateLightness(r, g, b)
                    });
                }
            }
        }

        // Convert to array
        const colors = Array.from(colorMap.values());

        return {
            colors,
            totalPixels: width * height,
            uniqueColors: colors.length
        };
    }

    /**
     * Calculate lightness using standard RGB to grayscale conversion
     * @param {number} r - Red value (0-255)
     * @param {number} g - Green value (0-255)
     * @param {number} b - Blue value (0-255)
     * @returns {number} - Lightness value (0-255)
     */
    calculateLightness(r, g, b) {
        // Standard luminance formula
        return 0.299 * r + 0.587 * g + 0.114 * b;
    }

    /**
     * Sort colors from lightest to darkest
     * @param {Array} colors - Array of color objects
     * @returns {Array} - Sorted colors
     */
    sortColorsByLightness(colors) {
        return colors.sort((a, b) => {
            // Sort descending (lightest first)
            return b.lightness - a.lightness;
        });
    }

    /**
     * Apply morphological dilation with mask
     * @param {ImageData} sourceData - Source image data
     * @param {number} radiusPixels - Dilation radius in pixels
     * @param {ImageData} mask - Binary mask for areas to expand into
     * @returns {ImageData} - Dilated image data
     */
    applyDilationWithMask(sourceData, radiusPixels, mask) {
        if (radiusPixels <= 0) {
            return sourceData;
        }

        const { width, height } = sourceData;
        let current = this.createImageData(width, height, new Uint8ClampedArray(sourceData.data));

        console.log(`applyDilationWithMask: radiusPixels=${radiusPixels}, width=${width}, height=${height}`);
        if (mask) {
            console.log(`applyDilationWithMask: mask dimensions=${mask.width}x${mask.height}, data length=${mask.data.length}`);
        }

        // Iterative dilation for better performance
        for (let iteration = 0; iteration < radiusPixels; iteration++) {
            const next = this.createImageData(width, height);

            // Copy current to next
            for (let i = 0; i < current.data.length; i++) {
                next.data[i] = current.data[i];
            }

            // Dilate by 1 pixel
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const idx = (y * width + x) * 4;

                    // Skip if already has a pixel
                    if (current.data[idx + 3] > 0) {
                        continue;
                    }

                    // Check if this location is in the mask (check alpha channel)
                    // If mask pixel is transparent, don't expand here
                    if (mask && mask.data && mask.data[idx + 3] === 0) {
                        continue; // Don't expand here
                    }

                    // Check 4-connected neighbors
                    const neighbors = [
                        { dx: 0, dy: -1 }, // top
                        { dx: 1, dy: 0 },  // right
                        { dx: 0, dy: 1 },  // bottom
                        { dx: -1, dy: 0 }  // left
                    ];

                    for (const { dx, dy } of neighbors) {
                        const nx = x + dx;
                        const ny = y + dy;

                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            const nIdx = (ny * width + nx) * 4;

                            if (current.data[nIdx + 3] > 0) {
                                // Copy color from neighbor
                                next.data[idx] = current.data[nIdx];
                                next.data[idx + 1] = current.data[nIdx + 1];
                                next.data[idx + 2] = current.data[nIdx + 2];
                                next.data[idx + 3] = current.data[nIdx + 3];
                                break;
                            }
                        }
                    }
                }
            }

            current = next;
        }

        return current;
    }

    /**
     * Apply morphological dilation (without mask)
     * @param {ImageData} sourceData - Source image data
     * @param {number} radiusPixels - Dilation radius in pixels
     * @returns {ImageData} - Dilated image data
     */
    applyDilation(sourceData, radiusPixels) {
        return this.applyDilationWithMask(sourceData, radiusPixels, null);
    }

    /**
     * Apply morphological erosion (for underbase choke)
     * @param {ImageData} sourceData - Source image data
     * @param {number} radiusPixels - Erosion radius in pixels
     * @returns {ImageData} - Eroded image data
     */
    applyErosion(sourceData, radiusPixels) {
        if (radiusPixels <= 0) {
            return sourceData;
        }

        const { width, height } = sourceData;
        let current = this.createImageData(width, height, new Uint8ClampedArray(sourceData.data));

        // Iterative erosion
        for (let iteration = 0; iteration < radiusPixels; iteration++) {
            const next = this.createImageData(width, height);

            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const idx = (y * width + x) * 4;

                    // Skip if already transparent
                    if (current.data[idx + 3] === 0) {
                        continue;
                    }

                    // Check 4-connected neighbors
                    const neighbors = [
                        { dx: 0, dy: -1 }, // top
                        { dx: 1, dy: 0 },  // right
                        { dx: 0, dy: 1 },  // bottom
                        { dx: -1, dy: 0 }  // left
                    ];

                    let keepPixel = true;
                    for (const { dx, dy } of neighbors) {
                        const nx = x + dx;
                        const ny = y + dy;

                        // If neighbor is out of bounds or transparent, erode this pixel
                        if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
                            keepPixel = false;
                            break;
                        }

                        const nIdx = (ny * width + nx) * 4;
                        if (current.data[nIdx + 3] === 0) {
                            keepPixel = false;
                            break;
                        }
                    }

                    if (keepPixel) {
                        // Keep the pixel
                        next.data[idx] = current.data[idx];
                        next.data[idx + 1] = current.data[idx + 1];
                        next.data[idx + 2] = current.data[idx + 2];
                        next.data[idx + 3] = current.data[idx + 3];
                    }
                }
            }

            current = next;
        }

        return current;
    }

    /**
     * Generate underbase layer for screen printing
     * @param {ImageData} sourceData - Source image data
     * @param {Object} options - Underbase options
     * @returns {ImageData} - Underbase layer
     */
    generateUnderbase(sourceData, options = {}) {
        const { width, height } = sourceData;
        const underbase = this.createImageData(width, height);

        const garmentColor = options.garmentColor || { r: 255, g: 255, b: 255 }; // Default white
        const chokePixels = options.chokePixels || 0;

        // Create white underbase for all non-garment pixels
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const r = sourceData.data[idx];
                const g = sourceData.data[idx + 1];
                const b = sourceData.data[idx + 2];
                const a = sourceData.data[idx + 3];

                // Check if pixel needs underbase
                if (a > 0) {
                    // Simple check: if not garment color, needs white underbase
                    const isGarmentColor = (
                        Math.abs(r - garmentColor.r) < 10 &&
                        Math.abs(g - garmentColor.g) < 10 &&
                        Math.abs(b - garmentColor.b) < 10
                    );

                    if (!isGarmentColor) {
                        underbase.data[idx] = 255;     // White
                        underbase.data[idx + 1] = 255; // White
                        underbase.data[idx + 2] = 255; // White
                        underbase.data[idx + 3] = 255; // Opaque
                    }
                }
            }
        }

        // Apply choke if specified
        if (chokePixels > 0) {
            return this.applyErosion(underbase, chokePixels);
        }

        return underbase;
    }

    /**
     * Calculate trap strategy based on mode
     * @param {string} mode - Printing mode
     * @returns {Object} - Strategy configuration
     */
    getTrappingStrategy(mode) {
        if (mode === 'screen') {
            return {
                name: 'Screen Printing',
                direction: 'Light spreads under dark',
                description: 'Optimized for screen printing on garments',
                defaultMinTrap: 0,
                defaultMaxTrap: 0.0556 // 4pt in inches
            };
        } else {
            return {
                name: 'Offset Lithography',
                direction: 'Light spreads under dark',
                description: 'High-precision commercial printing',
                defaultMinTrap: 0,
                defaultMaxTrap: 0.03125 // 1/32" in inches
            };
        }
    }
}

// Export for Node.js
module.exports = TrappingEngine;