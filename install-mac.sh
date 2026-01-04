#!/bin/bash

# Trapper for Photoshop - Mac Installation Script
# Installs the Trapper UXP plugin to Photoshop

set -e

echo "🎨 Trapper for Photoshop - Mac Installer"
echo "========================================"
echo ""

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ This script is for macOS only."
    exit 1
fi

# Find the .ccx file in current directory
CCX_FILE=$(ls trapper-v*.ccx 2>/dev/null | head -n 1)

if [ -z "$CCX_FILE" ]; then
    echo "❌ No trapper-v*.ccx file found in current directory."
    echo "   Please download the .ccx file and run this script from the same folder."
    exit 1
fi

echo "✓ Found: $CCX_FILE"
echo ""

# Detect Photoshop version(s)
PS_VERSIONS=()
for version in 2024 2025 2026; do
    PS_PATH="$HOME/Applications/Adobe Photoshop $version"
    if [ ! -d "$PS_PATH" ]; then
        PS_PATH="/Applications/Adobe Photoshop $version"
    fi

    if [ -d "$PS_PATH" ]; then
        PS_VERSIONS+=("$version")
    fi
done

if [ ${#PS_VERSIONS[@]} -eq 0 ]; then
    echo "❌ Adobe Photoshop 2024 or later not found."
    echo "   Plugin requires Photoshop 2024+ (v23.3.0 or later)"
    exit 1
fi

echo "✓ Found Photoshop version(s): ${PS_VERSIONS[*]}"
echo ""

# Ask which version to install to (if multiple found)
TARGET_VERSION=""
if [ ${#PS_VERSIONS[@]} -eq 1 ]; then
    TARGET_VERSION="${PS_VERSIONS[0]}"
    echo "Installing to Photoshop $TARGET_VERSION"
else
    echo "Multiple Photoshop versions found. Choose installation target:"
    for i in "${!PS_VERSIONS[@]}"; do
        echo "  $((i+1))) Photoshop ${PS_VERSIONS[$i]}"
    done
    echo "  A) All versions"
    echo ""
    read -p "Enter choice (1-${#PS_VERSIONS[@]} or A): " choice

    if [[ "$choice" == "A" || "$choice" == "a" ]]; then
        echo "Installing to all versions..."
    elif [[ "$choice" =~ ^[0-9]+$ ]] && [ "$choice" -ge 1 ] && [ "$choice" -le ${#PS_VERSIONS[@]} ]; then
        TARGET_VERSION="${PS_VERSIONS[$((choice-1))]}"
        echo "Installing to Photoshop $TARGET_VERSION"
    else
        echo "❌ Invalid choice"
        exit 1
    fi
fi
echo ""

# Create temporary directory for extraction
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

echo "📦 Extracting plugin..."
unzip -q "$CCX_FILE" -d "$TEMP_DIR/trapper"

# Verify extraction
if [ ! -f "$TEMP_DIR/trapper/manifest.json" ]; then
    echo "❌ Invalid .ccx file - manifest.json not found"
    exit 1
fi

# Install to selected version(s)
install_to_version() {
    local version=$1

    # Try user-specific location first, then system-wide
    local PS_PATH="$HOME/Applications/Adobe Photoshop $version"
    if [ ! -d "$PS_PATH" ]; then
        PS_PATH="/Applications/Adobe Photoshop $version"
    fi

    local PLUGINS_DIR="$PS_PATH/Plug-ins"
    local INSTALL_DIR="$PLUGINS_DIR/trapper"

    # Check if we need sudo
    local NEED_SUDO=false
    if [[ "$PS_PATH" == "/Applications/"* ]]; then
        if [ ! -w "$PS_PATH" ]; then
            NEED_SUDO=true
        fi
    fi

    if [ "$NEED_SUDO" = true ]; then
        echo "  📌 Installing to system-wide location requires administrator privileges"

        # Create Plug-ins directory if it doesn't exist
        if [ ! -d "$PLUGINS_DIR" ]; then
            sudo mkdir -p "$PLUGINS_DIR"
        fi

        # Remove old installation if it exists
        if [ -d "$INSTALL_DIR" ]; then
            echo "  Removing old installation..."
            sudo rm -rf "$INSTALL_DIR"
        fi

        # Copy plugin files
        echo "  Copying files to $INSTALL_DIR"
        sudo cp -R "$TEMP_DIR/trapper" "$INSTALL_DIR"
    else
        # No sudo needed for user-specific location
        # Create Plug-ins directory if it doesn't exist
        mkdir -p "$PLUGINS_DIR"

        # Remove old installation if it exists
        if [ -d "$INSTALL_DIR" ]; then
            echo "  Removing old installation..."
            rm -rf "$INSTALL_DIR"
        fi

        # Copy plugin files
        echo "  Copying files to $INSTALL_DIR"
        cp -R "$TEMP_DIR/trapper" "$INSTALL_DIR"
    fi

    echo "  ✓ Installed to Photoshop $version"
}

if [ -z "$TARGET_VERSION" ]; then
    # Install to all versions
    for version in "${PS_VERSIONS[@]}"; do
        install_to_version "$version"
    done
else
    # Install to single version
    install_to_version "$TARGET_VERSION"
fi

echo ""
echo "✅ Installation complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Close Photoshop if it's currently running"
echo "   2. Open Photoshop"
echo "   3. Go to: Window > Extensions > Trapper"
echo ""
echo "🔧 Requirements:"
echo "   • Document must have exactly 1 unlocked layer"
echo "   • Must be in RGB color mode"
echo "   • 8-bit per channel"
echo "   • Maximum 10 distinct colors"
echo ""
echo "📚 Documentation: https://github.com/electrosaur-labs/trapper-photoshop"
echo ""
