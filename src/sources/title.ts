import * as fabric from "fabric/node";
import { Textbox } from "fabric/node";
import { defineFrameSource } from "../api//index.js";
import type { OriginX, OriginY, TitleLayer } from "../types.js";
import {
  defaultFontFamily,
  getPositionProps,
  getTranslationParams,
  getZoomParams,
} from "../util.js";

interface EffectProperties {
  strokeWidth: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
}

/**
 * Maps outlineStyle and outlineWidth to concrete effect properties
 */
function getEffectProperties(
  outlineStyle: "outline" | "shadow" | "glow",
  outlineWidth: number,
  outlineColor?: string,
  textColor?: string,
): EffectProperties {
  if (outlineWidth === 0) {
    return { strokeWidth: 0 };
  }

  switch (outlineStyle) {
    case "outline":
      return {
        strokeWidth: outlineWidth,
      };

    case "shadow":
      return {
        strokeWidth: Math.min(outlineWidth, 2),
        shadowColor: outlineColor || "#000000",
        shadowBlur: outlineWidth * 1.5,
        shadowOffsetX: outlineWidth,
        shadowOffsetY: outlineWidth,
      };

    case "glow":
      return {
        strokeWidth: Math.min(outlineWidth, 1.5),
        shadowColor: outlineColor || textColor || "#ffffff",
        shadowBlur: outlineWidth * 3,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
      };

    default:
      return { strokeWidth: outlineWidth };
  }
}

/**
 * Renders text with 2-layer system: outline/effect layer below, fill layer on top
 * This ensures text remains fully visible regardless of outline width
 */
function renderTextWithEffect({
  text,
  textColor,
  fontFamily,
  fontSize,
  textAlign,
  width,
  canvas,
  left,
  top,
  originX,
  originY,
  scaleX,
  scaleY,
  opacity,
  outlineColor,
  outlineWidth,
  outlineStyle,
}: {
  text: string;
  textColor: string;
  fontFamily: string;
  fontSize: number;
  textAlign: "left" | "center" | "right";
  width: number;
  canvas: fabric.StaticCanvas;
  left: number;
  top: number;
  originX: OriginX;
  originY: OriginY;
  scaleX: number;
  scaleY: number;
  opacity: number;
  outlineColor?: string;
  outlineWidth: number;
  outlineStyle: "outline" | "shadow" | "glow";
}) {
  const effectProps = getEffectProperties(outlineStyle, outlineWidth, outlineColor, textColor);

  // Measure text height without stroke to derive a visual center, so that top/bottom
  // positions stay consistent regardless of outline width.
  const measureBox = new Textbox(text, {
    fill: textColor,
    fontFamily,
    fontSize,
    textAlign,
    width,
  });

  const textHeight = measureBox.height || 0;

  // Compute centerY based on requested originY from positioning logic
  let centerY = top;
  if (originY === "top") {
    centerY = top + textHeight / 2;
  } else if (originY === "bottom") {
    centerY = top - textHeight / 2;
  }

  // For rendering we always use originY = "center" to keep outline symmetric
  const renderOriginY: OriginY = "center";

  // Layer 1: Outline/stroke layer (rendered first, appears behind)
  if (outlineWidth > 0 && outlineColor) {
    const outlineBox = new Textbox(text, {
      fill: outlineColor,
      fontFamily,
      fontSize,
      textAlign,
      width,
      stroke: outlineColor,
      strokeWidth: effectProps.strokeWidth,
      strokeLineJoin: "round",
      shadow: effectProps.shadowColor
        ? new fabric.Shadow({
            color: effectProps.shadowColor,
            blur: effectProps.shadowBlur || 0,
            offsetX: effectProps.shadowOffsetX || 0,
            offsetY: effectProps.shadowOffsetY || 0,
          })
        : undefined,
    });

    const outlineImage = outlineBox.cloneAsImage({});
    outlineImage.set({
      originX,
      originY: renderOriginY,
      left,
      top: centerY,
      scaleX,
      scaleY,
      opacity,
    });
    canvas.add(outlineImage);
  }

  // Layer 2: Fill layer (rendered on top, text remains fully visible)
  const fillBox = new Textbox(text, {
    fill: textColor,
    fontFamily,
    fontSize,
    textAlign,
    width,
  });

  const fillImage = fillBox.cloneAsImage({});
  fillImage.set({
    originX,
    originY: renderOriginY,
    left,
    top: centerY,
    scaleX,
    scaleY,
    opacity,
  });
  canvas.add(fillImage);
}

