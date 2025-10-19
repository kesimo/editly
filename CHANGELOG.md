# Changelog - Title Layer Animation Effects

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
