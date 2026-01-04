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

## 8. Pre-Flight Validation: Single Unlocked Layer Requirement

**Decision:** Require exactly 1 unlocked layer before opening the plugin dialog. If this requirement is not met, show an error message and do not open the dialog.

**Rationale:**
- **Simplicity:** Eliminates all complexity around flattening, merging, smart objects, locked layers, etc.
- **User Control:** Puts the onus on the user and Photoshop to prepare the document correctly
- **Avoids Artifacts:** No risk of compositing artifacts from automated flatten/merge operations
- **Clear Expectations:** User knows exactly what state the document must be in
- **Fail Fast:** Validation happens before any operations begin, preventing mid-operation failures
- **No Modal Conflicts:** User can prepare document without being blocked by modal dialog

**Error Message Example:**
```
Document has 3 layer(s) total (2 unlocked, 1 locked).

Color trapping requires exactly 1 unlocked layer.

Please prepare your document first:
1. Flatten or merge all layers (Layer > Flatten Image)
2. Rasterize any smart objects (Layer > Rasterize)
3. Ensure you have only 1 unlocked layer

This ensures clean, predictable color separation.
```

**Implementation:**
- `checkDocumentValidity()` in TrapperController.js (lines 33-100)
- Called before showing dialog in src/index.js (line 43)
- Plugin dialog never opens if validation fails

**Benefits Over Previous Flatten Approach:**
- No `flattenDocument()` method needed
- No `mergeVisible` compositing issues
- No smart object rasterization code
- No hidden layer handling
- No locked layer mid-operation failures
- Smaller, simpler codebase (~8KB smaller bundle)

## 9. RGB Color Mode Only (No CMYK Support)

**Decision:** Only support RGB color mode. Do not support CMYK, Lab, Grayscale, or Indexed color modes.

**Rationale:**

**Why RGB works for this use case:**
- Plugin targets **spot color printing** workflows (screen printing, simple offset, posters)
- Each distinct RGB color represents a separate printing plate/screen
- Simpler trapping model: lighter colors spread under darker colors based on overall lightness
- Matches the original Java application's design philosophy

**Why CMYK is fundamentally different:**
- CMYK trapping operates at the **channel level**, not color level
- Each channel (C, M, Y, K) represents a physical printing plate
- Trapping only applies to channels that differ between adjacent colors
- **Common ink optimization**: Colors sharing ink channels (e.g., Red=M+Y and Orange=M+Y both share Magenta) get natural registration - only non-common channels need trapping
- Requires per-pixel CMYK comparison with neighbors
- Much more complex algorithm with selective per-channel trapping

**Implementation complexity for CMYK:**
1. Channel-level analysis instead of color-level separation
2. Per-pixel neighbor comparison to identify differing channels
3. Calculate common ink percentages between adjacent colors
4. Apply different trap directions/amounts per channel at same boundary
5. Handle gradients, blends, and varying ink densities

**Conclusion:** CMYK process color printing requires professional prepress software (Adobe InDesign, Esko DeskPack) with sophisticated CMYK trapping engines. This plugin's RGB approach is optimal for spot color work where each color is a discrete printing element.

**For users needing CMYK:** Use professional prepress tools designed for process color trapping.

## 10. Full Document Bounds for Flattened Layer Reading

**Decision:** Always read flattened layer pixels using full document bounds, not layer's natural bounds.

**Problem:** When documents contained smart objects, layers would shift leftwards after trapping (all layers except black). This happened because:
1. Smart objects, when flattened, can create layers with bounds that don't start at (0,0)
2. `getLayerPixels()` reads pixels based on layer's natural bounds (which might be offset)
3. We assumed the pixel data started at (0,0) and wrote it back to (0,0)
4. Result: Pixels were read from offset bounds but written to (0,0), causing the shift

**Solution:** Created `getLayerPixelsFullDocument()` method that:
- Explicitly requests pixels for the full document bounds (0,0 to width,height)
- Uses `sourceBounds` parameter in `imaging.getPixels()`
- Ensures pixel data always represents the full document coordinate space
- Used when reading the flattened layer for color analysis

**Implementation:**
- `getLayerPixelsFullDocument()` in PhotoshopAPI.js (line 143)
- Used in TrapperController.js when reading flattened layer (line 187)

## 11. Dialog State Reset and Event Listener Management

**Decision:** Reset dialog UI state every time the dialog opens, and only attach event listeners once.

