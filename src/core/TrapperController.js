/**
 * Trapper Controller
 * Main controller for the color trapping plugin
 * Coordinates between UI, Photoshop API, and trapping engine
 */

const PhotoshopAPI = require('../api/PhotoshopAPI');
const TrappingEngine = require('./TrappingEngine');
const TrapSizeParser = require('../utils/TrapSizeParser');

class TrapperController {
    constructor() {
        this.psApi = new PhotoshopAPI();
        this.engine = null;
        this.isProcessing = false;
    }

    /**
     * Validate trap size inputs
     * @param {string} minTrap - Minimum trap size
     * @param {string} maxTrap - Maximum trap size
     * @throws {Error} - If validation fails
     */
    validateTrapSizes(minTrap, maxTrap) {
        return TrapSizeParser.validateRange(minTrap, maxTrap);
    }

    /**
     * Check if current document is valid for trapping
     * @returns {Promise<Object>} - Validation result
     */
    async checkDocumentValidity() {
        try {
            const document = await this.psApi.getActiveDocument();
            if (!document) {
                return {
                    isValid: false,
                    reason: 'No document open'
                };
            }

            const docInfo = await this.psApi.getDocumentInfo(document);

            // Check RGB mode
            if (docInfo.mode !== 'RGB') {
                return {
                    isValid: false,
                    reason: `Document is in ${docInfo.mode} mode. Please convert to RGB mode (Image > Mode > RGB Color).`,
                    mode: docInfo.mode
                };
            }

            // Check bit depth
            if (docInfo.bitsPerChannel !== 8) {
                return {
                    isValid: false,
                    reason: 'Document must be 8-bit per channel'
                };
            }

            return {
                isValid: true,
                docInfo: docInfo
            };
        } catch (error) {
            return {
                isValid: false,
                reason: error.message
            };
        }
    }

