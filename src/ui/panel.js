/**
 * UI Panel for Trapper Plugin
 * Creates and manages the plugin's user interface
 */

// Import required modules at the top
const { clipboard } = require('uxp');
const { app, core } = require('photoshop');

/**
 * Create the main UI panel
 * @param {HTMLElement} panel - The panel element
 * @param {TrapperController} controller - The controller instance
 */
function createUI(panel, controller) {
    // Clear any existing content
    panel.innerHTML = '';

    // Create the main container
    const container = document.createElement('div');
    container.className = 'trapper-panel';
    container.innerHTML = `
        <style>
            .trapper-panel {
                padding: 16px;
                font-family: 'Adobe Clean', sans-serif;
                font-size: 14px;
                color: #323232;
            }

            .trapper-header {
                margin-bottom: 20px;
                padding-bottom: 12px;
                border-bottom: 1px solid #e1e1e1;
            }

            .trapper-header h1 {
                font-size: 18px;
                margin: 0 0 4px 0;
                font-weight: 600;
            }

            .trapper-header p {
                font-size: 12px;
                color: #6e6e6e;
                margin: 0;
            }

            .trapper-section {
                margin-bottom: 20px;
            }

            .trapper-section-title {
                font-size: 13px;
                font-weight: 600;
                margin-bottom: 8px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: #6e6e6e;
            }

            .trapper-field {
                margin-bottom: 12px;
            }

            .trapper-field label {
                display: block;
                margin-bottom: 4px;
                font-size: 13px;
                color: #323232;
            }

            .trapper-field input,
            .trapper-field select {
                width: 100%;
                padding: 6px 8px;
                border: 1px solid #c4c4c4;
                border-radius: 4px;
                font-size: 13px;
                background: white;
            }

            .trapper-field input:focus,
            .trapper-field select:focus {
                outline: none;
                border-color: #1473e6;
                box-shadow: 0 0 0 1px #1473e6;
            }

            .trapper-field-group {
                display: flex;
                gap: 12px;
            }

            .trapper-field-group .trapper-field {
                flex: 1;
            }

            .trapper-button {
                width: 100%;
                padding: 10px;
                background: #1473e6;
                color: white;
                border: none;
                border-radius: 4px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: background 0.2s;
            }

            .trapper-button:hover:not(:disabled) {
                background: #0d66d0;
            }

            .trapper-button:disabled {
                background: #c4c4c4;
                cursor: not-allowed;
            }

            .trapper-button.secondary {
                background: #f4f4f4;
                color: #323232;
                border: 1px solid #c4c4c4;
            }

            .trapper-button.secondary:hover:not(:disabled) {
                background: #e8e8e8;
            }

            .trapper-info {
                padding: 12px;
                background: #f5f5f5;
                border-radius: 4px;
                font-size: 12px;
                line-height: 1.4;
                color: #6e6e6e;
            }

            .trapper-info.warning {
                background: #fff3cd;
                color: #856404;
                border: 1px solid #ffeeba;
            }

            .trapper-info.error {
                background: #f8d7da;
                color: #721c24;
                border: 1px solid #f5c6cb;
            }

            .trapper-info.success {
                background: #d4edda;
                color: #155724;
                border: 1px solid #c3e6cb;
            }

            .trapper-status-container {
                margin-top: 16px;
            }

            .trapper-status-textarea {
                width: 100%;
                min-height: 80px;
                padding: 12px;
                padding-right: 70px;
                border: 1px solid #c4c4c4;
                border-radius: 4px;
                font-family: 'Adobe Clean', sans-serif;
                font-size: 12px;
                line-height: 1.4;
                resize: vertical;
                background: #f5f5f5;
                color: #6e6e6e;
                box-sizing: border-box;
                user-select: text !important;
                -webkit-user-select: text !important;
            }

            .trapper-status-textarea.warning {
                background: #fff3cd;
                color: #856404;
                border: 1px solid #ffeeba;
            }

            .trapper-status-textarea.error {
                background: #f8d7da;
                color: #721c24;
                border: 1px solid #f5c6cb;
            }

            .trapper-status-textarea.success {
                background: #d4edda;
                color: #155724;
                border: 1px solid #c3e6cb;
            }

            .trapper-copy-button {
                margin-top: 8px;
                padding: 6px 12px;
                background: #1473e6;
                color: white;
                border: none;
                border-radius: 4px;
                font-size: 12px;
                cursor: pointer;
                width: 100%;
            }

            .trapper-copy-button:hover {
                background: #0d66d0;
            }

            .trapper-progress {
                margin-top: 16px;
                display: none;
            }

            .trapper-progress.active {
                display: block;
            }

            .trapper-progress-bar {
                height: 4px;
                background: #e1e1e1;
                border-radius: 2px;
                overflow: hidden;
            }

            .trapper-progress-fill {
                height: 100%;
                background: #1473e6;
                width: 0;
                transition: width 0.3s;
            }

            .trapper-progress-text {
                margin-top: 4px;
                font-size: 11px;
                color: #6e6e6e;
            }
        </style>

        <div class="trapper-header">
            <h1>Color Trapping</h1>
            <p>Apply precise trapping for print production</p>
        </div>

        <div id="documentStatus" class="trapper-info warning" style="display: none;">
            No document open. Please open a document to apply trapping.
        </div>

        <div class="trapper-section">
            <div class="trapper-section-title">Printing Mode</div>
            <div class="trapper-field">
                <select id="printingMode">
                    <option value="offset">Offset Lithography</option>
                    <option value="screen" selected>Screen Printing</option>
                </select>
            </div>
        </div>

        <div class="trapper-section">
            <div class="trapper-section-title">Trap Size</div>
            <div class="trapper-field">
                <label for="trapSize">Maximum Trap (lightest layer)</label>
                <input type="text" id="trapSize" value="4pt" placeholder="e.g., 1/32, 4pt" />
            </div>
            <div class="trapper-info">
                <strong>Offset:</strong> Use fractional inches (1/32, 1/64)<br>
                <strong>Screen:</strong> Use points (2pt, 4pt, 6pt)<br>
                Trap decreases linearly from lightest to darkest layer (0 trap).
            </div>
        </div>

        <div class="trapper-section">
            <button id="applyButton" class="trapper-button">
                Apply Trapping
            </button>
            <button id="previewButton" class="trapper-button secondary" style="margin-top: 8px;">
                Preview Trap Areas
            </button>
        </div>

        <div id="progressContainer" class="trapper-progress">
            <div class="trapper-progress-bar">
                <div id="progressFill" class="trapper-progress-fill"></div>
            </div>
            <div id="progressText" class="trapper-progress-text">Processing...</div>
        </div>

        <div id="statusContainer" class="trapper-status-container" style="display: none;">
            <textarea id="statusMessage" class="trapper-status-textarea" readonly></textarea>
            <button id="copyStatusButton" class="trapper-copy-button">Copy Error to Clipboard</button>
        </div>
    `;

    panel.appendChild(container);

    // Set up event listeners
    setupEventListeners(panel, controller);

    // Update mode-specific defaults
    updateModeDefaults(panel);
}

