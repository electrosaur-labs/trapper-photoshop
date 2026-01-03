# Architectural Decisions

This document records important design decisions made during the development of the Trapper color trapping plugin.

## 1. Manual Pixel Extraction Instead of Selection API

**Decision:** Use manual pixel filtering with `imaging.getPixels()` and `imaging.putPixels()` instead of Photoshop's selection API (`selectColorRange`, `layerViaCopy`, etc.).

**Rationale:**
- Initial attempts using `selectColorRange` and `layerViaCopy` batchPlay commands failed silently
- Commands executed but didn't appear in history and had no effect
- Manual pixel extraction provides complete control and reliability
- Allows working with full document-sized data throughout the pipeline

**Implementation:** `extractSingleColor()` method in TrapperController.js

## 2. Layer Creation Order Instead of Reordering

**Decision:** Create layers in sorted order (lightest to darkest) from the start, rather than creating layers and then reordering them.

**Rationale:**
- `moveLayerToTop()` doesn't work inside `executeAsModal`
- Both native API (`layer.move()`) and batchPlay approaches failed
- Native API threw "Cannot read properties of null (reading 'typename')" because `layer.parent` is null
- batchPlay commands executed but had no effect on layer order
- Exploiting Photoshop's natural stacking (newest layers on top) is more reliable

**Result:** Layers created lightest-first result in correct final order: darkest on top, lightest on bottom

**Implementation:** Lines 192-196 in TrapperController.js

## 3. Full Document-Sized Coordinate System

**Decision:** Work with full document-sized pixel data throughout the trapping pipeline, not cropped layer bounds.

**Rationale:**
- Initial approach using `getLayerPixels()` returned cropped bounds
- Applying trapping and writing back caused coordinate mismatches
- This led to pixel corruption (e.g., black pixels changing to purple)
- Using consistent full document coordinates eliminates all coordinate system issues

**Implementation:**
- Store `pixelData` with each color layer (line 235 in TrapperController.js)
- Use stored data in `applyTrappingToLayer()` instead of reading from layer
- Create mask using full document coordinates
- Write result back at (0,0) with full document size

## 4. Modal Behavior: 'execute' Instead of Default

**Decision:** Use `modalBehavior: 'execute'` in `executeAsModal` calls.

**Rationale:**
- Default modal behavior suspends history, which can cause undo issues
- 'execute' mode allows operations to be recorded in history properly
- Provides better user experience with proper undo/redo support

**Implementation:** Line 156 in src/index.js

## 5. Darker Color Mask Implementation

**Decision:** Create mask by combining pixel data from all darker layers (higher indices in sorted array).

**Rationale:**
- Trapping should only occur where lighter colors expand into empty space
- Lighter colors should NOT overlap darker colors
- Mask prevents dilation from expanding into areas covered by darker layers
- Uses alpha channel for masking (opaque = blocked, transparent = allow expansion)

**Implementation:** `createDarkerColorMaskFromLayers()` in TrapperController.js (lines 491-527)

## 6. Alpha Channel for Mask Checking

**Decision:** Check `mask.data[idx + 3]` (alpha channel) instead of `mask.data[idx]` (red channel).

**Rationale:**
- Initial implementation incorrectly checked red channel
- Caused "Cannot read properties of undefined" errors
- Alpha channel is the proper way to determine if a mask blocks expansion
- Transparent (alpha=0) = allow expansion, Opaque (alpha=255) = blocked

**Implementation:** Line 141 in TrappingEngine.js

## 7. Iterative Dilation Algorithm

**Decision:** Use iterative 4-connected neighbor dilation instead of kernel-based convolution.

**Rationale:**
- Simpler to implement and understand
- Provides precise control over expansion radius
- Works well with masking (can check mask at each iteration)
- Performance is acceptable for typical trap sizes (1-10 pixels)

**Implementation:** `applyDilationWithMask()` in TrappingEngine.js (lines 107-177)

## 8. Document Persistence Strategy

**Decision:** Create a duplicated document for color separation, leave original unchanged.

**Rationale:**
- Non-destructive workflow - original remains untouched
- User can compare original with separated version
- Allows multiple attempts with different trap settings
- Follows standard Photoshop plugin best practices

**Implementation:** Line 154 in TrapperController.js

## Known Issues

### Display Refresh Issue
**Issue:** After `executeAsModal` completes and success alert is shown, Photoshop displays only 1 layer instead of all 7 color-separated layers. Switching to another document and back reveals all 7 layers correctly.

**Root Cause:** Unknown Photoshop UI refresh bug. Document state is correct in memory, but display is not updated.

**Attempted Solutions:**
1. Layer visibility toggle - didn't work
2. Document switching with batchPlay - didn't work
3. Zoom level nudge - didn't work
4. `core.redrawDocument()` - didn't work

**Current Status:** Deferred. Users can work around by manually switching documents. Core functionality (separation, ordering, trapping) works correctly.

## Technology Stack

- **UXP (Unified Extensibility Platform)** - Photoshop 2024+ plugin framework
- **Manifest v5** - Command-based entrypoints with `executeAsModal`
- **Imaging API** - `imaging.getPixels()` and `imaging.putPixels()` for pixel manipulation
- **BatchPlay API** - Action descriptor API for Photoshop operations
- **Webpack** - Module bundler for production builds
- **Jest** - Unit testing framework

## File Structure

```
src/
├── index.js              # Entry point, dialog management
├── index.html            # Dialog UI
├── core/
│   ├── TrapperController.js  # Main controller, orchestrates workflow
│   └── TrappingEngine.js     # Color analysis and morphological operations
├── api/
│   └── PhotoshopAPI.js       # Wrapper for Photoshop API calls
└── utils/
    └── TrapSizeParser.js     # Parse trap sizes (fractions, points, inches)
```

## Future Considerations

1. **Performance Optimization** - For large documents or many colors, consider Web Workers or incremental processing
2. **Screen Printing Mode** - Add underbase/choke generation for screen printing workflows
3. **Color Tolerance** - Allow slight color variation matching instead of exact RGB match
4. **Preview Mode** - Show trap overlay before committing
5. **Batch Processing** - Process multiple documents with same settings
