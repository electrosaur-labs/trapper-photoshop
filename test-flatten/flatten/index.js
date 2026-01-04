const { entrypoints } = require('uxp');
const { app, action, core } = require('photoshop');

let logDiv;

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

// Test 1: Native flatten API
document.getElementById('testNativeFlat').addEventListener('click', async () => {
    log('\n========================================');
    log('TEST 1: Native app.activeDocument.flatten()');
    log('========================================');

    try {
        if (!app.activeDocument) {
            log('ERROR: No active document');
            return;
        }

        const doc = app.activeDocument;
        log(`Document: "${doc.title}"`);
        log(`Layers before: ${doc.layers.length}`);

        await core.executeAsModal(async () => {
            log('Inside executeAsModal, calling flatten()...');
            await app.activeDocument.flatten();
            log('Flatten call completed');

            const checkDoc = app.activeDocument;
            log(`Layers after (immediate check): ${checkDoc.layers.length}`);

            await new Promise(resolve => setTimeout(resolve, 500));
            const checkDoc2 = app.activeDocument;
            log(`Layers after (500ms delay): ${checkDoc2.layers.length}`);

        }, { commandName: 'Test Flatten Native' });

        log('Exited executeAsModal');
        const finalDoc = app.activeDocument;
        log(`Layers after (outside modal): ${finalDoc.layers.length}`);
        log(finalDoc.layers.length === 1 ? 'SUCCESS!' : 'FAILED - still has multiple layers');

    } catch (error) {
        log(`ERROR: ${error.message}`);
        log(`Stack: ${error.stack}`);
    }
});

// Test 2: batchPlay flattenImage
document.getElementById('testBatchPlayFlat').addEventListener('click', async () => {
    log('\n========================================');
    log('TEST 2: batchPlay flattenImage');
    log('========================================');

    try {
        if (!app.activeDocument) {
            log('ERROR: No active document');
            return;
        }

        const doc = app.activeDocument;
        log(`Document: "${doc.title}"`);
        log(`Layers before: ${doc.layers.length}`);

        await core.executeAsModal(async () => {
            log('Inside executeAsModal, calling batchPlay flattenImage...');

            await action.batchPlay([{
                _obj: 'flattenImage'
            }], {});

            log('BatchPlay call completed');

            const checkDoc = app.activeDocument;
            log(`Layers after (immediate check): ${checkDoc.layers.length}`);

            await new Promise(resolve => setTimeout(resolve, 500));
            const checkDoc2 = app.activeDocument;
            log(`Layers after (500ms delay): ${checkDoc2.layers.length}`);

        }, { commandName: 'Test Flatten BatchPlay' });

        log('Exited executeAsModal');
        const finalDoc = app.activeDocument;
        log(`Layers after (outside modal): ${finalDoc.layers.length}`);
        log(finalDoc.layers.length === 1 ? 'SUCCESS!' : 'FAILED - still has multiple layers');

    } catch (error) {
        log(`ERROR: ${error.message}`);
        log(`Stack: ${error.stack}`);
    }
});

// Test 3: batchPlay mergeLayersNew
document.getElementById('testBatchPlayMerge').addEventListener('click', async () => {
    log('\n========================================');
    log('TEST 3: batchPlay mergeLayersNew');
    log('========================================');

    try {
        if (!app.activeDocument) {
            log('ERROR: No active document');
            return;
        }

        const doc = app.activeDocument;
        log(`Document: "${doc.title}"`);
        log(`Layers before: ${doc.layers.length}`);

        await core.executeAsModal(async () => {
            log('Inside executeAsModal, calling batchPlay mergeLayersNew...');

            await action.batchPlay([{
                _obj: 'mergeLayersNew'
            }], {});

            log('BatchPlay call completed');

            const checkDoc = app.activeDocument;
            log(`Layers after (immediate check): ${checkDoc.layers.length}`);

            await new Promise(resolve => setTimeout(resolve, 500));
            const checkDoc2 = app.activeDocument;
            log(`Layers after (500ms delay): ${checkDoc2.layers.length}`);

        }, { commandName: 'Test Merge Layers' });

        log('Exited executeAsModal');
        const finalDoc = app.activeDocument;
        log(`Layers after (outside modal): ${finalDoc.layers.length}`);
        log(finalDoc.layers.length === 1 ? 'SUCCESS!' : 'FAILED - still has multiple layers');

    } catch (error) {
        log(`ERROR: ${error.message}`);
        log(`Stack: ${error.stack}`);
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
        'flattenTest.show': showTestDialog
    }
});

// Initialize
logDiv = document.getElementById('log');
log('Flatten Test Plugin loaded');
log('Open a multi-layer document and click a test button');