export default defineFrameSource<TitleLayer>("title", async ({ width, height, params }) => {
  const {
    text,
    textColor = "#ffffff",
    fontFamily = defaultFontFamily,
    position = "center",
    zoomDirection = "in",
    zoomAmount = 0.2,
    fontSize,
    style,
    animationDuration,
    outlineColor,
    outlineWidth = 0,
    outlineStyle = "outline",
  } = params;
  const fontSizeAbs = fontSize ? Math.round(fontSize) : Math.round(Math.min(width, height) * 0.1);

  const { left, top, originX, originY } = getPositionProps({ position, width, height });

  return {
    async readNextFrame(progress, canvas, offsetTime) {
      // Disable zoom effects only for word-by-word and letter-by-letter styles
      const effectiveZoomDirection =
        style === "word-by-word" || style === "letter-by-letter" ? null : zoomDirection;
      const scaleFactor = getZoomParams({
        progress,
        zoomDirection: effectiveZoomDirection,
        zoomAmount,
      });
      const translationParams = getTranslationParams({
        progress,
        zoomDirection: effectiveZoomDirection,
        zoomAmount,
      });

      const timeSinceStart = typeof offsetTime === "number" ? offsetTime : progress;

      switch (style) {
        case "word-by-word": {
          const animationProgress =
            animationDuration && animationDuration > 0
              ? Math.min(Math.max(timeSinceStart / animationDuration, 0), 1)
              : progress;

          await renderWordByWord({
            text,
            textColor,
            fontFamily,
            fontSize: fontSizeAbs,
            progress: animationProgress,
            canvas,
            left: left + translationParams,
            top,
            originX,
            originY,
            scaleFactor,
            width,
            outlineColor,
            outlineWidth,
            outlineStyle,
          });
          break;
        }

        case "letter-by-letter": {
          const animationProgress =
            animationDuration && animationDuration > 0
              ? Math.min(Math.max(timeSinceStart / animationDuration, 0), 1)
              : progress;

          await renderLetterByLetter({
            text,
            textColor,
            fontFamily,
            fontSize: fontSizeAbs,
            progress: animationProgress,
            canvas,
            left: left + translationParams,
            top,
            originX,
            originY,
            scaleFactor,
            width,
            outlineColor,
            outlineWidth,
            outlineStyle,
          });
          break;
        }

        case "fade-in":
          await renderFadeIn({
            text,
            textColor,
            fontFamily,
            fontSize: fontSizeAbs,
            progress,
            canvas,
            left,
            top,
            originX,
            originY,
            scaleFactor,
            translationParams,
            outlineColor,
            outlineWidth,
            outlineStyle,
          });
          break;

        default:
          // No style - render static title with zoom effects
          await renderStaticTitle({
            text,
            textColor,
            fontFamily,
            fontSize: fontSizeAbs,
            progress,
            canvas,
            left,
            top,
            originX,
            originY,
            scaleFactor,
            translationParams,
            outlineColor,
            outlineWidth,
            outlineStyle,
          });
          break;
      }
    },
  };
});

async function renderStaticTitle({
  text,
  textColor,
  fontFamily,
  fontSize,
  canvas,
  left,
  top,
  originX,
  originY,
  scaleFactor,
  translationParams,
  outlineColor,
  outlineWidth,
  outlineStyle,
}: {
  text: string;
  textColor: string;
  fontFamily: string;
  fontSize: number;
  progress: number;
  canvas: fabric.StaticCanvas;
  left: number;
  top: number;
  originX: OriginX;
  originY: OriginY;
  scaleFactor: number;
  translationParams: number;
  outlineColor?: string;
  outlineWidth: number;
  outlineStyle: "outline" | "shadow" | "glow";
}) {
  // Determine text alignment based on position
  let textAlign: "left" | "center" | "right" = "center";
  if (originX === "left") textAlign = "left";
  else if (originX === "right") textAlign = "right";

  renderTextWithEffect({
    text,
    textColor,
    fontFamily,
    fontSize,
    textAlign,
    width: canvas.width * 0.8,
    canvas,
    left: left + translationParams,
    top: top + translationParams,
    originX,
    originY,
    scaleX: scaleFactor,
    scaleY: scaleFactor,
    opacity: 1,
    outlineColor,
    outlineWidth,
    outlineStyle,
  });
}

async function renderFadeIn({
  text,
  textColor,
  fontFamily,
  fontSize,
  progress,
  canvas,
  left,
  top,
  originX,
  originY,
  scaleFactor,
  translationParams,
  outlineColor,
  outlineWidth,
  outlineStyle,
}: {
  text: string;
  textColor: string;
  fontFamily: string;
  fontSize: number;
  progress: number;
  canvas: fabric.StaticCanvas;
  left: number;
  top: number;
  originX: OriginX;
  originY: OriginY;
  scaleFactor: number;
  translationParams: number;
  outlineColor?: string;
  outlineWidth: number;
  outlineStyle: "outline" | "shadow" | "glow";
}) {
  // Determine text alignment based on position
  let textAlign: "left" | "center" | "right" = "center";
  if (originX === "left") textAlign = "left";
  else if (originX === "right") textAlign = "right";

  // Fade in effect: opacity goes from 0 to 1 over the first 30% of the progress
  const fadeProgress = Math.min(progress / 0.3, 1);

  renderTextWithEffect({
    text,
    textColor,
    fontFamily,
    fontSize,
    textAlign,
    width: canvas.width * 0.8,
    canvas,
    left: left + translationParams,
    top: top + translationParams,
    originX,
    originY,
    scaleX: scaleFactor,
    scaleY: scaleFactor,
    opacity: fadeProgress,
    outlineColor,
    outlineWidth,
    outlineStyle,
  });
}

