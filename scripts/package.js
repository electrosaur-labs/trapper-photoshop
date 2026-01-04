#!/usr/bin/env node

/**
 * Package the plugin into a .ccx file for distribution
 * A .ccx file is just a ZIP archive of the dist/ directory
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('📦 Packaging Trapper plugin...');

// Get version from package.json
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = packageJson.version;
const outputFile = `trapper-v${version}.ccx`;

// Ensure dist directory exists
if (!fs.existsSync('dist')) {
    console.error('❌ dist/ directory not found. Run "npm run build" first.');
    process.exit(1);
}

// Create .ccx file (which is just a ZIP of the dist/ directory)
try {
    // Remove old .ccx if it exists
    if (fs.existsSync(outputFile)) {
        fs.unlinkSync(outputFile);
        console.log(`🗑️  Removed old ${outputFile}`);
    }

    // Create ZIP archive from dist/ directory
    console.log('📦 Creating .ccx archive...');
    execSync(`cd dist && zip -r ../${outputFile} *`, {
        stdio: 'inherit'
    });

    // Verify the file was created
    if (fs.existsSync(outputFile)) {
        const stats = fs.statSync(outputFile);
        const sizeKB = (stats.size / 1024).toFixed(2);
        console.log(`✅ Plugin packaged successfully: ${outputFile} (${sizeKB} KB)`);
        console.log('');
        console.log('📋 To install:');
        console.log('   1. Close Photoshop if running');
        console.log(`   2. Double-click ${outputFile}`);
        console.log('   3. Photoshop will open and install the plugin');
        console.log('   4. Find plugin at Window > Extensions > Trapper');
    } else {
        throw new Error('Package file was not created');
    }
} catch (error) {
    console.error('❌ Packaging failed:', error.message);
    process.exit(1);
}