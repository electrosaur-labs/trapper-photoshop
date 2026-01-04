/**
 * Trapper - Color Trapping Plugin for Photoshop
 * Modal dialog version
 */

const { entrypoints } = require("uxp");
const { app, core } = require("photoshop");

// Import modules
const TrapperController = require("./core/TrapperController");

// Plugin state
let controller = null;
let listenersAttached = false;

/**
 * Plugin initialization
 */
async function initialize() {
    console.log("Trapper Plugin: Initializing...");

    try {
        // Initialize controller
        controller = new TrapperController();
        console.log("Trapper Plugin: Initialized successfully");
    } catch (error) {
        console.error("Trapper Plugin: Initialization failed", error);
    }
}

/**
 * Show the trapping dialog
 */
async function showTrapperDialog() {
    console.log("Trapper Plugin: Showing dialog");

    if (!controller) {
        await app.showAlert("Plugin not initialized. Please restart Photoshop.");
        return;
    }

    // Check document validity before showing dialog
    const validity = await controller.checkDocumentValidity();
    console.log("Trapper Plugin: Document validity:", JSON.stringify(validity));

    // If document is invalid, show alert and don't open dialog
    if (!validity.isValid) {
        let message = validity.reason || "Unknown error";
        if (validity.mode && validity.mode !== 'RGB') {
            message = `Document is in ${validity.mode} mode.\n\nPlease convert to RGB mode:\nImage > Mode > RGB Color`;
        } else if (validity.reason === 'No document open') {
            message = 'Please open a document to apply color trapping.';
        }

        await app.showAlert(message);
        return;
    }

    const dialog = document.getElementById("trapperDialog");
    if (!dialog) {
        console.error("Trapper Plugin: Could not find dialog element");
        await app.showAlert("Error: Dialog element not found");
        return;
    }

    // Set up event listeners
    setupDialogEventListeners(dialog);

    // Show the modal dialog
    try {
        await dialog.showModal();
    } catch (error) {
        console.error("Trapper Plugin: Error showing dialog:", error);
    }
}

/**
 * Set up event listeners for dialog elements
 * Only attaches listeners once to prevent duplicate event handlers
 */
function setupDialogEventListeners(dialog) {
    // Reset dialog state (fix for button staying disabled after previous use)
    resetDialogState();

    // Only attach listeners once to prevent duplicate handlers
    if (listenersAttached) {
        return;
    }

    const printingMode = document.getElementById("printingMode");
    const applyButton = document.getElementById("applyButton");
    const cancelButton = document.getElementById("cancelButton");

    // Mode selector - update default trap size
    printingMode.addEventListener('change', () => {
        const mode = printingMode.value;
        const trapSizeInput = document.getElementById("trapSize");

        if (mode === 'offset') {
            trapSizeInput.value = '1/32';
        } else {
            trapSizeInput.value = '4pt';
        }
    });

    // Apply button
    applyButton.addEventListener('click', async () => {
        await applyTrapping(dialog);
    });

    // Cancel button
    cancelButton.addEventListener('click', () => {
        dialog.close();
    });

    listenersAttached = true;
}

/**
 * Reset dialog state to initial values
 */
function resetDialogState() {
    // Reset buttons to enabled state
    const applyButton = document.getElementById("applyButton");
    const cancelButton = document.getElementById("cancelButton");

    if (applyButton) {
        applyButton.disabled = false;
    }
    if (cancelButton) {
        cancelButton.disabled = false;
    }

    // Hide progress indicator
    const container = document.getElementById("progressContainer");
    const fill = document.getElementById("progressFill");
    const text = document.getElementById("progressText");

    if (container) {
        container.classList.remove('active');
    }
    if (fill) {
        fill.style.width = '0%';
    }
    if (text) {
        text.textContent = 'Processing...';
    }
}

/**
 * Apply trapping with current settings
 */
async function applyTrapping(dialog) {
    const mode = document.getElementById("printingMode").value;
    const trapSize = document.getElementById("trapSize").value;

    // Show progress
    showProgress('Initializing...');


    try {
        // Validate inputs (minTrap is always '0')
        controller.validateTrapSizes('0', trapSize);

        console.log('Starting trapping operation...');

        const document = await controller.psApi.getActiveDocument();
        const outputName = controller.createTrappedDocumentName(document.title);

        // All operations must happen inside executeAsModal (including merge)
        let trappingResult;
        await core.executeAsModal(async (executionContext) => {
            // Suspend history to group all operations into a single history entry
            const suspensionID = await executionContext.hostControl.suspendHistory({
                documentID: document.id,
                name: "Apply Color Trapping"
            });

            try {
                trappingResult = await controller.applyTrapping({
                    sourceDocument: document,
                    outputName: outputName,
                    mode,
                    minTrap: '0',
                    maxTrap: trapSize,
                    onProgress: (progress, message) => {
                        updateProgress(progress, message);
                    }
                });

                console.log('Trapping operation completed successfully. Result:', trappingResult);

                // ONLY resume history on success - commits all changes as a single undo entry
                await executionContext.hostControl.resumeHistory(suspensionID);
                console.log('History resumed - operation committed to undo stack');
            } catch (error) {
                // DON'T resume history on error - this discards all suspended changes
                // The document will be rolled back to the state before suspendHistory was called
                // Nothing will appear in the undo history
                console.error('Operation failed, discarding suspended history (rollback)');
                console.error('Error details:', error.message);
                // Re-throw to show error dialog
                throw error;
            }
        }, {
            commandName: 'Apply Color Trapping'
        });

        console.log('executeAsModal completed.');

        // Success - close the dialog immediately (no confirmation dialog)
        dialog.close();

        console.log('Dialog closed, trapping complete');
    } catch (error) {
        // Show error message
        hideProgress();
        console.error('Trapping error:', error);
        console.error('Error stack:', error.stack);
        const errorMsg = error && error.message ? error.message : String(error);
        await app.showAlert(`Error: ${errorMsg}`);

        // Close dialog if it's a locked layer error (user needs to unlock layers)
        // For other errors, keep dialog open so user can adjust settings and retry
        if (errorMsg.includes('locked layer')) {
            console.log('Locked layer error - closing dialog so user can unlock layers');
            dialog.close();
        }
    }
}

/**
 * Show progress indicator
 */
function showProgress(message) {
    const container = document.getElementById("progressContainer");
    const text = document.getElementById("progressText");
    const applyButton = document.getElementById("applyButton");
    const cancelButton = document.getElementById("cancelButton");

    container.classList.add('active');
    text.textContent = message;
    applyButton.disabled = true;
    cancelButton.disabled = true;
}

/**
 * Update progress indicator
 */
function updateProgress(progress, message) {
    const fill = document.getElementById("progressFill");
    const text = document.getElementById("progressText");
    fill.style.width = `${progress}%`;
    text.textContent = message;
}

/**
 * Hide progress indicator
 */
function hideProgress() {
    const container = document.getElementById("progressContainer");
    const applyButton = document.getElementById("applyButton");
    const cancelButton = document.getElementById("cancelButton");

    container.classList.remove('active');
    applyButton.disabled = false;
    cancelButton.disabled = false;
}

/**
 * Register plugin entrypoints
 */
entrypoints.setup({
    commands: {
        "trapper.showDialog": showTrapperDialog
    }
});

// Initialize plugin when loaded
initialize();

// Export for testing
module.exports = {
    initialize,
    showTrapperDialog
};
