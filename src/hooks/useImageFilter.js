import { useState, useEffect } from "react";
import { rgbToHsl, hslToRgb, setCrossOriginIfNeeded } from "../utils/colorUtils";

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
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
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
          // Highlights adjustment
          const brightness = (r + g + b) / 3;
          if (brightness > 128) {
            const highlightFactor =
              1 + (settings.highlights / 100) * ((brightness - 128) / 127);
            r *= highlightFactor;
            g *= highlightFactor;
            b *= highlightFactor;
          }
          // Shadows adjustment
          if (brightness < 128) {
            const shadowFactor =
              1 + (settings.shadows / 100) * (1 - brightness / 128);
            r *= shadowFactor;
            g *= shadowFactor;
            b *= shadowFactor;
          }
          // Tone Curves (simplified 3-point adjustment)
          const curveShadows = settings.curveShadows || 0;
          const curveMidtones = settings.curveMidtones || 0;
          const curveHighlights = settings.curveHighlights || 0;
          const applyToneCurve = (val) => {
            const norm = val / 255;
            let adj = 0;
            if (norm < 0.33) {
              adj = curveShadows * (1 - norm / 0.33);
            } else if (norm < 0.66) {
              adj = curveMidtones * (1 - Math.abs(norm - 0.5) / 0.16);
            } else {
              adj = curveHighlights * ((norm - 0.66) / 0.34);
            }
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
          // Convert back to RGB
          [r, g, b] = hslToRgb(h, s, l);
          // Clamp values
          data[i] = Math.max(0, Math.min(255, r));
          data[i + 1] = Math.max(0, Math.min(255, g));
          data[i + 2] = Math.max(0, Math.min(255, b));
        }
        ctx.putImageData(imageData, 0, 0);
        setProcessedImage(canvas.toDataURL());
      } catch {
        setProcessedImage(null);
      }
    };
  }, [image, settings]);
  return processedImage;
};
