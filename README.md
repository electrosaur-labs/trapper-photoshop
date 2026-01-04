# Trapper for Photoshop

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Adobe Photoshop](https://img.shields.io/badge/Adobe%20Photoshop-2024+-31A8FF?logo=adobe-photoshop)](https://www.adobe.com/products/photoshop.html)
[![UXP](https://img.shields.io/badge/UXP-5.0-FF61F6)](https://developer.adobe.com/photoshop/uxp/)

A professional UXP plugin for Adobe Photoshop that provides automated color trapping for print production. Supports both offset lithography and screen printing workflows.

> **Note:** This is a follow-on port of the [Trapper Java application](https://github.com/electrosaur-labs/trapper), bringing the same color trapping algorithms directly into Photoshop as a native plugin.

## Features

- 🎨 **Automatic Color Separation** - Analyzes and separates up to 10 distinct colors
- 📏 **Precise Trap Sizing** - Supports fractional inches (1/32"), decimals, and points
- 🖨️ **Dual Mode Support** - Optimized for both offset and screen printing
- ⚡ **High Performance** - Morphological dilation algorithm with iterative processing
- 🎯 **Smart Trapping** - Light colors expand under dark colors automatically
- 💾 **Non-Destructive** - Preserves original layers while creating trapped versions

## Requirements

- Adobe Photoshop 2024 (v24.0.0) or later
- **Document must be in RGB color mode** (required)
- UXP Developer Tool (for development)
- Node.js 14+ and npm (for building)

## Installation

### For Users (Windows)

1. Download the latest `.ccx` file from [releases](https://github.com/electrosaur-labs/trapper-photoshop/releases/latest)
2. Double-click to install via Creative Cloud
3. Restart Photoshop
4. Find "Trapper" at **Window > Extensions > Trapper**

### For Users (Mac)

**⚠️ Note:** Double-clicking .ccx files on Mac may not work reliably.

**Recommended:** Download both the `.ccx` file and `install-mac.sh` script from [releases](https://github.com/electrosaur-labs/trapper-photoshop/releases/latest), then:

```bash
cd ~/Downloads
chmod +x install-mac.sh
./install-mac.sh
```

See the [release notes](https://github.com/electrosaur-labs/trapper-photoshop/releases/latest) for alternative installation methods.

### For Developers

```bash
# Clone the repository
git clone https://github.com/electrosaur-labs/trapper-photoshop.git
cd trapper-photoshop

# Install dependencies
npm install

# Build the plugin
npm run build

# For development with watch mode
npm run dev
```

## Usage

### Basic Workflow

1. **Open a document** in Photoshop (**must be in RGB mode**, 8-bit)
2. **Open the Trapper panel** from Window > Extensions > Trapper
3. **Select printing mode**:
   - **Offset Lithography**: Commercial printing (default trap: 1/32")
   - **Screen Printing**: Garment/poster printing (default trap: 4pt)
4. **Set maximum trap size** for lightest layer (e.g., 1/32" or 4pt)
   - Darkest layer always gets 0 trap (defines edges)
   - Middle layers get linearly interpolated trap amounts
5. **Click "Apply Trapping"** to process

### Trap Size Formats

The plugin accepts trap sizes in multiple formats:

- **Fractions**: `1/32`, `1/64`, `1/16` (inches)
- **Decimals**: `0.03125`, `0.015625` (inches)
- **Points**: `2pt`, `4pt`, `6pt` (72 points = 1 inch)

## How It Works

1. **Color Analysis**: Analyzes the document to identify distinct colors
2. **Lightness Sorting**: Orders colors from lightest to darkest
3. **Trap Calculation**: Lightest layer gets maximum trap, darkest gets 0, middle layers linearly interpolated
4. **Layer Separation**: Creates individual layers for each color
5. **Dilation Application**: Expands lighter colors into areas covered by darker colors
6. **Output Generation**: Creates properly trapped layers in your document

## API Reference

### TrapperController

Main controller coordinating the trapping process:

```javascript
const controller = new TrapperController();

await controller.applyTrapping({
    mode: 'offset',           // or 'screen'
    maxTrap: '1/32',         // maximum trap size (lightest layer)
                             // darkest layer always gets 0 trap
    onProgress: (percent, message) => {
        console.log(`${percent}%: ${message}`);
    }
});
```

### TrapSizeParser

Utility for parsing and converting trap sizes:

```javascript
// Parse various formats
const inches = TrapSizeParser.parse('1/32');    // 0.03125
const inches2 = TrapSizeParser.parse('4pt');     // 0.0556
const inches3 = TrapSizeParser.parse('0.03125'); // 0.03125

// Convert to pixels
const pixels = TrapSizeParser.inchesToPixels(inches, 300); // DPI

// Calculate trap for specific layer (minTrap is always 0)
const trap = TrapSizeParser.calculateLayerTrap(
    layerIndex,    // 0 = lightest
    totalLayers,   // total number of colors
    0,             // minimum trap (always 0 - darkest layer)
    maxTrap        // maximum trap (inches - lightest layer)
);
```

### TrappingEngine

Core trapping algorithms:

```javascript
const engine = new TrappingEngine({
    minTrap: 0,              // always 0 (darkest layer defines edges)
    maxTrap: 0.03125,        // maximum trap in inches (lightest layer)
    dpi: 300,
    mode: 'offset'
});

// Analyze colors
const analysis = engine.analyzeColors(imageData);

// Sort by lightness
const sorted = engine.sortColorsByLightness(analysis.colors);

// Apply dilation
const trapped = engine.applyDilationWithMask(
    layerData,
    trapPixels,
    mask
);
```

## Development

### Project Structure

```
trapper-photoshop/
├── src/
│   ├── index.js              # Plugin entry point
│   ├── index.html            # Modal dialog UI
│   ├── core/
│   │   ├── TrapperController.js  # Main controller
│   │   └── TrappingEngine.js     # Core algorithms
│   ├── api/
│   │   └── PhotoshopAPI.js   # Photoshop API wrapper
│   └── utils/
│       └── TrapSizeParser.js # Trap size utilities
├── test/
│   └── TrapSizeParser.test.js # Unit tests
├── manifest.json             # UXP manifest
├── webpack.config.js         # Build configuration
└── package.json              # Dependencies
```

### Building

```bash
# Development build
npm run dev

# Production build
npm run build

# Run tests
npm test

# Clean build directory
npm run clean
```

### Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

### Loading in Photoshop

1. Install UXP Developer Tool from Creative Cloud
2. Open UXP Developer Tool
3. Click "Add Plugin"
4. Select the `manifest.json` file
5. Click "Load" to load into Photoshop
6. Use "Watch" for automatic reloading during development

## Troubleshooting

### Common Issues

**"No active document" error**
- Ensure you have a document open in Photoshop
- Document must be 8-bit per channel

**"Document must be in RGB color mode" error**
- The plugin only works with RGB documents
- Convert your document: Image > Mode > RGB Color
- Note: CMYK, Lab, and other modes are not supported

**"Too many colors" error**
- The plugin supports up to 10 distinct colors
- Reduce colors using Image > Mode > Indexed Color first

**Trap sizes seem incorrect**
- Check document DPI (higher DPI = more pixels per trap)
- Verify trap size format (fractions need "/", points need "pt")

**Plugin doesn't appear in Photoshop**
- Ensure Photoshop version is 24.0.0 or later
- Try restarting Photoshop
- Check UXP Developer Tool for errors

## Performance

- Small documents (< 2000px): < 5 seconds
- Medium documents (2000-5000px): 10-30 seconds
- Large documents (> 5000px): 1-3 minutes

Performance depends on:
- Number of distinct colors
- Document dimensions
- Trap size (larger traps take longer)
- System specifications

## Limitations

- **RGB mode only** (no CMYK, Lab, Grayscale support)
- Maximum 10 distinct colors per document
- 8-bit per channel only (no 16/32-bit)
- Requires manual color reduction for complex images

## Related Projects

- **[Trapper (Java)](https://github.com/electrosaur-labs/trapper)** - Original standalone desktop application for PSD color trapping

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

Quick start:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add/update tests
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## License

GPL-3.0 License - See LICENSE file for details

## Credits

- Based on the [Trapper Java application](https://github.com/electrosaur-labs/trapper) algorithms
- Uses Adobe UXP technology
- Built by the Electrosaur Labs team

## Support

- **Documentation**: See this README and inline code documentation
- **Issues**: [GitHub Issues](https://github.com/electrosaur-labs/trapper-photoshop/issues)
- **Discussions**: [GitHub Discussions](https://github.com/electrosaur-labs/trapper-photoshop/discussions)
- **Parent Project**: [Trapper Java Application](https://github.com/electrosaur-labs/trapper)

## Roadmap

- [ ] Support for more than 10 colors
- [ ] CMYK-specific trapping strategies
- [ ] Underbase generation for screen printing
- [ ] Batch processing support
- [ ] Export to separate files
- [ ] Halftone preview
- [ ] Custom trap strategies per layer

---

Built with ❤️ for the print production community