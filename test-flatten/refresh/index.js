const { entrypoints } = require('uxp');
const { app, action, core } = require('photoshop');

let logDiv;
let testDocument;

function log(message) {
    console.log(message);
    if (logDiv) {
        logDiv.textContent += message + '\n';
        logDiv.scrollTop = logDiv.scrollHeight;
    }
}

function clearLog() {
    if (logDiv) {
        logDiv.textContent = '';
    }
}

// Step 1: Create 5 layers for testing
document.getElementById('testCreateLayers').addEventListener('click', async () => {
    log('\n========================================');
    log('STEP 1: Creating 5 test layers');
    log('========================================');

    try {
        if (!app.activeDocument) {
            log('ERROR: No active document');
            return;
        }

        testDocument = app.activeDocument;
        log(`Document: "${testDocument.title}"`);
        log(`Starting layers: ${testDocument.layers.length}`);

        await core.executeAsModal(async () => {
            log('Inside executeAsModal, creating layers...');

            for (let i = 1; i <= 5; i++) {
                await action.batchPlay([{
                    _obj: 'make',
                    _target: [{ _ref: 'layer' }],
                    name: `Test Layer ${i}`
                }], {});
                log(`Created layer ${i}`);
            }

            log('All layers created');

            // Check layer count immediately
            const checkDoc = app.activeDocument;
            log(`Layers after (immediate check inside modal): ${checkDoc.layers.length}`);

        }, { commandName: 'Create Test Layers' });

        log('Exited executeAsModal');

        // Check layer count outside modal
        const finalDoc = app.activeDocument;
        log(`Layers after (outside modal): ${finalDoc.layers.length}`);
        log('Layer names:');
        for (let i = 0; i < finalDoc.layers.length; i++) {
            log(`  [${i}] ${finalDoc.layers[i].name}`);
        }

        log('SUCCESS! Now try the refresh tests below.');
        log('IMPORTANT: Check the Layers panel in Photoshop - does it show the correct number of layers?');

    } catch (error) {
        log(`ERROR: ${error.message}`);
        log(`Stack: ${error.stack}`);
    }
});

// Test 1: Switch documents and back
document.getElementById('testRefresh1').addEventListener('click', async () => {
    log('\n========================================');
    log('TEST 1: Switch documents and back');
    log('========================================');

    try {
        if (!app.activeDocument) {
            log('ERROR: No active document');
            return;
        }

        const currentDoc = app.activeDocument;
        log(`Current document: "${currentDoc.title}" (${currentDoc.layers.length} layers)`);

        // Check if there's another document to switch to
        const allDocs = app.documents;
        log(`Total open documents: ${allDocs.length}`);

        if (allDocs.length < 2) {
            log('Need at least 2 open documents for this test');
            log('Creating a temporary document...');

            await core.executeAsModal(async () => {
                await action.batchPlay([{
                    _obj: 'make',
                    _target: [{ _ref: 'document' }],
                    documentPreset: {
                        _obj: 'documentPreset',
                        width: { _unit: 'pixelsUnit', _value: 500 },
                        height: { _unit: 'pixelsUnit', _value: 500 },
                        resolution: { _unit: 'densityUnit', _value: 72 },
                        mode: { _enum: 'newDocumentMode', _value: 'RGBColorMode' },
                        fill: { _enum: 'fill', _value: 'white' },
                        name: 'Temp Document'
                    }
                }], {});
            }, { commandName: 'Create Temp Document' });

            log('Created temporary document');
        }

        // Switch to a different document
        const otherDoc = allDocs.find(doc => doc.id !== currentDoc.id);
        if (otherDoc) {
            log(`Switching to: "${otherDoc.title}"`);

            await core.executeAsModal(async () => {
                await action.batchPlay([{
                    _obj: 'select',
                    _target: [{ _ref: 'document', _id: otherDoc.id }]
                }], {});
            }, { commandName: 'Switch Document' });

            log(`Active document is now: "${app.activeDocument.title}"`);

            // Wait a moment
            await new Promise(resolve => setTimeout(resolve, 500));

            // Switch back
            log(`Switching back to: "${currentDoc.title}"`);

            await core.executeAsModal(async () => {
                await action.batchPlay([{
                    _obj: 'select',
                    _target: [{ _ref: 'document', _id: currentDoc.id }]
                }], {});
            }, { commandName: 'Switch Back' });

            log(`Active document is now: "${app.activeDocument.title}"`);

            // Check layers
            const finalDoc = app.activeDocument;
            log(`Layers: ${finalDoc.layers.length}`);
            log('Check Photoshop Layers panel - does it show the correct layers now?');
        }

    } catch (error) {
        log(`ERROR: ${error.message}`);
    }
});

