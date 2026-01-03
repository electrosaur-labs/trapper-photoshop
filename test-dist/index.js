console.log("Plugin script started");

try {
    const uxp = require("uxp");
    console.log("UXP loaded:", uxp);

    const { entrypoints } = uxp;
    console.log("Entrypoints:", entrypoints);

    entrypoints.setup({
        panels: {
            "test.panel": {
                show(event) {
                    console.log("Panel show called");
                    const panel = event.node;
                    panel.innerHTML = `
                        <style>
                            body { padding: 20px; font-family: sans-serif; }
                            h1 { color: #1473e6; }
                        </style>
                        <h1>Test Plugin Loaded!</h1>
                        <p>If you see this, the plugin is working.</p>
                    `;
                }
            }
        }
    });

    console.log("Test plugin setup complete");
} catch (error) {
    console.error("Plugin error:", error);
    console.error("Error stack:", error.stack);
}
