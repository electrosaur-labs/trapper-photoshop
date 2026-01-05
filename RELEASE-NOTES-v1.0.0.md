# Trapper v1.0.0 - Color Trapping for Photoshop

**Initial Release** - Professional color trapping plugin for Adobe Photoshop spot color print workflows.

## Installation

### Windows

1. Download `trapper-v1.0.0.ccx` from the release assets below
2. Close Photoshop if running
3. Double-click `trapper-v1.0.0.ccx` to install via Creative Cloud
4. Open Photoshop
5. Find plugin at **Window > Extensions > Trapper**

### Mac

**⚠️ Note:** Double-clicking .ccx files on Mac may not work reliably. Use one of these methods:

#### Method 1: Automated Installation (Recommended)

1. Download both `trapper-v1.0.0.ccx` and `install-mac.sh` from the release assets
2. Open Terminal and navigate to your Downloads folder:
   ```bash
   cd ~/Downloads
   ```
3. Make the script executable and run it:
   ```bash
   chmod +x install-mac.sh
   ./install-mac.sh
   ```
4. Follow the on-screen prompts
5. Restart Photoshop
6. Find plugin at **Window > Extensions > Trapper**

#### Method 2: Manual Installation

1. Download `trapper-v1.0.0.ccx`
2. Rename to `.zip` and extract:
   ```bash
   unzip trapper-v1.0.0.ccx -d trapper-plugin
   ```
3. Copy to Photoshop plugins folder:
   ```bash
   # For Photoshop 2024
   cp -r trapper-plugin ~/Applications/Adobe\ Photoshop\ 2024/Plug-ins/
   ```
4. Restart Photoshop
5. Find plugin at **Window > Extensions > Trapper**

#### Method 3: Command-Line Installation

```bash
"/Library/Application Support/Adobe/Adobe Desktop Common/UPI/AdobePluginInstallerAgent" \
  --install "/path/to/trapper-v1.0.0.ccx"
```

## Requirements

- **Photoshop:** 2024 or later (version 23.3.0+)
- **Document:** Must have exactly 1 unlocked layer
- **Color Mode:** RGB (8-bit per channel)
- **Colors:** Maximum 10 distinct colors

## Document Preparation

Before using the plugin, prepare your document:

1. Flatten all layers: **Layer > Flatten Image**
2. Rasterize smart objects: **Layer > Rasterize > Smart Object**
3. Ensure document has exactly 1 unlocked layer
4. Document should be in RGB color mode

## Usage

1. Open your prepared document (1 unlocked layer, RGB mode)
2. **Window > Extensions > Trapper**
3. Choose printing mode:
   - **Offset Lithography:** High-precision commercial printing (default trap: 1/32")
   - **Screen Printing:** Garment/poster printing (default trap: 4pt)
4. Set maximum trap size (lightest layer)
5. Click **Apply Trapping**
6. Plugin creates color-separated layers with trapping applied

## Features

- **Automatic Color Separation:** Extracts up to 10 distinct colors into separate layers
- **Intelligent Trapping:** Lighter colors expand under darker colors
- **Linear Trap Scaling:** Trap decreases from lightest (max) to darkest (0)
- **Clean Separation:** Filters out anti-aliasing artifacts
- **Single Undo:** All operations grouped into one undo entry
- **Error Rollback:** Failed operations automatically roll back changes

## Printing Modes

### Offset Lithography
- Typical trap sizes: 1/32" to 1/64"
- High-precision commercial printing
- Magazines, packaging, commercial work

### Screen Printing
- Typical trap sizes: 2pt to 6pt
- Garment and poster printing
- T-shirts, posters, signage

## Trap Size Formats

All trap sizes accept multiple formats:
- **Fractions:** `1/32`, `1/64`, `1/16` (inches)
- **Decimals:** `0.03125`, `0.015625` (inches)
- **Points:** `2pt`, `4pt`, `6pt` (72 points = 1 inch)

## How It Works

1. **Pre-Flight Validation:** Checks for single unlocked layer requirement
2. **Color Analysis:** Identifies distinct colors and sorts by lightness
3. **Layer Creation:** Creates separate layer for each color (lightest to darkest)
4. **Morphological Dilation:** Applies 4-connected neighbor expansion (top, right, bottom, left)
5. **Trap Scaling:** Lightest layer gets maximum trap, darkest gets none
6. **Layer Ordering:** Automatically stacks darkest on top, lightest on bottom

## Example Workflow

**Input:** Single-layer document with 5 colors (white, yellow, red, blue, black)

**Output:** 5 color-separated layers:
- Black - Trap 0px (darkest, defines edges)
- Blue - Trap 2px
- Red - Trap 4px
- Yellow - Trap 6px (lightest, maximum trap)
- White substrate ignored (optimization)

## Known Limitations

- **Single layer requirement:** Document must be flattened to 1 unlocked layer
- **RGB mode only:** CMYK, Lab, Grayscale not supported (by design - spot color focus)
- **Maximum 10 colors:** More colors will trigger error
- **8-bit only:** 16-bit and 32-bit color depth not supported
- **No re-trapping:** Cannot trap already-trapped documents

## Technical Details

- **Architecture:** UXP (Unified Extensibility Platform) plugin
- **Algorithm:** Morphological dilation with darker-color masking
- **Coordinate System:** Full document-sized pixel data throughout
- **History:** Single undo entry using `suspendHistory`/`resumeHistory`
- **Error Handling:** Automatic rollback on failure

## License

GPL-3.0 - See LICENSE file for details

## Source Code

GitHub: https://github.com/electrosaur-labs/trapper-photoshop

## Support

- **Issues:** https://github.com/electrosaur-labs/trapper-photoshop/issues
- **Documentation:** See DECISIONS.md and CLAUDE.md in repository

## Credits

Developed by Electrosaur Labs

Based on color trapping algorithms used in professional prepress workflows.
