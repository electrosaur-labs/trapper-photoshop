#!/usr/bin/env node

/**
 * Package the plugin into a .ccx file for distribution
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('📦 Packaging Trapper plugin...');

// Check if UXP packager is available
try {
    execSync('which uxp', { stdio: 'ignore' });
} catch (error) {
    console.error('❌ UXP CLI not found. Install it with:');
    console.error('   npm install -g @adobe/uxp-devtools-cli');
    process.exit(1);
}

// Create package
try {
    const outputFile = 'trapper-v1.0.0.ccx';
    execSync(`uxp package --manifest dist/manifest.json --output ${outputFile}`, {
        stdio: 'inherit'
    });

    console.log(`✅ Plugin packaged successfully: ${outputFile}`);
    console.log('📋 To install: Double-click the .ccx file or use Creative Cloud');
} catch (error) {
    console.error('❌ Packaging failed:', error.message);
    process.exit(1);
}