**Problems:**
1. **Disabled button:** After a successful trapping operation, the "Apply Trapping" button remained disabled on subsequent openings because:
   - `showProgress()` disables buttons during processing
   - On success, the dialog closes without calling `hideProgress()`
   - Dialog DOM persists between openings (UXP behavior)
   - Button's `disabled` attribute remained from previous run

2. **Duplicate event handlers:** Multiple error dialogs appeared on 2nd/3rd runs saying "Trapping is already in progress" because:
   - `setupDialogEventListeners()` was called every time the dialog opened
   - Event listeners were added multiple times without removing old ones
   - Clicking "Apply" triggered all accumulated handlers
   - First handler set `isProcessing = true`, subsequent handlers immediately threw error
   - But first handler continued and completed successfully (output file created)

**Solution:**
1. Call `resetDialogState()` to re-enable buttons and reset progress UI
2. Use `listenersAttached` flag to prevent attaching duplicate event listeners
3. Only set up event listeners once on first dialog show

**Implementation:**
- `resetDialogState()` function in src/index.js (line 119)
- `listenersAttached` flag check in `setupDialogEventListeners()` (line 86)
- Called from `setupDialogEventListeners()` every time dialog opens (line 83)

## 12. Pre-Flight Validation Replaces Runtime Flatten (Supersedes Decision #15)

**Previous Approach (Decisions #12, #14, #15):** Plugin attempted to flatten documents at runtime, which led to:
- Complex two-phase architecture (flatten outside modal, trap inside modal)
- Silent flatten failures on already-trapped documents
- Compositing artifacts (violet streaks) from `mergeVisible`
- Smart object rasterization complexity
- Hidden layer handling complexity
- Locked layer mid-operation failures

**Current Approach:** Pre-flight validation requires exactly 1 unlocked layer (see Decision #8).

**Benefits:**
- No flatten code needed at all
- No runtime failures from malformed documents
- User prepares document using Photoshop's native tools (which they understand)
- Plugin focuses on its core competency: color trapping
- Simpler, more maintainable codebase

## 13. Color Filtering for Anti-Aliasing Artifacts

**Decision:** Filter out colors with very few pixels before creating layers.

**Rationale:**
- Smart objects and some layer effects can introduce anti-aliasing artifacts when flattened
- These artifacts create spurious colors with only a handful of pixels scattered throughout document
- Without filtering, these get extracted as separate layers (e.g., gray streaky layer)
- Filtering prevents creation of unwanted artifact layers

**Implementation:**
- Lines 199-215 in TrapperController.js
- Minimum threshold: 0.01% of total pixels, or 100 pixels (whichever is greater)
- Example: 570×390 image (222,300 pixels) requires ≥223 pixels minimum
- Colors below threshold are logged but not extracted into layers

**Trade-off:** Legitimate colors that occupy very small areas (<0.01%) will be filtered out. For typical spot color print work, this is acceptable as such small color areas are usually artifacts or noise.

## 14. Source Layer Deletion Using Stored ID

**Decision:** Store the source layer's ID before processing, then use that ID to find and delete it afterward.

**Rationale:**
- After creating color-separated layers, we need to delete the original source layer
- Layer ID is stable and unique throughout the operation
- More reliable than name-based matching

**Implementation:** Lines 236, 325-331 in TrapperController.js

## 15. Error Rollback Using History Suspension (Supersedes Previous Decisions)

**Decision:** On error, do NOT call `resumeHistory()`, which causes Photoshop to automatically roll back all suspended changes.

**Rationale:**
- `suspendHistory()` creates a transactional boundary
- Calling `resumeHistory()` commits all changes as one undo entry
- NOT calling `resumeHistory()` discards all suspended changes (automatic rollback)
- Nothing appears in undo history on error
- Document returns to pre-operation state

**Implementation:**
```javascript
try {
    trappingResult = await controller.applyTrapping({...});
    // SUCCESS: Resume history to commit changes
    await executionContext.hostControl.resumeHistory(suspensionID);
} catch (error) {
    // ERROR: Don't resume history - changes are automatically discarded
    // Document rolls back to pre-operation state
    throw error;
}
```

**Benefits:**
- Transactional behavior: all-or-nothing
- No partial state changes in document
- No undo history pollution on errors
- Clean user experience

**Implementation:** Lines 179-204 in src/index.js

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
