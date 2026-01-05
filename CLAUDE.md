# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the Trapper Photoshop plugin.

## Project Overview

The Trapper Photoshop plugin is a UXP (Unified Extensibility Platform) plugin that brings color trapping functionality directly into Adobe Photoshop. It ports the trapping algorithms from the Trapper Java application into a native Photoshop plugin, allowing users to apply color trapping without exporting to external tools.

**Key concept:** Lighter colors expand under darker colors to create overlap. This prevents white gaps from misregistration in multi-color printing.

---

**⚠️ Note:** The following sections on trapping theory are **duplicated from the Trapper Java application** for convenience. The Java application (`trapper/`) is the authoritative reference implementation. See `../trapper/CLAUDE.md` for the complete Java-specific documentation.

---

## Color Trapping Theory

In multi-color printing, each color prints from a separate plate (offset lithography) or screen (screen printing). Slight misalignment between plates creates visible white gaps where colors should meet. Trapping compensates by expanding lighter colors under darker colors to create overlap.

**Key principle:** Lighter colors expand under darker colors to create overlap (universal across all printing modes)

**Why this works:**
- Darker colors hide the trap (overlap is not visible)
- Prevents white gaps from misregistration
- Maintains visual appearance of edges (darker color defines the edge)

### Printing Modes

1. **Offset Lithography**
   - High-precision commercial printing
   - Typical trap range: 0 to 1/32" (0.03125")
   - Typical DPI: 300
   - Use cases: Magazines, packaging, commercial printing