    /**
     * Apply trapping to the active document
     * @param {Object} options - Trapping options
     * @returns {Promise<void>}
     */
    async applyTrapping(options = {}) {
        if (this.isProcessing) {
            throw new Error('Trapping is already in progress');
        }

        this.isProcessing = true;

        try {
            // Get active document
            const document = await this.psApi.getActiveDocument();
            if (!document) {
                throw new Error('No active document');
            }

            // Report progress
            if (options.onProgress) {
                options.onProgress(5, 'Analyzing document...');
            }

            // Get document properties
            const docInfo = await this.psApi.getDocumentInfo(document);
            console.log('Document info:', docInfo);

            // Validate document
            this.validateDocument(docInfo);

            // Parse trap sizes
            const trapSizes = TrapSizeParser.validateRange(
                options.minTrap || '0',
                options.maxTrap || '1/32'
            );

            // Convert to pixels based on DPI
            const minTrapPixels = TrapSizeParser.inchesToPixels(trapSizes.min, docInfo.resolution);
            const maxTrapPixels = TrapSizeParser.inchesToPixels(trapSizes.max, docInfo.resolution);

            console.log(`Trap range: ${trapSizes.min}" to ${trapSizes.max}"`);
            console.log(`Trap pixels: ${minTrapPixels}px to ${maxTrapPixels}px at ${docInfo.resolution} DPI`);

            // Report progress
            if (options.onProgress) {
                options.onProgress(10, 'Checking layers...');
            }

            // Get layers and check for hidden layers
            const layers = await this.psApi.getLayers(document);
            console.log(`Found ${layers.length} layers`);

            // Check for hidden layers
            const hiddenLayers = layers.filter(layer => !layer.visible);
            if (hiddenLayers.length > 0) {
                console.warn(`Found ${hiddenLayers.length} hidden layers that will be ignored`);

                // If callback provided, ask user to confirm
                if (options.onHiddenLayers) {
                    const proceed = await options.onHiddenLayers(hiddenLayers.length);
                    if (!proceed) {
                        throw new Error('Operation cancelled by user');
                    }
                }
            }

            // Create trapping engine
            this.engine = new TrappingEngine({
                minTrap: trapSizes.min,
                maxTrap: trapSizes.max,
                dpi: docInfo.resolution,
                mode: options.mode || 'offset'
            });

            // Report progress
            if (options.onProgress) {
                options.onProgress(15, 'Creating working document...');
            }

            // Duplicate the original document for color separation
            const workingDoc = await this.psApi.duplicateDocument(document, `${docInfo.name} - Color Separated`);
            console.log('Created working document:', workingDoc.title);

            // Flatten the working document
            await this.psApi.flattenDocument(workingDoc);
            console.log('Working document flattened');

            // Report progress
            if (options.onProgress) {
                options.onProgress(20, 'Analyzing colors...');
            }

            // Get pixel data from the flattened working document to analyze colors
            // IMPORTANT: Get fresh reference to active document after flattening
            const currentDoc = await this.psApi.getActiveDocument();
            console.log(`Current document after flattening: "${currentDoc.title}", id: ${currentDoc.id}, layers: ${currentDoc.layers.length}`);

            const flattenedLayer = currentDoc.layers[currentDoc.layers.length - 1];
            console.log(`Flattened layer type check:`, {
                name: flattenedLayer.name,
                id: flattenedLayer.id,
                kind: flattenedLayer.kind,
                isLayer: flattenedLayer.typename === 'Layer' || flattenedLayer.kind === 'pixel',
                typename: flattenedLayer.typename,
                hasId: !!flattenedLayer.id,
                hasBounds: !!flattenedLayer.bounds
            });

            const flattenedData = await this.psApi.getLayerPixels(flattenedLayer);

            // Count distinct colors
            const colorAnalysis = this.engine.analyzeColors(flattenedData);
            console.log(`Found ${colorAnalysis.colors.length} distinct colors`);

            if (colorAnalysis.colors.length > 10) {
                throw new Error(`Document has ${colorAnalysis.colors.length} distinct colors, exceeds maximum of 10`);
            }

            // Sort colors by lightness FIRST (lightest to darkest)
            // We create layers in this order, and since new layers go on TOP,
            // the final stack will be: lightest on bottom, darkest on top (correct for printing)
            const sortedColors = colorAnalysis.colors.sort((a, b) => b.lightness - a.lightness);
            console.log('Colors sorted lightest to darkest (creation order):', sortedColors.map(c => `RGB(${c.r},${c.g},${c.b}) L=${Math.round(c.lightness)}`));

            // Create one layer per color by manually extracting pixels using imaging API
            // Create in sorted order (lightest first) so they stack correctly
            // Since new layers go on top, this results in: lightest on bottom, darkest on top
            const colorLayers = [];

            // We already have the flattened pixel data in flattenedData
            console.log(`Using flattened pixel data: ${flattenedData.width}x${flattenedData.height}`);

            for (let i = 0; i < sortedColors.length; i++) {
                const color = sortedColors[i];
                const progress = 25 + (i / sortedColors.length) * 30;
                const colorStr = `RGB(${color.r},${color.g},${color.b})`;

                if (options.onProgress) {
                    options.onProgress(progress, `Separating color ${i + 1}/${sortedColors.length}: ${colorStr}`);
                }

                console.log(`Creating layer ${i + 1}/${sortedColors.length} for color ${colorStr} (lightness: ${Math.round(color.lightness)})`);

                // Extract only pixels of this color from the flattened data
                const colorPixels = this.extractSingleColor(flattenedData, color);
                console.log(`Extracted ${colorPixels.width}x${colorPixels.height} pixels for ${colorStr}`);

                // Create a new empty layer
                const layer = await this.psApi.createLayer(currentDoc, `Color - ${colorStr}`);
                console.log(`Created empty layer: "${layer.name}" (id: ${layer.id})`);

                // Write the color-specific pixels to the layer
                await this.psApi.setLayerPixels(layer, colorPixels);
                console.log(`Wrote pixels to layer "${layer.name}"`);

                // Store layer info AND the full document-sized pixel data for trapping
                // (in creation order, which is lightest to darkest)
                colorLayers.push({
                    layer,
                    color,
                    lightness: color.lightness,
                    pixelData: colorPixels  // Store for trapping calculations
                });
            }

            // Delete the original flattened layer since we have all colors separated
            const finalDoc = await this.psApi.getActiveDocument();
            const flattenedLayerToDelete = finalDoc.layers[finalDoc.layers.length - 1];
            if (flattenedLayerToDelete && flattenedLayerToDelete.name.includes('Layer')) {
                console.log(`Deleting source flattened layer "${flattenedLayerToDelete.name}"`);
                await flattenedLayerToDelete.delete();
            }

            // Use the current document (which is the working document after flattening)
            const separatedDocument = currentDoc;

            // No need to sort or reorder - layers were created in correct order already
            // colorLayers is already sorted lightest to darkest (creation order)
            console.log('Layers created in order (lightest to darkest):', colorLayers.map(cl => `RGB(${cl.color.r},${cl.color.g},${cl.color.b}) L=${Math.round(cl.lightness)}`));

            // Verify final layer order
            const verifyDoc = await this.psApi.getActiveDocument();
            console.log('Verifying layer stack (Photoshop order, index 0 = top):');
            console.log('Expected: Darkest on top [0], Lightest on bottom [last]');
            for (let i = 0; i < verifyDoc.layers.length; i++) {
                console.log(`  [${i}] ${verifyDoc.layers[i].name}`);
            }

            // Report progress
            if (options.onProgress) {
                options.onProgress(65, 'Applying trapping to separated layers...');
            }

            // Now apply trapping to each layer (lightest layers get most trap)
            for (let i = 0; i < colorLayers.length; i++) {
                const progress = 65 + (i / colorLayers.length) * 30;
                const { layer, color } = colorLayers[i];
                const colorStr = `RGB(${color.r},${color.g},${color.b})`;

                if (options.onProgress) {
                    options.onProgress(progress, `Trapping layer ${i + 1}/${colorLayers.length}: ${colorStr}`);
                }

                // Calculate trap size for this layer
                const trapInches = TrapSizeParser.calculateLayerTrap(
                    i,
                    colorLayers.length,
                    trapSizes.min,
                    trapSizes.max
                );
                const trapPixels = TrapSizeParser.inchesToPixels(trapInches, docInfo.resolution);

                console.log(`Layer ${i + 1}: trap ${trapPixels}px (${trapInches}")`);

                // Update layer name to include trap size
                layer.name = `${layer.name} - Trap ${trapPixels}px`;

                // Apply trapping if needed
                if (trapPixels > 0) {
                    console.log(`Applying trapping to layer ${i + 1}...`);
                    await this.applyTrappingToLayer(separatedDocument, layer, trapPixels, i, colorLayers);
                } else {
                    console.log(`No trapping needed for layer ${i + 1} (trap size is 0px)`);
                }
            }

            // Delete the default background layer in separated document if it exists
            if (separatedDocument.layers.length > 0) {
                const bgLayer = separatedDocument.layers[separatedDocument.layers.length - 1];
                if (bgLayer.isBackgroundLayer || bgLayer.name === 'Background') {
                    try {
                        await bgLayer.delete();
                    } catch (e) {
                        console.log('Could not delete background layer:', e.message);
                    }
                }
            }

            // Report progress
            if (options.onProgress) {
                options.onProgress(100, 'Complete! Color separated and trapped document created.');
            }

            // Make absolutely sure the separated document is active
            const finalActiveDoc = await this.psApi.getActiveDocument();
            console.log(`Final active document: "${finalActiveDoc.title}" (id: ${finalActiveDoc.id}), layers: ${finalActiveDoc.layers.length}`);

            if (finalActiveDoc.id !== separatedDocument.id) {
                console.warn(`Active document switched! Expected ${separatedDocument.id}, got ${finalActiveDoc.id}`);
                // Switch back to the separated document
                await this.psApi.makeDocumentActive(separatedDocument);
                console.log('Switched back to separated document');
            }

            console.log('Trapping complete!');

            // Return the separated document ID
            return {
                documentId: separatedDocument.id,
                documentTitle: separatedDocument.title
            };

        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Validate document for trapping
     * @param {Object} docInfo - Document information
     * @throws {Error} - If document is not suitable
     */
    validateDocument(docInfo) {
        // Only allow RGB mode
        if (docInfo.mode !== 'RGB') {
            throw new Error('Document must be in RGB color mode. Please convert your document to RGB mode (Image > Mode > RGB Color) before applying trapping.');
        }

        if (docInfo.bitsPerChannel !== 8) {
            throw new Error('Document must be 8-bit per channel');
        }

        if (docInfo.width > 10000 || docInfo.height > 10000) {
            console.warn('Warning: Large document may take time to process');
        }
    }

    /**
     * Extract only pixels of a single color from flattened image
     * @param {ImageData} sourceData - Flattened image data
     * @param {Object} color - Target color
     * @returns {ImageData} - Layer data with only this color
     */
    extractSingleColor(sourceData, color) {
        const width = sourceData.width;
        const height = sourceData.height;

        const layerData = {
            width: width,
            height: height,
            data: new Uint8ClampedArray(width * height * 4)
        };

        // Extract only pixels matching this color
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const r = sourceData.data[idx];
                const g = sourceData.data[idx + 1];
                const b = sourceData.data[idx + 2];
                const a = sourceData.data[idx + 3];

                // Check if pixel matches target color
                if (a > 0 && r === color.r && g === color.g && b === color.b) {
                    layerData.data[idx] = r;
                    layerData.data[idx + 1] = g;
                    layerData.data[idx + 2] = b;
                    layerData.data[idx + 3] = 255; // Full opacity
                }
            }
        }

        return layerData;
    }

