import { useState, useEffect } from "react";
import { rgbToHsl, hslToRgb, setCrossOriginIfNeeded } from "../utils/colorUtils";


export const applyColorGrading = (data, settings) => {
  // Apply color grading
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    // Exposure
    const expFactor = 1 + settings.exposure / 100;
    r *= expFactor;
    g *= expFactor;
    b *= expFactor;
    // Contrast
    const contrast = settings.contrast / 100;
    r = ((r / 255 - 0.5) * contrast + 0.5) * 255;
    g = ((g / 255 - 0.5) * contrast + 0.5) * 255;
    b = ((b / 255 - 0.5) * contrast + 0.5) * 255;
    // Temperature
    if (settings.temperature > 0) {
      r += settings.temperature * 1.5;
      b -= settings.temperature * 0.5;
    } else {
      r += settings.temperature * 0.5;
      b -= settings.temperature * 1.5;
    }
    // Tint
    if (settings.tint > 0) {
      g += settings.tint;
      r -= settings.tint * 0.3;
    } else {
      g += settings.tint;
      b -= settings.tint * 0.3;
    }
    // Smooth Highlights & Shadows adjustment
    const brightness = (r + g + b) / 3;
    const lumNorm = brightness / 255;
    const baseSmooth = (x) => x * x * (3 - 2 * x); // C1 continuous interpolation

    // Weight from 0 to 1 as it gets darker than mid-grey
    const shadowW = lumNorm < 0.5 ? baseSmooth(1 - (lumNorm / 0.5)) : 0;
    // Weight from 0 to 1 as it gets brighter than mid-grey
    const highW = lumNorm > 0.5 ? baseSmooth((lumNorm - 0.5) / 0.5) : 0;

    const shadowFactor = 1 + (settings.shadows / 100) * shadowW;
    const highlightFactor = 1 + (settings.highlights / 100) * highW;

    // Apply factors (they naturally don't overlap)
    r *= shadowFactor * highlightFactor;
    g *= shadowFactor * highlightFactor;
    b *= shadowFactor * highlightFactor;
    // Tone Curves (simplified 3-point adjustment)
    const curveShadows = settings.curveShadows || 0;
    const curveMidtones = settings.curveMidtones || 0;
    const curveHighlights = settings.curveHighlights || 0;
    const applyToneCurve = (val) => {
      const norm = val / 255;

      // Calculate continuous overlapping weights
      let shadowWeight = Math.max(0, 1 - (norm * 2));
      let midWeight = Math.max(0, 1 - Math.abs(norm - 0.5) * 2);
      let highWeight = Math.max(0, (norm - 0.5) * 2);

      // Apply smoothstep interpolation for perfectly smooth gradients (C1 continuous)
      const smooth = (x) => x * x * (3 - 2 * x);

      const adj = (curveShadows * smooth(shadowWeight)) +
        (curveMidtones * smooth(midWeight)) +
        (curveHighlights * smooth(highWeight));

      return Math.max(0, Math.min(255, val + adj * 2.55));
    };
    r = applyToneCurve(r);
    g = applyToneCurve(g);
    b = applyToneCurve(b);
    // Saturation
    const gray = 0.2989 * r + 0.587 * g + 0.114 * b;
    const satFactor = settings.saturation / 100;
    r = gray + (r - gray) * satFactor;
    g = gray + (g - gray) * satFactor;
    b = gray + (b - gray) * satFactor;
    // HSL Adjustments
    let [h, s, l] = rgbToHsl(r, g, b);
    let hueAdj = 0;
    let satAdj = 0;
    if (h <= 40 || h >= 320) {
      hueAdj = settings.redHue;
      satAdj = settings.redSat / 100;
    } else if (h > 40 && h <= 80) {
      hueAdj = settings.orangeHue;
      satAdj = settings.orangeSat / 100;
    } else if (h > 80 && h <= 160) {
      hueAdj = settings.greenHue;
      satAdj = settings.greenSat / 100;
    } else if (h > 200 && h <= 280) {
      hueAdj = settings.blueHue;
      satAdj = settings.blueSat / 100;
    }
    h += hueAdj;
    h = ((h % 360) + 360) % 360;
    s *= 1 + satAdj;
    s = Math.max(0, Math.min(1, s));
    // Vibrance (selective saturation)
    const vib = settings.vibrance / 100;
    s *= 1 + vib * (1 - s);
    s = Math.max(0, Math.min(1, s));
    // Convert back to RGB for Cinematic Grading
    [r, g, b] = hslToRgb(h, s, l);

    // Cinematic Grading (Split Toning & Contrast)
    if (settings.cinematicGrade > 0) {
      const intensity = settings.cinematicGrade / 100;
      const style = settings.cinematicStyle || 'neutral';

      // Define palettes based on style
      let shadowColor, highlightColor;
      if (style === 'warm') {
        shadowColor = { r: 60, g: 10, b: 50 }; // Magenta/deep purple shadows
        highlightColor = { r: 255, g: 210, b: 150 }; // Soft peachy/warm highlights
      } else if (style === 'cold') {
        shadowColor = { r: 5, g: 40, b: 90 }; // Deep cool blue shadows
        highlightColor = { r: 180, g: 220, b: 210 }; // Pale minty highlights
      } else { // neutral
        shadowColor = { r: 10, g: 80, b: 100 }; // Standard Teal
        highlightColor = { r: 255, g: 200, b: 150 }; // Soft Amber/Orange
      }

      // Calculate luminance for mapping
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      // Map shadows (lum < 128) and highlights (lum > 128), smoothing the transition
      let shadowWeight = Math.max(0, 1 - (lum / 128));
      let highlightWeight = Math.max(0, (lum - 128) / 127);

      // Smooth weights so extreme blacks/whites aren't utterly tinted
      shadowWeight = Math.pow(shadowWeight, 1.5) * intensity * 0.4;
      highlightWeight = Math.pow(highlightWeight, 1.5) * intensity * 0.4;

      // Interpolate colors into RGB
      r = r * (1 - shadowWeight) + shadowColor.r * shadowWeight;
      g = g * (1 - shadowWeight) + shadowColor.g * shadowWeight;
      b = b * (1 - shadowWeight) + shadowColor.b * shadowWeight;

      r = r * (1 - highlightWeight) + highlightColor.r * highlightWeight;
      g = g * (1 - highlightWeight) + highlightColor.g * highlightWeight;
      b = b * (1 - highlightWeight) + highlightColor.b * highlightWeight;

      // Cinematic Contrast S-Curve boost
      const contrastBoost = intensity * 0.15; // Max 15% extra contrast
      r = ((r / 255 - 0.5) * (1 + contrastBoost) + 0.5) * 255;
      g = ((g / 255 - 0.5) * (1 + contrastBoost) + 0.5) * 255;
      b = ((b / 255 - 0.5) * (1 + contrastBoost) + 0.5) * 255;
    }

    // Clamp values
    data[i] = Math.max(0, Math.min(255, r));
    data[i + 1] = Math.max(0, Math.min(255, g));
    data[i + 2] = Math.max(0, Math.min(255, b));
  }
};
export const useImageFilter = (image, settings) => {
  const [processedImage, setProcessedImage] = useState(null);

  useEffect(() => {
    if (!image) return;
    const img = new Image();
    setCrossOriginIfNeeded(img, image);
    img.src = image;
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        // --- DOWNSCALE FOR PREVIEW ---
        const MAX_DIMENSION = 1200;
        let width = img.width;
        let height = img.height;

        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        applyColorGrading(imageData.data, settings);

        ctx.putImageData(imageData, 0, 0);
        setProcessedImage(canvas.toDataURL());
      } catch {
        setProcessedImage(null);
      }
    };
  }, [image, settings]);
  return processedImage;
};