/**
 * Set up event listeners for UI elements
 * @param {HTMLElement} panel - The panel element
 * @param {TrapperController} controller - The controller instance
 */
function setupEventListeners(panel, controller) {
    // Mode selector
    const modeSelector = panel.querySelector('#printingMode');
    modeSelector.addEventListener('change', () => {
        updateModeDefaults(panel);
    });

    // Apply button
    const applyButton = panel.querySelector('#applyButton');
    applyButton.addEventListener('click', async (event) => {
        await core.executeAsModal(async () => {
            await applyTrapping(panel, controller);
        }, { commandName: 'Apply Color Trapping' });
    });

    // Preview button
    const previewButton = panel.querySelector('#previewButton');
    previewButton.addEventListener('click', async () => {
        await previewTrapping(panel, controller);
    });

    // Copy status button
    const copyButton = panel.querySelector('#copyStatusButton');
    copyButton.addEventListener('click', async () => {
        const statusTextarea = panel.querySelector('#statusMessage');
        try {
            await clipboard.writeText(statusTextarea.value);
            copyButton.textContent = 'Copied!';
            setTimeout(() => {
                copyButton.textContent = 'Copy Error to Clipboard';
            }, 2000);
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            // Fallback: select the text so user can manually copy
            statusTextarea.select();
        }
    });
}

/**
 * Update UI defaults based on selected mode
 * @param {HTMLElement} panel - The panel element
 */
function updateModeDefaults(panel) {
    const mode = panel.querySelector('#printingMode').value;
    const trapSizeInput = panel.querySelector('#trapSize');

    if (mode === 'offset') {
        trapSizeInput.value = '1/32';
    } else {
        trapSizeInput.value = '4pt';
    }
}

/**
 * Apply trapping with current settings
 * @param {HTMLElement} panel - The panel element
 * @param {TrapperController} controller - The controller instance
 */
