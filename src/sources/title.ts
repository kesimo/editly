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
  } = params;
  const fontSizeAbs = fontSize ? Math.round(fontSize) : Math.round(Math.min(width, height) * 0.1);

  const { left, top, originX, originY } = getPositionProps({ position, width, height });

  return {
    async readNextFrame(progress, canvas) {
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

      switch (style) {
        case "word-by-word":
          await renderWordByWord({
            text,
            textColor,
            fontFamily,
            fontSize: fontSizeAbs,
            progress,
            canvas,
            left: left + translationParams,
            top,
            originX,
            originY,
            scaleFactor,
            width,
          });
          break;

        case "letter-by-letter":
          await renderLetterByLetter({
            text,
            textColor,
            fontFamily,
            fontSize: fontSizeAbs,
            progress,
            canvas,
            left: left + translationParams,
            top,
            originX,
            originY,
            scaleFactor,
            width,
          });
          break;

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
}) {
  // Determine text alignment based on position
  let textAlign: "left" | "center" | "right" = "center";
  if (originX === "left") textAlign = "left";
  else if (originX === "right") textAlign = "right";

  const textBox = new Textbox(text, {
    fill: textColor,
    fontFamily,
    fontSize,
    textAlign: textAlign,
    width: canvas.width * 0.8,
  });

  const textImage = textBox.cloneAsImage({});

  // Static title - no fade effect, just zoom
  textImage.set({
    originX,
    originY,
    left: left + translationParams,
    top: top + translationParams,
    scaleX: scaleFactor,
    scaleY: scaleFactor,
    opacity: 1, // Always fully visible
  });

  canvas.add(textImage);
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
}) {
  // Determine text alignment based on position
  let textAlign: "left" | "center" | "right" = "center";
  if (originX === "left") textAlign = "left";
  else if (originX === "right") textAlign = "right";

  const textBox = new Textbox(text, {
    fill: textColor,
    fontFamily,
    fontSize,
    textAlign: textAlign,
    width: canvas.width * 0.8,
  });

  const textImage = textBox.cloneAsImage({});

  // Fade in effect: opacity goes from 0 to 1 over the first 30% of the progress
  const fadeProgress = Math.min(progress / 0.3, 1);

  textImage.set({
    originX,
    originY,
    left: left + translationParams,
    top: top + translationParams,
    scaleX: scaleFactor,
    scaleY: scaleFactor,
    opacity: fadeProgress,
  });

  canvas.add(textImage);
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
    const visibleTextBox = new Textbox(visibleText, {
      fill: textColor,
      fontFamily,
      fontSize,
      textAlign: textAlign,
      width: width * 0.8,
    });

    const visibleTextImage = visibleTextBox.cloneAsImage({});

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

    visibleTextImage.set({
      originX,
      originY,
      left,
      top,
      scaleX: scaleFactor,
      scaleY: scaleFactor,
      opacity: opacity,
    });

    canvas.add(visibleTextImage);
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
    const textBox = new Textbox(visibleText, {
      fill: textColor,
      fontFamily,
      fontSize,
      textAlign: textAlign,
      width: width * 0.8,
    });

    const textImage = textBox.cloneAsImage({});

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

    textImage.set({
      originX,
      originY,
      left,
      top,
      scaleX: scaleFactor,
      scaleY: scaleFactor,
      opacity: opacity,
    });

    canvas.add(textImage);
  }
}