// Test 2: Make each layer active
document.getElementById('testRefresh2').addEventListener('click', async () => {
    log('\n========================================');
    log('TEST 2: Make each layer active sequentially');
    log('========================================');

    try {
        if (!app.activeDocument) {
            log('ERROR: No active document');
            return;
        }

        const doc = app.activeDocument;
        log(`Document: "${doc.title}" (${doc.layers.length} layers)`);

        await core.executeAsModal(async () => {
            const docLayers = app.activeDocument.layers;

            for (let i = 0; i < docLayers.length; i++) {
                const layer = docLayers[i];
                log(`Making layer ${i + 1} active: "${layer.name}"`);

                await action.batchPlay([{
                    _obj: 'select',
                    _target: [{ _ref: 'layer', _id: layer.id }]
                }], {});

                // Small delay
                await new Promise(resolve => setTimeout(resolve, 100));
            }

        }, { commandName: 'Activate Each Layer' });

        log('Complete. Check if layers panel is now correct.');

    } catch (error) {
        log(`ERROR: ${error.message}`);
    }
});

// Test 3: Select all layers
document.getElementById('testRefresh3').addEventListener('click', async () => {
    log('\n========================================');
    log('TEST 3: Select all layers');
    log('========================================');

    try {
        if (!app.activeDocument) {
            log('ERROR: No active document');
            return;
        }

        const doc = app.activeDocument;
        log(`Document: "${doc.title}" (${doc.layers.length} layers)`);

        await core.executeAsModal(async () => {
            log('Selecting all layers...');

            // First select the first layer
            const firstLayer = app.activeDocument.layers[0];
            await action.batchPlay([{
                _obj: 'select',
                _target: [{ _ref: 'layer', _id: firstLayer.id }]
            }], {});

            // Then select to the last layer (select all)
            const lastLayer = app.activeDocument.layers[app.activeDocument.layers.length - 1];
            await action.batchPlay([{
                _obj: 'select',
                _target: [{ _ref: 'layer', _id: lastLayer.id }],
                selectionModifier: { _enum: 'selectionModifierType', _value: 'addToSelection' },
                makeVisible: false
            }], {});

            log('All layers selected');

            // Deselect by selecting just the first layer again
            await new Promise(resolve => setTimeout(resolve, 500));
            await action.batchPlay([{
                _obj: 'select',
                _target: [{ _ref: 'layer', _id: firstLayer.id }]
            }], {});

        }, { commandName: 'Select All Layers' });

        log('Complete. Check if layers panel is now correct.');

    } catch (error) {
        log(`ERROR: ${error.message}`);
    }
});

// Test 4: Collapse/expand layers panel (not possible via API - skip)
document.getElementById('testRefresh4').addEventListener('click', async () => {
    log('\n========================================');
    log('TEST 4: Collapse/expand layers panel');
    log('========================================');
    log('This test cannot be performed via UXP API');
    log('UXP does not provide access to panel UI controls');
    log('Manual test: Collapse and expand the Layers panel manually');
});

// Test 5: Toggle layer visibility
document.getElementById('testRefresh5').addEventListener('click', async () => {
    log('\n========================================');
    log('TEST 5: Toggle layer visibility');
    log('========================================');

    try {
        if (!app.activeDocument) {
            log('ERROR: No active document');
            return;
        }

        const doc = app.activeDocument;
        log(`Document: "${doc.title}" (${doc.layers.length} layers)`);

        await core.executeAsModal(async () => {
            const docLayers = app.activeDocument.layers;

            log('Hiding all layers...');
            for (let i = 0; i < docLayers.length; i++) {
                docLayers[i].visible = false;
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            log('Showing all layers...');
            for (let i = 0; i < docLayers.length; i++) {
                docLayers[i].visible = true;
            }

        }, { commandName: 'Toggle Layer Visibility' });

        log('Complete. Check if layers panel is now correct.');

    } catch (error) {
        log(`ERROR: ${error.message}`);
    }
});

// Clear log button
document.getElementById('clearLog').addEventListener('click', () => {
    clearLog();
});

// Close button
document.getElementById('closeButton').addEventListener('click', () => {
    document.getElementById('testDialog').close();
});

// Show dialog function
async function showTestDialog() {
    const dialog = document.getElementById('testDialog');
    await dialog.showModal();
}

// Register command entrypoint
entrypoints.setup({
    commands: {
        'refreshTest.show': showTestDialog
    }
});

// Initialize
logDiv = document.getElementById('log');
log('Display Refresh Test Plugin loaded');
log('Click "Step 1: Create 5 Layers" first, then try the refresh tests');
