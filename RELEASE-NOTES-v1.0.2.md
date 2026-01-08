# Trapper v1.0.2 - UI Visibility Fixes

**Patch Release** - Fixes critical UI visibility issues when Photoshop is in dark mode.

## What's Fixed

### Critical UI Fixes
- **Fixed text visibility in dark mode** - Dialog now uses white background with dark text, ensuring all labels and controls are clearly visible regardless of Photoshop's theme
- **Fixed section titles** - "PRINTING MODE" and "TRAP SIZE" labels now display in dark, readable color
- **Fixed input field text** - Text typed in the "Maximum Trap" field is now always visible (dark text on white background)
- **Fixed placeholder text** - Placeholder hints are now properly styled and visible

### Technical Details
The plugin dialog previously inherited Photoshop's dark theme background, causing dark text to be nearly invisible. The dialog now forces a white background with dark text for consistent visibility across all Photoshop themes.

## Installation

### Windows

1. Download `trapper-v1.0.2.ccx` from the release assets below
2. Close Photoshop if running
3. Double-click `trapper-v1.0.2.ccx` to install via Creative Cloud
4. Open Photoshop
5. Find plugin at **Plugins > Color Trapping...**

### Mac (Recommended Method)

1. Download both `trapper-v1.0.2.ccx` and `install-mac.sh` from the release assets
2. Open Terminal and navigate to your Downloads folder:
   ```bash
   cd ~/Downloads
   ```
3. Make the script executable and run it:
   ```bash
   chmod +x install-mac.sh
   ./install-mac.sh
   ```
4. If Photoshop is in `/Applications`, the script will prompt for your password (sudo required)
5. Restart Photoshop
6. Find plugin at **Plugins > Color Trapping...**

### Mac (Alternative Methods)

#### Manual Installation
```bash
# Rename .ccx to .zip and extract
unzip trapper-v1.0.2.ccx -d trapper-plugin

# Copy to Photoshop plugins folder
# For Photoshop 2024
cp -r trapper-plugin ~/Library/Application\ Support/Adobe/UXP/PluginsStorage/PHSP/24/Developer/

# For Photoshop 2025/2026, adjust version number accordingly
```

#### Command-Line Installation
```bash
"/Library/Application Support/Adobe/Adobe Desktop Common/UPI/AdobePluginInstallerAgent" \
  --install "/path/to/trapper-v1.0.2.ccx"
```

## Requirements

- **Photoshop:** 2024 or later (version 23.3.0+)
- **Document:** Must have exactly 1 unlocked layer
- **Color Mode:** RGB (8-bit per channel)
- **Colors:** Maximum 10 distinct colors

## Changes Since v1.0.1

### UI Visibility Fixes
- Set explicit white background on dialog, body, and container elements
- Changed section title color from `#6e6e6e` (light gray) to `#323232` (dark gray)
- Added explicit text color `#323232` to input fields and select elements
- Added proper placeholder text styling with `#6e6e6e` color

### Files Changed
- `src/index.html` - Updated CSS for text visibility and background colors

## Upgrading from v1.0.1

Simply install v1.0.2 using the methods above. The new version will replace v1.0.1 automatically. No changes to your workflow or settings needed.

**Why upgrade:** If you found the plugin difficult to use because labels and text were hard to read, this update fixes those issues completely.

## Known Issues

Same limitations as previous versions:
- Single layer requirement (document must be flattened to 1 unlocked layer)
- RGB mode only (by design - spot color focus)
- Maximum 10 colors
- 8-bit color depth only

## Full Changelog

**v1.0.2 (2026-01-08)**
- Fix: Dialog text now clearly visible in both light and dark Photoshop themes
- Fix: Section titles ("PRINTING MODE", "TRAP SIZE") now use readable dark color
- Fix: Input field text always visible with explicit dark color
- Fix: Placeholder text properly styled

**v1.0.1 (2026-01-06)**
- Fix: Plugin installation on Photoshop 2026
- Fix: Mac installation errors
- Fix: Manifest format for better UXP compatibility
- Enhancement: Mac installer with sudo support
- Enhancement: Added plugin icons

**v1.0.0 (2026-01-04)**
- Initial release

## License

GPL-3.0 - See LICENSE file for details

## Links

- **Source Code:** https://github.com/electrosaur-labs/trapper-photoshop
- **Issues:** https://github.com/electrosaur-labs/trapper-photoshop/issues
- **Documentation:** https://github.com/electrosaur-labs/trapper-photoshop#readme
- **Previous Release Notes:**
  - [v1.0.1](https://github.com/electrosaur-labs/trapper-photoshop/blob/main/RELEASE-NOTES-v1.0.1.md)
  - [v1.0.0](https://github.com/electrosaur-labs/trapper-photoshop/blob/main/RELEASE-NOTES-v1.0.0.md)

## Support

If you encounter issues:
1. Check the [README](https://github.com/electrosaur-labs/trapper-photoshop#readme) for installation instructions
2. Try the Mac `install-mac.sh` script if on macOS
3. Open an issue at https://github.com/electrosaur-labs/trapper-photoshop/issues

---

**Note:** This is a critical usability fix. If you installed v1.0.0 or v1.0.1 and found the interface difficult to read, please upgrade to v1.0.2.