async function applyTrapping(panel, controller) {
    const mode = panel.querySelector('#printingMode').value;
    const trapSize = panel.querySelector('#trapSize').value;

    // Show progress
    showProgress(panel, 'Initializing...');

    try {
        // Validate inputs (minTrap is always '0')
        controller.validateTrapSizes('0', trapSize);

        // Apply trapping
        await controller.applyTrapping({
            mode,
            minTrap: '0',
            maxTrap: trapSize,
            onProgress: (progress, message) => {
                updateProgress(panel, progress, message);
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

        // Show success message
        showStatus(panel, 'Trapping applied successfully!', 'success');
        hideProgress(panel);
    } catch (error) {
        // Show error message
        showStatus(panel, `Error: ${error.message}`, 'error');
        hideProgress(panel);
    }
}

/**
 * Preview trapping areas
 * @param {HTMLElement} panel - The panel element
 * @param {TrapperController} controller - The controller instance
 */
async function previewTrapping(panel, controller) {
    showStatus(panel, 'Preview feature coming soon!', 'info');
}

/**
 * Show progress indicator
 * @param {HTMLElement} panel - The panel element
 * @param {string} message - Progress message
 */
function showProgress(panel, message) {
    const container = panel.querySelector('#progressContainer');
    const text = panel.querySelector('#progressText');
    container.classList.add('active');
    text.textContent = message;
}

/**
 * Update progress indicator
 * @param {HTMLElement} panel - The panel element
 * @param {number} progress - Progress percentage (0-100)
 * @param {string} message - Progress message
 */
function updateProgress(panel, progress, message) {
    const fill = panel.querySelector('#progressFill');
    const text = panel.querySelector('#progressText');
    fill.style.width = `${progress}%`;
    text.textContent = message;
}

/**
 * Hide progress indicator
 * @param {HTMLElement} panel - The panel element
 */
function hideProgress(panel) {
    const container = panel.querySelector('#progressContainer');
    container.classList.remove('active');
}

/**
 * Show status message
 * @param {HTMLElement} panel - The panel element
 * @param {string} message - Status message
 * @param {string} type - Message type (info, success, warning, error)
 */
function showStatus(panel, message, type = 'info') {
    const statusContainer = panel.querySelector('#statusContainer');
    const statusTextarea = panel.querySelector('#statusMessage');

    statusTextarea.value = message;
    statusTextarea.className = `trapper-status-textarea ${type}`;
    statusContainer.style.display = 'block';

    // Auto-resize textarea to fit content
    statusTextarea.style.height = 'auto';
    statusTextarea.style.height = statusTextarea.scrollHeight + 'px';

    // Auto-hide after 5 seconds for non-error messages
    if (type !== 'error') {
        setTimeout(() => {
            statusContainer.style.display = 'none';
        }, 5000);
    }
}

/**
 * Update UI based on application state
 * @param {HTMLElement} panel - The panel element
 * @param {Object} state - Application state
 */
function updateUI(panel, state) {
    console.log('updateUI called with state:', JSON.stringify(state));

    if (!panel) {
        console.log('updateUI: No panel element');
        return;
    }

    const docStatus = panel.querySelector('#documentStatus');
    const applyButton = panel.querySelector('#applyButton');
    const previewButton = panel.querySelector('#previewButton');

    console.log('updateUI: Found elements:', {
        docStatus: !!docStatus,
        applyButton: !!applyButton,
        previewButton: !!previewButton
    });

    if (!docStatus || !applyButton || !previewButton) {
        console.error('updateUI: Could not find required UI elements');
        return;
    }

    if (!state.hasDocument) {
        console.log('updateUI: No document');
        docStatus.textContent = 'No document open. Please open a document to apply trapping.';
        docStatus.className = 'trapper-info warning';
        docStatus.style.display = 'block';
        applyButton.disabled = true;
        previewButton.disabled = true;
    } else if (state.documentMode && state.documentMode !== 'RGB') {
        // Document is open but not in RGB mode
        console.log('updateUI: Wrong mode:', state.documentMode);
        docStatus.textContent = `Document is in ${state.documentMode} mode. Please convert to RGB mode (Image > Mode > RGB Color) to use trapping.`;
        docStatus.className = 'trapper-info error';
        docStatus.style.display = 'block';
        applyButton.disabled = true;
        previewButton.disabled = true;
    } else if (state.invalidReason) {
        // Document has other validation issues
        console.log('updateUI: Invalid reason:', state.invalidReason);
        docStatus.textContent = state.invalidReason;
        docStatus.className = 'trapper-info error';
        docStatus.style.display = 'block';
        applyButton.disabled = true;
        previewButton.disabled = true;
    } else {
        // Document is valid
        console.log('updateUI: Document is valid, enabling UI');
        docStatus.style.display = 'none';
        applyButton.disabled = false;
        previewButton.disabled = false;
    }
}

// Export functions
module.exports = {
    createUI,
    updateUI,
    showStatus,
    showProgress,
    updateProgress,
    hideProgress
};