2. **Screen Printing**
   - Garment printing, posters, textiles
   - Typical trap range: 0 to 4-6 points (0.056-0.083")
   - Typical DPI: 300-600
   - Use cases: T-shirts, posters, signage

**Note:** Both modes use identical trap calculation. The difference is only in terminology and typical trap sizes. The physics of trapping is universal.

### Trap Size Formats

All trap sizes can be specified in multiple formats:
- **Fractions:** `1/32`, `1/64`, `1/16` (inches)
- **Decimals:** `0.03125`, `0.015625` (inches)
- **Points:** `2pt`, `4pt`, `6pt` (72 points = 1 inch)

### Trap Calculation

- **White base layer:** 0 pixels (optimization - white doesn't trap)
- **Lightest non-white layer:** Maximum trap size
- **Darkest layer:** Minimum trap size (currently fixed at 0) - Defines sharp edges. The darkest layer has no darker color above it to hide trap under, so expansion would make edges appear blurry.
- **Middle layers:** Linear interpolation
- **Formula:**
  ```
  normalizedPosition = (layerIndex - whiteLayerCount) / (nonWhiteLayerCount - 1)
  trapSize = minTrap + (maxTrap - minTrap) * (1.0 - normalizedPosition)
  pixels = trapSize * DPI
  ```

### Morphological Dilation Algorithm

Both implementations use iterative 4-connected neighbor expansion:
1. For each layer, create mask of areas covered by darker colors
2. Iteratively expand layer pixels into masked areas
3. Use 4-connected neighbors (top, right, bottom, left)
4. Stop when expansion count reached or no more pixels to expand

---

## Build and Test Commands

```bash
# Install dependencies
npm install

# Development build with watch mode
npm run dev

# Production build
npm run build
# Output: dist/ directory

# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm test -- --watch

# Clean build directory
npm run clean

# Package for distribution (creates .ccx file)
npm run package
```

## Packaging for Distribution

### Creating .ccx Files

A `.ccx` file is a ZIP archive of the plugin files that can be installed in Photoshop.

**Correct packaging method:**
```bash
npm run build    # Build to dist/
npm run package  # Create trapper-v{version}.ccx
```

This runs `scripts/package.js` which:
1. Reads version from `package.json`
2. Creates ZIP archive from `dist/` directory
3. Outputs `trapper-v{version}.ccx`

### Critical Manifest Requirements

**The manifest.json MUST have these properties for Photoshop 2024+ to recognize the plugin:**

1. **`host` as object (not array)** when supporting single host:
   ```json
   "host": {
     "app": "PS",
     "minVersion": "23.3.0",
     "data": {
       "apiVersion": 2
     }
   }
   ```

2. **Icons array** (required for plugin registration):
   ```json
   "icons": [
     {
       "width": 24,
       "height": 24,
       "path": "icons/icon_light.png",
       "scale": [1, 2],
       "theme": ["lightest", "light"],
       "species": ["generic"]
     },
     {
       "width": 24,
       "height": 24,
       "path": "icons/icon_dark.png",
       "scale": [1, 2],
       "theme": ["darkest", "dark"],
       "species": ["generic"]
     }
   ]
   ```

3. **Required permissions:**
   ```json
   "requiredPermissions": {
     "localFileSystem": "plugin",
     "network": {
       "domains": "all"
     },
     "clipboard": "readAndWrite"
   }
   ```

4. **Icon files must exist:**
   - `src/icons/icon_light.png` (24×24 PNG)
   - `src/icons/icon_dark.png` (24×24 PNG)

### Common Packaging Errors

**Error: "Couldn't install plugin" on Mac**
- **Cause:** Creative Cloud on Mac often misidentifies .ccx files when double-clicked
- **Solution:** Use manual installation or automated script (see `install-mac.sh`)

**Error: Plugin doesn't appear in Photoshop**
- **Cause 1:** Icons missing or manifest format incorrect
- **Cause 2:** Looking in wrong place - command-type plugins appear in **Plugins** menu, not Window > Extensions
- **Solution:** Ensure manifest has icons array with `species: ["generic"]` and `host` is object not array

**Error: Plugin appears in UXP Developer Tool but not after packaging**
- **Cause:** UXP Dev Tool is more forgiving than production install
- **Solution:** Compare your .ccx with one created by UXP Dev Tool (load plugin in Dev Tool, use "Package" button)

### Verifying Package Contents

Check what's in the .ccx:
```bash
unzip -l trapper-v1.0.0.ccx
```

Should contain:
- `manifest.json` (with correct format)
- `index.html`
- `index.js`
- `icons/icon_dark.png`
- `icons/icon_light.png`
- `icon-48.png` (optional, for marketplace)

### Mac Installation

On Mac, Creative Cloud often fails to install .ccx files correctly. Provide users with `install-mac.sh`:

```bash
#!/bin/bash
# Extracts .ccx and copies to Photoshop Plug-ins directory
# Handles sudo for system-wide Photoshop installations
# Supports multiple Photoshop versions
```

See `install-mac.sh` for full implementation.

### Testing Packaged Plugin

1. **Install via UXP Developer Tool first** - verifies plugin works
2. **Create .ccx package** - `npm run package`
3. **Install .ccx** - Test actual installation process
4. **Verify location:**
   - **Command plugins:** Plugins menu → Color Trapping...
   - **Panel plugins:** Window > Extensions
5. **Test in fresh Photoshop session**

## Plugin Architecture

### Entry Point and Dialog Management

**File:** `src/index.js`
- Initializes plugin and registers entrypoints
- Shows modal dialog for user interaction
- Validates document before processing
- Handles errors and user feedback

### Core Architecture

```
src/
├── index.js                      # Plugin entry point & dialog management
├── index.html                    # Modal dialog UI
├── core/
│   ├── TrapperController.js      # Main controller (coordinates workflow)
│   └── TrappingEngine.js         # Core algorithms (color analysis, dilation)
├── api/
│   └── PhotoshopAPI.js           # Photoshop API wrapper
└── utils/
    └── TrapSizeParser.js         # Trap size parsing & conversion
```

### Processing Workflow

1. **Pre-flight validation** (RGB mode, 8-bit, exactly 1 unlocked layer required)
2. **Read pixels from single layer** using `imaging.getPixels()`
3. **Analyze colors** (extract unique RGB colors from pixel data)
4. **Sort colors by lightness** (lightest to darkest)
5. **Create layers** in sorted order (lightest first → stacks correctly)
6. **Extract pixels per color** using manual pixel filtering
7. **Apply trapping** to each layer (lighter layers get more trap)
8. **Update layer names** with trap sizes
9. **Delete source layer**

### Key Design Decisions

See `DECISIONS.md` for detailed rationale. Key points:

1. **Manual Pixel Extraction:** Use `imaging.getPixels()` and manual filtering instead of selection API (`selectColorRange`, `layerViaCopy`) because selection commands fail silently inside `executeAsModal`.

2. **Layer Creation Order:** Create layers in sorted order (lightest to darkest) from the start, exploiting Photoshop's natural stacking (newest on top). Reordering doesn't work in `executeAsModal`.

3. **Full Document Coordinates:** Work with full document-sized pixel data throughout the pipeline (not cropped layer bounds) to avoid coordinate system mismatches.

4. **Modal Behavior 'execute':** Use `modalBehavior: 'execute'` instead of default to avoid history suspension and provide proper undo/redo support.

5. **Darker Color Mask:** Create mask by combining pixel data from all darker layers (higher indices) to prevent lighter colors from overlapping darker colors during dilation.

6. **Alpha Channel Masking:** Check `mask.data[idx + 3]` (alpha) to determine if mask blocks expansion (transparent = allow, opaque = blocked).

7. **Pre-Flight Validation:** Require exactly 1 unlocked layer before opening dialog. User prepares document using Photoshop's native tools (Layer > Flatten Image, etc.). This eliminates all complexity around automated flattening, smart object rasterization, and hidden layer handling.

### Photoshop API Usage

**Reading Pixels:**
```javascript
// imaging.getPixels() returns pixels directly or via imageData.getData()
const pixelData = await imaging.getPixels({ documentID, layerID });
const rgbaData = pixelData.pixels || await pixelData.imageData.getData({ chunky: true });
```

**Writing Pixels:**
```javascript
// Create ImageData from buffer, then putPixels
const psImageData = await imaging.createImageDataFromBuffer(pixelArray, {
    width, height, components: 4, colorSpace: "RGB"
});
await imaging.putPixels({ layerID, imageData: psImageData, replace: true });
```

**Creating Layers:**
```javascript
// Uses batchPlay with 'make' command
await action.batchPlay([
    { _obj: 'make', _target: [{ _ref: 'layer' }], name: layerName }
], options);
```

## Loading Plugin in Photoshop

1. Install **UXP Developer Tool** from Creative Cloud
2. Open UXP Developer Tool
3. Click "Add Plugin"
4. Select `manifest.json` (or `dist/manifest.json` after build)
5. Click "Load" to load into Photoshop
6. Use "Watch" for automatic reloading during development
7. Find plugin in Photoshop: **Window > Extensions > Trapper**

## Testing Strategy

- **Unit tests:** TrapSizeParser utility (fractions, decimals, points, error cases) using Jest
- **Integration tests:** Not yet implemented (requires Photoshop automation)
- **Manual testing:** Load plugin in Photoshop and test with real documents

**Test requirements:**
- Document must be in RGB color mode (CMYK/Lab/Grayscale not supported)
- Maximum 10 distinct colors per document
- 8-bit per channel only

## Limitations and Constraints

- **RGB mode only** (no CMYK, Lab, Grayscale, Indexed)
- **Maximum 10 distinct colors** per document - This limit accommodates complex screen printing designs (typical max: 7-10 colors) and packaging work, while most commercial spot color printing uses 4-6 colors or fewer. Could be made configurable if needed.
- **8-bit per channel** only (no 16/32-bit)

### Document Preparation Requirements

**Users must flatten their document to a single unlocked layer before using the plugin.** This means:

- **Layer effects, adjustment layers, smart objects, blend modes, and masks** must be flattened using Photoshop's **Layer > Flatten Image** command
- The flattened result must meet the requirements: RGB mode, 8-bit, exactly 1 unlocked layer, ≤10 distinct colors
- Plugin does not perform any automated flattening - user is responsible for document preparation

This approach ensures predictable results and puts document preparation control in the user's hands, using Photoshop's native tools they already understand.

### Why RGB Mode Only (No CMYK Support)

**This plugin targets spot color printing workflows**, not process color (CMYK) printing.

**RGB approach (current implementation):**
- Each distinct RGB color represents a separate printing plate/screen
- Trapping operates at the color level (entire color objects)
- Simpler model: lighter colors spread under darker colors based on overall lightness
- Ideal for: spot color printing, screen printing, simple offset jobs

**CMYK approach (not implemented):**
- CMYK trapping operates at the **channel level**, not color level
- Each channel (C, M, Y, K) represents a physical printing plate
- Trapping only applies to channels that differ between adjacent colors
- **Common ink optimization**: Colors sharing ink channels get natural registration
- Requires per-pixel CMYK comparison with neighbors and selective per-channel trapping
- Much more complex algorithm

**Conclusion:** CMYK process color printing requires professional prepress software (Adobe InDesign, Esko DeskPack) with sophisticated CMYK trapping engines. This plugin's RGB approach is optimal for spot color work where each color is a discrete printing element.

## Technology Stack

- **UXP (Unified Extensibility Platform)** - Photoshop 2024+ plugin framework
- **Manifest v5** - Command-based entrypoints with `executeAsModal`
- **Imaging API** - `imaging.getPixels()` and `imaging.putPixels()` for pixel manipulation
- **BatchPlay API** - Action descriptor API for Photoshop operations (flattening, layer creation)
- **Webpack** - Module bundler for production builds
- **Jest** - Unit testing framework
- **Babel** - ES6 transpilation

## Dependencies

- **Adobe Photoshop 2024** (v24.0.0) or later
- **Node.js 14+** (for building)
- **Webpack 5** (bundling)
- **Jest 29** (testing)
- **Babel** (ES6 transpilation)

## Development Patterns

### Adding a New Trapping Mode

1. Add mode to `TrappingEngine.getTrappingStrategy()` method
2. Update UI in `src/index.html` (add radio button or dropdown option)
3. Update `src/index.js` to handle new mode selection
4. Adjust default trap sizes in mode selector

### Modifying Dilation Algorithm

**File:** `src/core/TrappingEngine.js`
**Method:** `applyDilationWithMask()`

To change to 8-connected neighbors, modify neighbor offsets to include diagonals:
```javascript
const neighbors = [
    [-1, -1], [0, -1], [1, -1],  // Top row
    [-1,  0],          [1,  0],  // Middle row
    [-1,  1], [0,  1], [1,  1]   // Bottom row
];
```

### Working with Photoshop API

**Reading pixels:**
- Use `PhotoshopAPI.getLayerPixels(layer)` wrapper
- Returns `{width, height, data}` in RGBA format

**Writing pixels:**
- Use `PhotoshopAPI.setLayerPixels(layer, imageData)` wrapper
- Handles ImageData creation and disposal

**Document operations:**
- Layer creation: `PhotoshopAPI.createLayer(document, name)`
- Layer deletion: `PhotoshopAPI.deleteLayer(layer)`

## Error Handling Philosophy

**Fail fast with clear error messages** rather than attempting recovery. Print production errors are expensive - better to stop than produce incorrect output.

Common error scenarios:
- **Invalid trap size:** Show expected formats (fractions, decimals, points)
- **Wrong color mode:** Instruct user to convert to RGB (Image > Mode > RGB Color)
- **Too many colors:** Report limit and suggest color reduction
- **No active document:** Prompt user to open a document first
- **Photoshop API errors:** Report specific operation that failed

## Known Issues

### Display Refresh Issue

**Issue:** After `executeAsModal` completes and success alert is shown, Photoshop displays only 1 layer instead of all color-separated layers. Switching to another document and back reveals all layers correctly.

**Root Cause:** Unknown Photoshop UI refresh bug. Document state is correct in memory, but display is not updated.

**Workaround:** Users can manually switch documents to refresh the display.

**Current Status:** Deferred. Core functionality (separation, ordering, trapping) works correctly.

## Future Considerations

1. **Performance Optimization** - For large documents or many colors, consider Web Workers or incremental processing with progress updates
2. **Configurable Color Limit** - Allow users to set maximum color count (currently hardcoded at 10)
3. **Color Tolerance** - Allow slight color variation matching instead of exact RGB match (for documents with anti-aliasing)
4. **Preview Mode** - Show trap overlay before committing (requires rendering trap preview)
5. **Batch Processing** - Process multiple documents with same settings
6. **16-bit Support** - Investigate if imaging API supports 16-bit depth processing
7. **Indexed Color Support** - Convert to RGB temporarily, apply trapping, optionally convert back

## Documentation Files

- `CLAUDE.md` (this file) - Claude Code guidance for plugin development
- `README.md` - User documentation and installation instructions
- `DECISIONS.md` - Architectural decisions and rationale
- `../trapper/CLAUDE.md` - Java application guidance (reference implementation)
