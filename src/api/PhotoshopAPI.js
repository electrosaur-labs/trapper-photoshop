/**
 * Photoshop API Integration
 * Wrapper for Photoshop UXP API calls
 */

const { app, action, core } = require('photoshop');
const { imaging } = require('photoshop');

class PhotoshopAPI {
    constructor() {
        this.batchPlayOptions = {
            synchronousExecution: true,
            modalBehavior: 'execute'
        };
    }

    /**
     * Get the active document
     * @returns {Promise<Document>} - Active document or null
     */
    async getActiveDocument() {
        try {
            return app.activeDocument;
        } catch (error) {
            console.warn('No active document');
            return null;
        }
    }

    /**
     * Create a new document
     * @param {Object} options - Document options
     * @returns {Promise<Document>} - New document
     */
    async createDocument(options = {}) {
        const preset = {
            width: options.width || 1000,
            height: options.height || 1000,
            resolution: options.resolution || 72,
            mode: options.mode || 'RGBColorMode',
            fill: options.fill || 'transparent',
            name: options.name || 'Untitled'
        };

        // Create document using batchPlay
        await action.batchPlay([
            {
                _obj: 'make',
                _target: [{ _ref: 'document' }],
                documentPreset: {
                    _obj: 'documentPreset',
                    width: { _unit: 'pixelsUnit', _value: preset.width },
                    height: { _unit: 'pixelsUnit', _value: preset.height },
                    resolution: { _unit: 'densityUnit', _value: preset.resolution },
                    mode: { _enum: 'newDocumentMode', _value: preset.mode },
                    fill: { _enum: 'fill', _value: preset.fill },
                    name: preset.name
                }
            }
        ], this.batchPlayOptions);

        // Return the newly created document
        return app.activeDocument;
    }

    /**
     * Get document information
     * @param {Document} document - Photoshop document
     * @returns {Promise<Object>} - Document info
     */
    async getDocumentInfo(document) {
        // Extract mode string from the mode object
        let mode = document.mode;
        console.log('Raw document.mode:', JSON.stringify(mode), 'Type:', typeof mode);

        if (typeof mode === 'object' && mode._value) {
            console.log('Mode object _value:', mode._value);
            // Convert "RGBColorMode" to "RGB", "CMYKColorMode" to "CMYK", etc.
            mode = mode._value.replace('ColorMode', '').replace('Color', '');
        } else if (typeof mode === 'string') {
            // Already a string, might need cleanup
            mode = mode.replace('ColorMode', '').replace('Color', '');
        }

        console.log('Final mode string:', mode);

        // Extract bits per channel
        let bitsPerChannel = document.bitsPerChannel;
        console.log('Raw bitsPerChannel:', JSON.stringify(bitsPerChannel), 'Type:', typeof bitsPerChannel);

        // Handle various possible formats
        if (typeof bitsPerChannel === 'object' && bitsPerChannel._value) {
            // Extract numeric value from strings like "8 Bits/Channel"
            const match = String(bitsPerChannel._value).match(/(\d+)/);
            bitsPerChannel = match ? parseInt(match[1]) : bitsPerChannel._value;
        } else if (typeof bitsPerChannel === 'string') {
            // Extract numeric value from string
            const match = bitsPerChannel.match(/(\d+)/);
            bitsPerChannel = match ? parseInt(match[1]) : 8;
        }

        console.log('Final bitsPerChannel:', bitsPerChannel);

        return {
            width: document.width,
            height: document.height,
            resolution: document.resolution,
            mode: mode,
            bitsPerChannel: bitsPerChannel,
            name: document.title,
            layerCount: document.layers.length
        };
    }

    /**
     * Get all layers in document
     * @param {Document} document - Photoshop document
     * @returns {Promise<Array>} - Array of layers
     */
    async getLayers(document) {
        const layers = [];

        const traverse = (layerCollection) => {
            layerCollection.forEach(layer => {
                layers.push(layer);
                if (layer.layers) {
                    traverse(layer.layers);
                }
            });
        };

        traverse(document.layers);
        return layers;
    }

