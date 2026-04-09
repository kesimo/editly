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
    zoomDirection = null,
    zoomAmount = 0.1,
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
            left: left + translationParams.x,
            top: top + translationParams.y,
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
            left: left + translationParams.x,
            top: top + translationParams.y,
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
  translationParams: { x: number; y: number };
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
    left: left + translationParams.x,
    top: top + translationParams.y,
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
  translationParams: { x: number; y: number };
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
    left: left + translationParams.x,
    top: top + translationParams.y,
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
  const wordDelay = 0.15; // Faster to reduce visible shifting

  // Determine text alignment based on position
  let textAlign: "left" | "center" | "right" = "center";
  if (originX === "left") textAlign = "left";
  else if (originX === "right") textAlign = "right";

  // Precompute final wrapped lines using the full text so that words never jump
  const layoutBox = new Textbox(text, {
    fill: textColor,
    fontFamily,
    fontSize,
    textAlign,
    width: width * 0.8,
  });

  const textLines = (layoutBox as unknown as { textLines?: string[]; _textLines?: string[] })
    .textLines ||
    (layoutBox as unknown as { _textLines?: string[] })._textLines || [text];

  const wordsPerLine: string[][] = textLines.map((line) =>
    line
      .split(/\s+/)
      .map((w) => w.trim())
      .filter((w) => w.length > 0),
  );

  const totalWords = wordsPerLine.reduce((sum, lineWords) => sum + lineWords.length, 0);
  if (totalWords === 0) return;

  const totalDuration = totalWords * wordDelay;

  // Base index of fully visible words
  const visibleWordsBase = Math.floor((progress * totalDuration) / wordDelay);
  const clampedVisibleWords = Math.min(visibleWordsBase + 1, totalWords);

  // Build visible text line-by-line using the final layout
  const visibleLines: string[] = [];
  let remaining = clampedVisibleWords;

  for (let lineIndex = 0; lineIndex < wordsPerLine.length; lineIndex++) {
    const lineWords = wordsPerLine[lineIndex];
    if (remaining <= 0) {
      visibleLines.push("");
      continue;
    }

    const take = Math.min(remaining, lineWords.length);
    const shownWords = lineWords.slice(0, take);
    visibleLines.push(shownWords.join(" "));
    remaining -= take;
  }

  const visibleText = visibleLines.join("\n");

  if (visibleText.trim()) {
    const currentWordProgress =
      (progress * totalDuration - visibleWordsBase * wordDelay) / wordDelay;

    // Once animation is mostly complete, always use opacity 1
    let opacity: number;
    if (progress >= 0.7) {
      opacity = 1;
    } else {
      opacity =
        visibleWordsBase < totalWords - 1 ? 1 : Math.min(Math.max(currentWordProgress, 0), 1);
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
  const letterDelay = 0.05; // Faster to reduce visible shifting

  // Determine text alignment based on position
  let textAlign: "left" | "center" | "right" = "center";
  if (originX === "left") textAlign = "left";
  else if (originX === "right") textAlign = "right";

  // Precompute final wrapped lines using the full text so that letters never jump
  const layoutBox = new Textbox(text, {
    fill: textColor,
    fontFamily,
    fontSize,
    textAlign,
    width: width * 0.8,
  });

  const textLines = (layoutBox as unknown as { textLines?: string[]; _textLines?: string[] })
    .textLines ||
    (layoutBox as unknown as { _textLines?: string[] })._textLines || [text];

  const charsPerLine: string[][] = textLines.map((line) => line.split(""));

  const totalLetters = charsPerLine.reduce((sum, lineChars) => sum + lineChars.length, 0);
  if (totalLetters === 0) return;

  const totalDuration = totalLetters * letterDelay;

  // Base index of fully visible letters
  const visibleLettersBase = Math.floor((progress * totalDuration) / letterDelay);
  const clampedVisibleLetters = Math.min(visibleLettersBase + 1, totalLetters);

  // Build visible text line-by-line using the final layout
  const visibleLines: string[] = [];
  let remaining = clampedVisibleLetters;

  for (let lineIndex = 0; lineIndex < charsPerLine.length; lineIndex++) {
    const lineChars = charsPerLine[lineIndex];
    if (remaining <= 0) {
      visibleLines.push("");
      continue;
    }

    const take = Math.min(remaining, lineChars.length);
    const shownChars = lineChars.slice(0, take);
    visibleLines.push(shownChars.join(""));
    remaining -= take;
  }

  const visibleText = visibleLines.join("\n");

  if (visibleText.trim()) {
    const currentLetterProgress =
      (progress * totalDuration - visibleLettersBase * letterDelay) / letterDelay;

    // Once animation is mostly complete, always use opacity 1
    let opacity: number;
    if (progress >= 0.7) {
      opacity = 1;
    } else {
      opacity =
        visibleLettersBase < totalLetters - 1 ? 1 : Math.min(Math.max(currentLetterProgress, 0), 1);
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