    /**
     * Reorder layers in document
     * @param {Document} document - Photoshop document
     * @param {Array} layers - Layers in desired order (bottom to top)
     */
    async reorderLayers(document, layers) {
        // In Photoshop, layer order is from top to bottom in the layers array
        // We want lightest on bottom, darkest on top
        // Input layers array is sorted: [lightest, ..., darkest]
        // We need to move them so darkest ends up on top
        // Strategy: Move each layer to top in FORWARD order
        // This will result in: first layer (lightest) on bottom, last layer (darkest) on top

        // Store layer IDs instead of using stale references
        const layerIds = layers.map(l => l.id);

        console.log(`Reordering ${layerIds.length} layers, lightest to darkest...`);

        // Iterate FORWARD through the array
        // Each moveToTop pushes previous layers down
        // Result: first layer ends up on bottom, last layer on top
        for (let i = 0; i < layerIds.length; i++) {
            const layerId = layerIds[i];

            // Find the current layer by ID from the fresh document reference
            const freshDoc = await this.psApi.getActiveDocument();
            const currentLayer = freshDoc.layers.find(l => l.id === layerId);

            if (!currentLayer) {
                console.warn(`Could not find layer with ID ${layerId}`);
                continue;
            }

            console.log(`Moving layer ${i + 1}/${layerIds.length}: "${currentLayer.name}" (id: ${layerId}) to top`);

            // Move layer to top of stack using batchPlay for reliability
            await this.psApi.moveLayerToTop(currentLayer);
        }

        console.log('Layer reordering complete. Order should now be: lightest on bottom, darkest on top.');

        // Verify final layer order
        const verifyDoc = await this.psApi.getActiveDocument();
        console.log('Verifying final layer order (top to bottom):');
        for (let i = 0; i < verifyDoc.layers.length; i++) {
            console.log(`  ${i + 1}. ${verifyDoc.layers[i].name} (id: ${verifyDoc.layers[i].id})`);
        }
    }