    /**
     * Get pixel data from a layer
     * @param {Layer} layer - Photoshop layer
     * @returns {Promise<Object>} - Pixel data in ImageData-like format
     */
    async getLayerPixels(layer) {
        // Validate that we received a layer, not a document
        if (!layer) {
            throw new Error('getLayerPixels: layer parameter is null or undefined');
        }

        // Check if this is accidentally a document instead of a layer
        if (layer.layers !== undefined && layer.activeDocument === undefined) {
            // Has layers property but not activeDocument - likely a layer group
            console.log('getLayerPixels: Received a layer group');
        } else if (layer.layers !== undefined) {
            // Has layers property AND might be a document
            throw new Error(`getLayerPixels: Received a Document (id: ${layer.id}, title: ${layer.title}) instead of a Layer. ` +
                           `Document has ${layer.layers.length} layers. Did you mean to pass one of its layers?`);
        }

        console.log(`getLayerPixels: Getting pixels for layer "${layer.name}"`);
        console.log(`getLayerPixels: Layer id: ${layer.id}, kind: ${layer.kind}, isBackgroundLayer: ${layer.isBackgroundLayer}`);

        // Get layer bounds
        const bounds = layer.bounds;
        const width = Math.round(bounds.right - bounds.left);
        const height = Math.round(bounds.bottom - bounds.top);

        console.log(`getLayerPixels: Layer bounds: ${width}x${height}`);

        // Check if layer is empty (bounds are 0x0)
        if (width <= 0 || height <= 0) {
            console.warn(`getLayerPixels: Layer "${layer.name}" has empty bounds (${width}x${height}), returning empty data`);
            // Return empty pixel data
            const emptyData = new Uint8ClampedArray(1 * 1 * 4); // 1x1 transparent pixel
            return {
                width: 1,
                height: 1,
                data: emptyData
            };
        }

        // Use imaging.getPixels API
        try {
            console.log('getLayerPixels: Attempting imaging.getPixels()...');

            // Get current document ID
            const docId = app.activeDocument.id;
            console.log(`getLayerPixels: documentID=${docId}, layerID=${layer.id}`);

            // Simple options - let it default to entire layer bounds
            const options = {
                documentID: docId,
                layerID: layer.id
            };

            const pixelData = await imaging.getPixels(options);

            console.log('getLayerPixels: imaging.getPixels() result:', pixelData);
            console.log('getLayerPixels: Has pixels property:', !!pixelData.pixels);
            console.log('getLayerPixels: Has imageData property:', !!pixelData.imageData);

            if (!pixelData) {
                throw new Error('imaging.getPixels() returned null');
            }

            // The result has a 'pixels' property with the typed array
            let pixelArray;

            if (pixelData.pixels) {
                // Direct pixels array
                pixelArray = pixelData.pixels;
                console.log(`getLayerPixels: Got pixels array, length=${pixelArray.length}, type=${pixelArray.constructor.name}`);
            } else if (pixelData.imageData) {
                // Fall back to imageData with getData()
                console.log('getLayerPixels: Using imageData.getData()...');
                const imageData = pixelData.imageData;
                pixelArray = await imageData.getData({ chunky: true });
                console.log(`getLayerPixels: Got data via getData(), length=${pixelArray.length}`);

                // Dispose imageData when done
                if (imageData.dispose) {
                    imageData.dispose();
                }
            } else {
                throw new Error('imaging.getPixels() returned object without pixels or imageData property');
            }

            // Convert to Uint8ClampedArray for consistent RGBA format
            const rgbaData = new Uint8ClampedArray(pixelArray);
            console.log(`getLayerPixels: Final RGBA data length: ${rgbaData.length}, expected: ${width * height * 4}`);

            return {
                width: width,
                height: height,
                data: rgbaData
            };

        } catch (error) {
            console.error('getLayerPixels: imaging.getPixels() failed:', error);
            console.error('getLayerPixels: Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            const errorMsg = error && error.message ? error.message : String(error);
            throw new Error(`Cannot read pixels from layer "${layer.name}". Error: ${errorMsg}`);
        }
    }

    /**
     * Set pixel data for a layer
     * @param {Layer} layer - Photoshop layer
     * @param {Object} imageData - Pixel data to set
     * @returns {Promise<void>}
     */
    async setLayerPixels(layer, imageData, targetBounds = null) {
        console.log('setLayerPixels called with imageData:', imageData ? 'defined' : 'undefined');

        if (!imageData || !imageData.data) {
            throw new Error('Invalid imageData provided to setLayerPixels');
        }

        console.log(`setLayerPixels: Setting ${imageData.data.length} bytes to layer "${layer.name}"`);
        console.log(`setLayerPixels: Image dimensions: ${imageData.width}x${imageData.height}`);

        try {
            // Get current document ID
            const docId = app.activeDocument.id;

            // Convert to Uint8Array if needed (createImageDataFromBuffer requires typed array, not ArrayBuffer)
            let pixelArray;
            if (imageData.data instanceof Uint8ClampedArray) {
                // Convert Uint8ClampedArray to Uint8Array
                pixelArray = new Uint8Array(imageData.data.buffer);
                console.log(`setLayerPixels: Converted Uint8ClampedArray to Uint8Array, length=${pixelArray.length}`);
            } else if (imageData.data instanceof Uint8Array) {
                pixelArray = imageData.data;
                console.log(`setLayerPixels: Already Uint8Array, length=${pixelArray.length}`);
            } else {
                throw new Error(`Unexpected pixel data type: ${imageData.data.constructor.name}`);
            }

            // Create an ImageData object from the typed array using imaging API
            console.log(`setLayerPixels: Creating ImageData with width=${imageData.width}, height=${imageData.height}, components=4`);
            const psImageData = await imaging.createImageDataFromBuffer(pixelArray, {
                width: imageData.width,
                height: imageData.height,
                components: 4, // RGBA
                colorSpace: "RGB"
            });

            console.log('setLayerPixels: ImageData created successfully');

            // Prepare putPixels options
            const putPixelsOptions = {
                layerID: layer.id,
                imageData: psImageData,
                replace: true
            };

            // If targetBounds specified, use them; otherwise write to (0,0)
            if (targetBounds) {
                putPixelsOptions.targetBounds = targetBounds;
                console.log(`setLayerPixels: Writing to specified bounds:`, targetBounds);
            } else {
                // Default: write to document origin (0,0)
                putPixelsOptions.targetBounds = {
                    top: 0,
                    left: 0,
                    bottom: imageData.height,
                    right: imageData.width
                };
                console.log(`setLayerPixels: Writing to default bounds (0,0):`, putPixelsOptions.targetBounds);
            }

            await imaging.putPixels(putPixelsOptions);

            console.log('setLayerPixels: Pixels written, disposing ImageData');

            // Dispose the ImageData object
            if (psImageData.dispose) {
                psImageData.dispose();
            }

            console.log('setLayerPixels: Complete');
        } catch (error) {
            console.error('setLayerPixels: Failed to write pixels:', error);
            throw new Error(`Failed to write pixels to layer "${layer.name}": ${error.message}`);
        }
    }

    /**
     * Get layer bounds
     * @param {Layer} layer - Photoshop layer
     * @returns {Promise<Object>} - Layer bounds
     */
    async getLayerBounds(layer) {
        const bounds = layer.bounds;
        return {
            top: bounds.top,
            left: bounds.left,
            bottom: bounds.bottom,
            right: bounds.right,
            width: bounds.right - bounds.left,
            height: bounds.bottom - bounds.top
        };
    }

    /**
     * Create a new layer
     * @param {Document|LayerGroup} parent - Parent document or group
     * @param {string} name - Layer name
     * @returns {Promise<Layer>} - New layer
     */
    async createLayer(parent, name) {
        console.log(`createLayer: Creating layer "${name}"`);

        await action.batchPlay([
            {
                _obj: 'make',
                _target: [{ _ref: 'layer' }],
                name: name
            }
        ], this.batchPlayOptions);

        // Get fresh reference to active document and return the newly created layer
        const activeDoc = app.activeDocument;
        const newLayer = activeDoc.activeLayers[0];
        console.log(`createLayer: Created layer "${newLayer.name}" (id: ${newLayer.id})`);

        return newLayer;
    }

    /**
     * Create a new layer in a specific document
     * @param {Document} document - Target document
     * @param {string} name - Layer name
     * @param {LayerGroup} group - Optional parent group
     * @returns {Promise<Layer>} - New layer
     */
    async createLayerInDocument(document, name, group = null) {
        console.log(`createLayerInDocument: Creating layer "${name}" in document "${document.title}" (id: ${document.id})`);
        console.log(`Current active document:`, app.activeDocument ? app.activeDocument.title : 'none');

        // Make sure the target document is active using batchPlay
        await action.batchPlay([
            {
                _obj: 'select',
                _target: [
                    {
                        _ref: 'document',
                        _id: document.id
                    }
                ]
            }
        ], this.batchPlayOptions);

        console.log(`After select, active document:`, app.activeDocument ? app.activeDocument.title : 'none');

        // Create the layer in the now-active document
        await action.batchPlay([
            {
                _obj: 'make',
                _target: [{ _ref: 'layer' }],
                name: name
            }
        ], this.batchPlayOptions);

        console.log(`Layer created, checking active document layers...`);

        // Make absolutely sure we're getting the layer from the correct document
        const activeDoc = app.activeDocument;
        console.log(`Active document after layer creation: ${activeDoc.title}, has ${activeDoc.layers.length} layers`);

        // Return the newly created layer from the active document
        return activeDoc.activeLayers[0];
    }

    /**
     * Create a layer group
     * @param {Document} document - Photoshop document
     * @param {string} name - Group name
     * @returns {Promise<LayerGroup>} - New layer group
     */
    async createLayerGroup(document, name) {
        await action.batchPlay([
            {
                _obj: 'make',
                _target: [
                    {
                        _ref: 'layerSection'
                    }
                ],
                name: name
            }
        ], this.batchPlayOptions);

        // Return the newly created group
        return document.activeLayers[0];
    }

    /**
     * Set layer visibility
     * @param {Layer} layer - Photoshop layer
     * @param {boolean} visible - Visibility state
     * @returns {Promise<void>}
     */
    async setLayerVisibility(layer, visible) {
        layer.visible = visible;
    }

    /**
     * Duplicate a layer
     * @param {Layer} layer - Layer to duplicate
     * @param {string} name - Name for duplicated layer
     * @returns {Promise<Layer>} - Duplicated layer
     */
    async duplicateLayer(layer, name) {
        const duplicate = await layer.duplicate();
        duplicate.name = name || `${layer.name} copy`;
        return duplicate;
    }

    /**
     * Select all pixels in a layer
     * @param {Layer} layer - Photoshop layer
     * @returns {Promise<void>}
     */
    async selectLayerPixels(layer) {
        await action.batchPlay([
            {
                _obj: 'set',
                _target: [
                    {
                        _ref: 'channel',
                        _property: 'selection'
                    }
                ],
                to: {
                    _ref: 'channel',
                    _enum: 'channel',
                    _value: 'transparencyEnum'
                },
                layer: {
                    _ref: 'layer',
                    _id: layer.id
                }
            }
        ], this.batchPlayOptions);
    }

    /**
     * Deselect all
     * @returns {Promise<void>}
     */
    async deselect() {
        await action.batchPlay([
            {
                _obj: 'set',
                _target: [
                    {
                        _ref: 'channel',
                        _property: 'selection'
                    }
                ],
                to: {
                    _enum: 'ordinal',
                    _value: 'none'
                }
            }
        ], this.batchPlayOptions);
    }

    /**
     * Invert the current selection
     * @returns {Promise<void>}
     */
    async invertSelection() {
        console.log('invertSelection: Inverting selection...');

        await action.batchPlay([
            {
                _obj: 'inverse'
            }
        ], this.batchPlayOptions);

        console.log('invertSelection: Complete');
    }

    /**
     * Delete the current selection
     * @returns {Promise<void>}
     */
    async deleteSelection() {
        console.log('deleteSelection: Deleting selection...');

        await action.batchPlay([
            {
                _obj: 'delete'
            }
        ], this.batchPlayOptions);

        console.log('deleteSelection: Complete');
    }

    /**
     * Select pixels by color range
     * @param {Object} color - Color to select {r, g, b}
     * @returns {Promise<void>}
     */
    async selectColorRange(color) {
        console.log(`selectColorRange: Selecting RGB(${color.r},${color.g},${color.b})`);

        await action.batchPlay([
            {
                _obj: 'colorRange',
                fuzziness: 0, // Exact color match
                colorModel: {
                    _obj: 'RGBColor',
                    red: color.r,
                    grain: color.g,  // Green is called 'grain' in action descriptors
                    blue: color.b
                }
            }
        ], this.batchPlayOptions);

        console.log('selectColorRange: Selection created');
    }

    /**
     * Cut selection to a new layer (Layer via Cut)
     * @returns {Promise<Layer>} - The newly created layer
     */
    async layerViaCut() {
        console.log('layerViaCut: Creating layer from selection...');

        await action.batchPlay([
            {
                _obj: 'cutToLayer'
            }
        ], this.batchPlayOptions);

        // The new layer becomes the active layer
        const newLayer = app.activeDocument.activeLayers[0];
        console.log(`layerViaCut: Created layer "${newLayer.name}"`);

        return newLayer;
    }

    /**
     * Copy selection to a new layer (Layer via Copy)
     * @returns {Promise<Layer>} - The newly created layer
     */
    async layerViaCopy() {
        console.log('layerViaCopy: Creating layer from selection...');

        // The correct command is 'copyToLayer' with isCommand: false
        // This is equivalent to Layer > New > Layer via Copy in the UI
        // Source: https://forums.creativeclouddeveloper.com/t/using-layer-via-copy-as-script/7563
        await action.batchPlay([
            {
                _obj: 'copyToLayer',
                isCommand: false
            }
        ], this.batchPlayOptions);

        // The new layer becomes the active layer
        const newLayer = app.activeDocument.activeLayers[0];
        console.log(`layerViaCopy: Created layer "${newLayer.name}"`);

        return newLayer;
    }

    /**
     * Make a layer active
     * @param {Layer} layer - Layer to activate
     * @returns {Promise<void>}
     */
    async makeLayerActive(layer) {
        console.log(`makeLayerActive: Activating layer "${layer.name}" (id: ${layer.id})`);

        await action.batchPlay([
            {
                _obj: 'select',
                _target: [{ _ref: 'layer', _id: layer.id }]
            }
        ], this.batchPlayOptions);

        console.log('makeLayerActive: Complete');
    }

    /**
     * Duplicate a document
     * @param {Document} document - Document to duplicate
     * @param {string} name - Name for the duplicate
     * @returns {Promise<Document>} - Duplicated document
     */
    async duplicateDocument(document, name) {
        console.log(`duplicateDocument: Duplicating "${document.title}" as "${name}"`);

        await action.batchPlay([
            {
                _obj: 'duplicate',
                _target: [{ _ref: 'document', _id: document.id }],
                name: name
            }
        ], this.batchPlayOptions);

        // The duplicated document becomes active
        const duplicatedDoc = app.activeDocument;
        console.log(`duplicateDocument: Created "${duplicatedDoc.title}"`);

        return duplicatedDoc;
    }

    /**
     * Flatten a document
     * @param {Document} document - Document to flatten
     * @returns {Promise<void>}
     */
    async flattenDocument(document) {
        console.log(`flattenDocument: Flattening "${document.title}"`);

        // Make sure the document is active
        await action.batchPlay([
            {
                _obj: 'select',
                _target: [{ _ref: 'document', _id: document.id }]
            }
        ], this.batchPlayOptions);

        // Flatten it
        await action.batchPlay([
            {
                _obj: 'flattenImage'
            }
        ], this.batchPlayOptions);

        console.log('flattenDocument: Complete');
    }

    /**
     * Make a document active
     * @param {Document} document - Document to activate
     * @returns {Promise<void>}
     */
    async makeDocumentActive(document) {
        console.log(`makeDocumentActive: Activating document "${document.title}" (id: ${document.id})`);

        await action.batchPlay([
            {
                _obj: 'select',
                _target: [{ _ref: 'document', _id: document.id }]
            }
        ], this.batchPlayOptions);

        console.log('makeDocumentActive: Complete');
    }

    /**
     * Move a layer to the top of the stack
     * @param {Layer} layer - Layer to move
     * @returns {Promise<void>}
     */
    async moveLayerToTop(layer) {
        console.log(`moveLayerToTop: Moving layer "${layer.name}" (id: ${layer.id}) to top`);

        try {
            // Try using the native moveAbove API instead of batchPlay
            // Move to the very top by not specifying a target layer
            await layer.move(layer.parent, 'placeAtBeginning');
            console.log('moveLayerToTop: Complete (native API)');
        } catch (e) {
            console.error('moveLayerToTop: Native API failed, trying batchPlay:', e);

            // Fallback to batchPlay
            await action.batchPlay([
                {
                    _obj: 'move',
                    _target: [{ _ref: 'layer', _id: layer.id }],
                    to: {
                        _ref: 'layer',
                        _enum: 'ordinal',
                        _value: 'front'
                    }
                }
            ], this.batchPlayOptions);

            console.log('moveLayerToTop: Complete (batchPlay)');
        }
    }

    /**
     * Save document
     * @param {Document} document - Photoshop document
     * @param {string} path - Save path (optional)
     * @returns {Promise<void>}
     */
    async saveDocument(document, path) {
        if (path) {
            await document.saveAs.psd(path);
        } else {
            await document.save();
        }
    }

    /**
     * Show alert dialog
     * @param {string} message - Alert message
     * @returns {Promise<void>}
     */
    async showAlert(message) {
        await app.showAlert(message);
    }

    /**
     * Begin undo group
     * @param {string} name - Undo group name
     * @returns {Promise<void>}
     */
    async beginUndoGroup(name) {
        await core.executeAsModal(async () => {
            await action.batchPlay([
                {
                    _obj: 'historySuspend',
                    documentID: app.activeDocument.id,
                    name: name
                }
            ], this.batchPlayOptions);
        }, { commandName: name });
    }

    /**
     * End undo group
     * @returns {Promise<void>}
     */
    async endUndoGroup() {
        await core.executeAsModal(async () => {
            await action.batchPlay([
                {
                    _obj: 'historyResume',
                    documentID: app.activeDocument.id
                }
            ], this.batchPlayOptions);
        }, { commandName: 'End Undo Group' });
    }
}

// Export for Node.js
module.exports = PhotoshopAPI;