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
 */
function setupDialogEventListeners(dialog) {
    // Remove any existing listeners by cloning elements
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

        // Apply trapping inside executeAsModal
        // Use 'execute' instead of default modal behavior to prevent undo
        await core.executeAsModal(async () => {
            const result = await controller.applyTrapping({
                mode,
                minTrap: '0',
                maxTrap: trapSize,
                onProgress: (progress, message) => {
                    updateProgress(progress, message);
                },
                onHiddenLayers: async (count) => {
                    // Show confirmation dialog for hidden layers
                    const message = `Warning: ${count} hidden layer${count > 1 ? 's' : ''} found in the document.\n\nHidden layers will be ignored and will NOT be included in the color separation.\n\nDo you want to proceed?`;

                    try {
                        const result = await app.showAlert(message, {
                            buttons: ['Proceed', 'Cancel']
                        });

                        // result is the index of the button clicked (0 = Proceed, 1 = Cancel)
                        return result === 0;
                    } catch (error) {
                        console.error('Error showing hidden layers dialog:', error);
                        // If dialog fails, proceed anyway
                        return true;
                    }
                }
            });

            console.log('Trapping operation completed inside modal. Result:', result);
        }, {
            commandName: 'Apply Color Trapping',
            modalBehavior: 'execute'  // Use 'execute' to prevent history suspension
        });

        console.log('executeAsModal completed.');

        // Show success message
        await app.showAlert('Trapping applied successfully!');

        // Close the dialog
        dialog.close();
    } catch (error) {
        // Show error message
        hideProgress();
        console.error('Trapping error:', error);
        console.error('Error stack:', error.stack);
        const errorMsg = error && error.message ? error.message : String(error);
        await app.showAlert(`Error: ${errorMsg}`);
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