    /**
     * Apply trapping to a layer
     * @param {Document} document - Photoshop document
     * @param {Layer} layer - Layer to trap
     * @param {number} trapPixels - Trap size in pixels
     * @param {number} layerIndex - Index of this layer in sorted order
     * @param {Array} colorLayers - All color layers with metadata (includes pixelData)
     */
    async applyTrappingToLayer(document, layer, trapPixels, layerIndex, colorLayers) {
        console.log(`Applying ${trapPixels}px trap to layer "${layer.name}"`);

        // Get the full document-sized pixel data for this layer
        const currentPixelData = colorLayers[layerIndex].pixelData;
        console.log(`Using stored pixel data: ${currentPixelData.width}x${currentPixelData.height}`);

        // Create mask of areas covered by darker colors
        const darkerMask = await this.createDarkerColorMaskFromLayers(
            document,
            layerIndex,
            colorLayers
        );

        // Apply dilation with mask on full document-sized data
        const trappedPixels = this.engine.applyDilationWithMask(
            currentPixelData,
            trapPixels,
            darkerMask
        );

        console.log(`Trapped pixels: ${trappedPixels.width}x${trappedPixels.height}`);

        // Write trapped pixels back to layer at document origin (0,0)
        // This will replace the entire layer with the trapped version
        await this.psApi.setLayerPixels(layer, trappedPixels);
    }

    /**
     * Create a mask showing areas that will be covered by darker colors
     * @param {Document} document - Photoshop document
     * @param {number} currentIndex - Index of current layer in colorLayers array
     * @param {Array} colorLayers - All color layers with metadata (sorted lightest to darkest)
     * @returns {ImageData} - Binary mask where opaque pixels = areas covered by darker colors
     */
    async createDarkerColorMaskFromLayers(document, currentIndex, colorLayers) {
        const width = document.width;
        const height = document.height;
        const maskData = new Uint8ClampedArray(width * height * 4);

        console.log(`Creating darker mask for layer ${currentIndex + 1}/${colorLayers.length}`);

        // Combine all DARKER layers (higher lightness values = darker, later in array)
        // Current layer is at index currentIndex, so darker layers are at indices > currentIndex
        for (let i = currentIndex + 1; i < colorLayers.length; i++) {
            const darkerLayer = colorLayers[i];
            const darkerPixels = darkerLayer.pixelData;

            console.log(`  Adding darker layer ${i + 1} (${darkerLayer.color.r},${darkerLayer.color.g},${darkerLayer.color.b}) to mask`);

            // Add all opaque pixels from this darker layer to the mask
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const idx = (y * width + x) * 4;

                    // If this darker layer has a pixel here, mark it in the mask
                    if (darkerPixels.data[idx + 3] > 0) {
                        maskData[idx] = 255;     // Red (not used, but set for consistency)
                        maskData[idx + 1] = 255; // Green (not used)
                        maskData[idx + 2] = 255; // Blue (not used)
                        maskData[idx + 3] = 255; // Alpha = opaque means "blocked by darker color"
                    }
                }
            }
        }

        return {
            width: width,
            height: height,
            data: maskData
        };
    }

}

// Export for Node.js
module.exports = TrapperController;