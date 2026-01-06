# Trapper v1.0.1 - Bug Fixes and Installation Improvements

**Patch Release** - Fixes installation issues on Mac and improves Photoshop 2026 compatibility.

## What's Fixed

### Critical Fixes
- **Fixed plugin installation on Photoshop 2026** - Plugin now loads correctly in Photoshop 2026 and later versions
- **Fixed Mac installation errors** - Resolved "couldn't install plugin" error on macOS when using Creative Cloud installer
- **Fixed manifest format** - Updated to proper UXP manifest v5 format for better compatibility

### Improvements
- **Enhanced Mac installer** - `install-mac.sh` script now handles system-wide Photoshop installations with proper sudo support
- **Added plugin icons** - Plugin now displays proper icons in Photoshop's Plugins menu
- **Better permissions** - Added explicit `requiredPermissions` for clearer security model

## Installation

### Windows

1. Download `trapper-v1.0.1.ccx` from the release assets below
2. Close Photoshop if running
3. Double-click `trapper-v1.0.1.ccx` to install via Creative Cloud
4. Open Photoshop
5. Find plugin at **Plugins > Color Trapping...**

### Mac (Recommended Method)

1. Download both `trapper-v1.0.1.ccx` and `install-mac.sh` from the release assets
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
unzip trapper-v1.0.1.ccx -d trapper-plugin

# Copy to Photoshop plugins folder
# For Photoshop 2024
cp -r trapper-plugin ~/Library/Application\ Support/Adobe/UXP/PluginsStorage/PHSP/24/Developer/

# For Photoshop 2025/2026, adjust version number accordingly
```

#### Command-Line Installation
```bash
"/Library/Application Support/Adobe/Adobe Desktop Common/UPI/AdobePluginInstallerAgent" \
  --install "/path/to/trapper-v1.0.1.ccx"
```

## Requirements

- **Photoshop:** 2024 or later (version 23.3.0+)
- **Document:** Must have exactly 1 unlocked layer
- **Color Mode:** RGB (8-bit per channel)
- **Colors:** Maximum 10 distinct colors

## Changes Since v1.0.0

### Manifest Changes (a9003f9)
- Changed `host` from array to object format (required for UXP v5)
- Added `icons` array with 24×24 PNG icons for light and dark themes
- Added `species: ['generic']` for proper icon display in Plugins menu
- Added explicit `requiredPermissions` (localFileSystem, network, clipboard)
- Added `apiVersion: 2` in host.data

### Installation Improvements (ca87da1, 1b9a367)
- Created `install-mac.sh` automated installer with permission detection
- Script now detects system-wide vs user-specific Photoshop installations
- Automatically prompts for sudo when needed (fixing permission errors)
- Added error handling for missing files and invalid paths

### Documentation Updates (7c4cd47, c6416b1)
- Documented correct packaging process for UXP plugins
- Added industry context for 10-color limit (screen printing workflows)
- Clarified 4-connected neighbor expansion algorithm
- Improved RGB mode requirement documentation
- Clarified minTrap behavior (darkest layer always 0)

## Upgrading from v1.0.0

Simply install v1.0.1 using the methods above. The new version will replace v1.0.0 automatically. No changes to your workflow or settings needed.

## Known Issues

Same limitations as v1.0.0:
- Single layer requirement (document must be flattened to 1 unlocked layer)
- RGB mode only (by design - spot color focus)
- Maximum 10 colors
- 8-bit color depth only

## Full Changelog

- a9003f9 - Fix manifest and add icons for Photoshop 2026 compatibility
- ca87da1 - Fix install-mac.sh: handle system-wide Photoshop installation
- 1b9a367 - Add Mac installation script and update documentation
- 7c4cd47 - Document correct packaging process for UXP plugins
- c6416b1 - Improve documentation clarity and consistency

## License

GPL-3.0 - See LICENSE file for details

## Links

- **Source Code:** https://github.com/electrosaur-labs/trapper-photoshop
- **Issues:** https://github.com/electrosaur-labs/trapper-photoshop/issues
- **Documentation:** https://github.com/electrosaur-labs/trapper-photoshop#readme
- **v1.0.0 Release Notes:** https://github.com/electrosaur-labs/trapper-photoshop/blob/main/RELEASE-NOTES-v1.0.0.md

## Support

If you encounter installation issues:
1. Check the [README](https://github.com/electrosaur-labs/trapper-photoshop#readme) for detailed installation instructions
2. Try the Mac `install-mac.sh` script if on macOS
3. Open an issue at https://github.com/electrosaur-labs/trapper-photoshop/issues

---

**Note:** Plugin now appears in **Plugins > Color Trapping...** (not Window > Extensions). This is correct behavior for command-type plugins in UXP v5.