async function renderWordByWord({
  text,
  textColor,
  fontFamily,
  fontSize,
  progress,
  canvas,
  left,
  top,
  originX,
  originY,
  scaleFactor,
  width,
  outlineColor,
  outlineWidth,
  outlineStyle,
}: {
  text: string;
  textColor: string;
  fontFamily: string;
  fontSize: number;
  progress: number;
  canvas: fabric.StaticCanvas;
  left: number;
  top: number;
  originX: OriginX;
  originY: OriginY;
  scaleFactor: number;
  width: number;
  outlineColor?: string;
  outlineWidth: number;
  outlineStyle: "outline" | "shadow" | "glow";
}) {
  const words = text.split(/\s+/);
  const wordDelay = 0.15; // Faster to reduce visible shifting
  const totalDuration = words.length * wordDelay; // Remove end buffer completely

  // Determine text alignment based on position
  let textAlign: "left" | "center" | "right" = "center";
  if (originX === "left") textAlign = "left";
  else if (originX === "right") textAlign = "right";

  // Calculate which words should be visible
  const visibleWords = Math.floor((progress * totalDuration) / wordDelay);

  // Create text with only visible words, but maintain exact positioning
  const visibleText = words.slice(0, Math.min(visibleWords + 1, words.length)).join(" ");

  if (visibleText.trim()) {
    // Calculate opacity for the last word - completely different approach
    const currentWordProgress = (progress * totalDuration - visibleWords * wordDelay) / wordDelay;

    // Once animation is complete, always use opacity 1
    let opacity: number;
    if (progress >= 0.7) {
      // End animation even earlier
      opacity = 1;
    } else {
      opacity = visibleWords < words.length - 1 ? 1 : Math.min(Math.max(currentWordProgress, 0), 1);
    }

    renderTextWithEffect({
      text: visibleText,
      textColor,
      fontFamily,
      fontSize,
      textAlign,
      width: width * 0.8,
      canvas,
      left,
      top,
      originX,
      originY,
      scaleX: scaleFactor,
      scaleY: scaleFactor,
      opacity,
      outlineColor,
      outlineWidth,
      outlineStyle,
    });
  }
}

async function renderLetterByLetter({
  text,
  textColor,
  fontFamily,
  fontSize,
  progress,
  canvas,
  left,
  top,
  originX,
  originY,
  scaleFactor,
  width,
  outlineColor,
  outlineWidth,
  outlineStyle,
}: {
  text: string;
  textColor: string;
  fontFamily: string;
  fontSize: number;
  progress: number;
  canvas: fabric.StaticCanvas;
  left: number;
  top: number;
  originX: OriginX;
  originY: OriginY;
  scaleFactor: number;
  width: number;
  outlineColor?: string;
  outlineWidth: number;
  outlineStyle: "outline" | "shadow" | "glow";
}) {
  const letters = text.split("");
  const letterDelay = 0.05; // Faster to reduce visible shifting
  const totalDuration = letters.length * letterDelay; // Remove end buffer completely

  // Determine text alignment based on position
  let textAlign: "left" | "center" | "right" = "center";
  if (originX === "left") textAlign = "left";
  else if (originX === "right") textAlign = "right";

  // Calculate which letters should be visible
  const visibleLetters = Math.floor((progress * totalDuration) / letterDelay);

  // Create text with only visible letters
  const visibleText = letters.slice(0, Math.min(visibleLetters + 1, letters.length)).join("");

  if (visibleText.trim()) {
    // Calculate opacity for the last letter - completely different approach
    const currentLetterProgress =
      (progress * totalDuration - visibleLetters * letterDelay) / letterDelay;

    // Once animation is complete, always use opacity 1
    let opacity: number;
    if (progress >= 0.7) {
      // End animation even earlier
      opacity = 1;
    } else {
      opacity =
        visibleLetters < letters.length - 1 ? 1 : Math.min(Math.max(currentLetterProgress, 0), 1);
    }

    renderTextWithEffect({
      text: visibleText,
      textColor,
      fontFamily,
      fontSize,
      textAlign,
      width: width * 0.8,
      canvas,
      left,
      top,
      originX,
      originY,
      scaleX: scaleFactor,
      scaleY: scaleFactor,
      opacity,
      outlineColor,
      outlineWidth,
      outlineStyle,
    });
  }
}
