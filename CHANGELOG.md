# Changelog - Title Layer Animation Effects

## Version: 0.18.0

**Date:** 27.11.2025

### 🌐 Global visual layers (globalLayers)

- New optional top-level field `globalLayers` in the JSON/JSON5 config.
- `globalLayers` are rendered **globally over the full timeline** and are automatically projected onto all clips where they are visible on the global timeline.
- `start` and `stop` in `globalLayers` are **seconds from the beginning of the video** (based on the effective video timeline including transitions).

#### Example: Global letter-by-letter title across clips

```json5
{
  outPath: "./global-title-example.mp4",
  clips: [
    { duration: 3, layers: [{ type: "fill-color", color: "#003366" }] },
    { duration: 4, layers: [{ type: "fill-color", color: "#660033" }] },
  ],
  globalLayers: [
    {
      type: "title",
      text: "Global Title across Clips",
      position: "bottom",
      style: "letter-by-letter",
      animationDuration: 5, // seconds for the full reveal
      start: 1, // 1s after video start
      stop: 6, // visible until 6s on the global timeline
    },
  ],
}
```

The `title` layer is automatically projected into both clips. The `letter-by-letter` animation runs globally from `start` to `stop` without restarting when switching between clips.

#### Supported layer types in `globalLayers`

- **Supported (visual / non-audio layers):**

  - `title`
  - `subtitle`
  - `image`
  - `image-overlay`
  - `fill-color`
  - `radial-gradient`
  - `linear-gradient`
  - `rainbow-colors`
  - `slide-in-text`
  - `news-title`
  - `title-background`

- **Not allowed in `globalLayers`:**

  - `audio`
  - `detached-audio`

  These layer types will trigger a validation error or be ignored. For audio that spans the full video, you should continue to use `audioTracks` or background audio.

#### Known limitations / ⚠️ Notes

- **Video layer in `globalLayers`:**
  - `type: "video"` is currently **not supported** as a global layer (it is rejected during validation).
- **Transitions and global time:**
  - The global timeline for `start` / `stop` is based on the effective video duration (clips minus the overlap consumed by transitions).
  - In most cases this matches the perceived timeline, but global layers cannot guarantee to cover a transition _frame-perfectly_ in all situations.
- **Continuous animations:**
  - For projected `globalLayers`, the animation progress (`progress`) is internally computed using `_globalDuration` / `_globalOffset` and continues seamlessly across clip boundaries.
  - For complex, custom layers (e.g. `canvas` / `fabric` / `gl`), this behavior has not yet been exhaustively tested for all edge cases.

### 🔊 MP3 output support

- `outPath` can now also end with `.mp3` to produce an **audio-only export**.
- Behavior:
  - Only the audio pipeline is used (e.g. mix of `audioTracks`, clip audio, background audio).
  - No video stream is produced.
- Existing output formats (`.mp4`, `.mkv`, `.gif`) continue to work unchanged.

## Version: 0.17.0

**Date:** 18.11.2025

### ✨ Title outline & animation improvements

- Add text outline effects for title layers:
  - New `outlineColor`, `outlineWidth` and `outlineStyle` (`"outline" | "shadow" | "glow"`) options.
  - 2-layer rendering (outline below, fill above) so text stays fully readable even with thick outlines.
  - Corrected outline alignment for `top`/`bottom` positions for all outline styles.
- Add `animationDuration` (seconds) for `word-by-word` and `letter-by-letter` title animations to control reveal speed.

#### Example title layer with new properties

```json5
{
  type: "title",
  text: "My Title",
  textColor: "#ffffff",
  position: "center",
  style: "word-by-word", // 'word-by-word' | 'letter-by-letter' | 'fade-in'
  animationDuration: 1.5, // number (seconds)
  outlineColor: "#000000", // string
  outlineWidth: 4, // number (pixels)
  outlineStyle: "shadow", // 'outline' | 'shadow' | 'glow'
}
```

## Version: 0.16.1

- Fix: No style, no zoom text applied

## Version: 0.16.0

**Date:** 19.10.2025

### 🎬 New Title Layer Features

#### **Title Layer Animation Styles**

- **New `style` field** added to Title Layer configuration
- **Three animation effects** implemented for Title Layers:
  - `"fade-in"` - Smooth fade-in effect (default for Title Layer)
  - `"word-by-word"` - Words appear sequentially in Title Layer
  - `"letter-by-letter"` - Letters appear sequentially in Title Layer

#### **Enhanced Title Layer Positioning**

- **Position object support** added to Title Layer:
  ```json5
  "position": {
    "x": 0.8,        // relative position (0-1) for Title Layer
    "y": 0.1,        // relative position (0-1) for Title Layer
    "originX": "right", // left, center, right for Title Layer
    "originY": "top"    // top, center, bottom for Title Layer
  }
  ```
- **Position strings** continue to be supported for Title Layer:
  ```json5
  "position": "center" // center, top, bottom, top-left, top-right, center-left, center-right, bottom-left, bottom-right
  ```

#### **Smart Zoom Deactivation for Title Layer**

- **Zoom effects are automatically disabled** for Title Layer with:
  - `"word-by-word"` style
  - `"letter-by-letter"` style
- **Zoom effects remain active** for Title Layer with:
  - `"fade-in"` style
  - Default Title Layer (no style specified)

### 🎯 Usage Examples

#### **Simple Title Layer Usage**

```json5
{
  type: "title",
  text: "My Title",
  style: "word-by-word",
  position: "center",
}
```

#### **Advanced Title Layer Usage**

```json5
{
  type: "title",
  text: "My Title",
  style: "letter-by-letter",
  position: {
    x: 0.8,
    y: 0.1,
    originX: "right",
    originY: "top",
  },
  fontSize: 60,
  textColor: "#FFFFFF",
}
```

#### **Video Layer with Position Object**

```json5
{
  type: "video",
  path: "video.mp4",
  width: 0.5,
  height: 0.5,
  position: {
    x: 0.75,
    y: 0.25,
    originX: "right",
    originY: "top",
  },
  resizeMode: "contain",
}
```

#### **Video Layer with String Position**

```json5
{
  type: "video",
  path: "video.mp4",
  width: 0.4,
  height: 0.4,
  position: "bottom-right",
  resizeMode: "cover",
}
```

#### **Unified Video Layer Positioning**

- **Position object support** added to Video Layer (same as Title Layer):
  ```json5
  "position": {
    "x": 0.8,        // relative position (0-1) for Video Layer
    "y": 0.1,        // relative position (0-1) for Video Layer
    "originX": "right", // left, center, right for Video Layer
    "originY": "top"    // top, center, bottom for Video Layer
  }
  ```
- **Position strings** now supported for Video Layer:
  ```json5
  "position": "center" // center, top, bottom, top-left, top-right, center-left, center-right, bottom-left, bottom-right
  ```
- **Legacy positioning** still supported for Video Layer:
  ```json5
  "left": 0.5,      // deprecated - use position instead
  "top": 0.3,       // deprecated - use position instead
  "originX": "left", // deprecated - use position instead
  "originY": "top"   // deprecated - use position instead
  ```

### 📋 Compatibility

- **Backward compatible** - existing Title Layer and Video Layer configurations continue to work
- **Default behavior** unchanged for Title Layer and Video Layer without style/position
- **All existing parameters** still supported for Title Layer and Video Layer
- **New parameters** optional with sensible defaults for Title Layer and Video Layer
- **Legacy Video Layer positioning** marked as deprecated but fully functional

---

**Developed by:** AI Assistant  
**Tested with:** Node.js v22.18.0, FFmpeg 7.1.1  
**Status:** ✅ Fully implemented and tested
