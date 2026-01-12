# TODO - Trapper Photoshop Plugin

## Pending Releases

### v1.0.3 - Icon Improvements & Menu Reorganization
**Status:** Ready to release (not urgent)

**Changes:**
- ✅ Recreated icon files (`icon_light.png` and `icon_dark.png`)
- ✅ Added "T" letter branding to icons
  - Black "T" on light theme icon (for light backgrounds)
  - White "T" on dark theme icon (for dark backgrounds)
- ✅ Icons represent overlapping color layers showing trapping concept
- ✅ Menu reorganization: Grouped with SimProcess under "Screen Printing"
  - **Old:** `Plugins > Trapper > Color Trapping...`
  - **New:** `Plugins > Screen Printing > Color Trapping...`
  - Provides better organization when multiple Electrosaur screen printing plugins are installed
- ✅ Build verified (icons and manifest correctly updated in `dist/`)

**Files Changed:**
- `manifest.json` (name: "Trapper" → "Screen Printing")
- `src/icons/icon_light.png` (195 bytes)
- `src/icons/icon_dark.png` (190 bytes)

**Release Steps:**
1. Update version in `package.json` (1.0.2 → 1.0.3)
2. Update version in `manifest.json` (1.0.2 → 1.0.3)
3. Create `RELEASE-NOTES-v1.0.3.md`
4. Run `npm run package` to create `trapper-v1.0.3.ccx`
5. Commit changes
6. Create git tag `v1.0.3`
7. Push to repository with tags
8. Create GitHub release with `.ccx` file

**Notes:**
- Previous icon files were corrupt and caused read errors
- New icons created programmatically using Python (pure PNG generation, no dependencies)
- Icons work correctly in Photoshop 2024+ and meet UXP manifest requirements

---

## Future Enhancements

### Features
- [ ] Support for more than 10 colors
- [ ] Configurable minTrap for darkest layer (currently fixed at 0)
- [ ] CMYK-specific trapping strategies
- [ ] Underbase generation for screen printing
- [ ] Batch processing support
- [ ] Export to separate files
- [ ] Halftone preview
- [ ] Custom trap strategies per layer

### Known Issues
- Display refresh issue: After processing, only 1 layer visible until document switch (documented in DECISIONS.md)
- Workaround exists (switch documents), low priority

### Documentation
- [ ] Add video tutorial/demo
- [ ] Create troubleshooting guide with screenshots
- [ ] Add examples gallery

---

**Last Updated:** 2026-01-09
