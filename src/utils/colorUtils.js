export const rgbToHsl = (r, g, b) => {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s;
  const l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return [h * 360, s, l];
};

export const hslToRgb = (h, s, l) => {
  h /= 360;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [r * 255, g * 255, b * 255];
};

export const setCrossOriginIfNeeded = (img, url) => {
  if (url?.startsWith("http://") || url?.startsWith("https://")) {
    img.crossOrigin = "anonymous";
  }
};

// --- CLIENT-SIDE COLOR ANALYSIS (no API, no quota) ---
export const analyzeImage = (url) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    setCrossOriginIfNeeded(img, url);
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const size = 128;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;
        const n = data.length / 4;
        let sumL = 0,
          sumR = 0,
          sumG = 0,
          sumB = 0,
          sumSat = 0,
          sumL2 = 0;
        const lums = [];
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const l = 0.299 * r + 0.587 * g + 0.114 * b;
          const [, s] = rgbToHsl(r, g, b);
          sumL += l;
          sumL2 += l * l;
          sumR += r;
          sumG += g;
          sumB += b;
          sumSat += s;
          lums.push(l);
        }
        const avgL = sumL / n;
        const stdL = Math.sqrt(Math.max(0, sumL2 / n - avgL * avgL));
        const avgR = sumR / n;
        const avgG = sumG / n;
        const avgB = sumB / n;
        lums.sort((a, b) => a - b);
        const p5 = lums[Math.floor(n * 0.05)] || 0;
        const p95 = lums[Math.floor(n * 0.95)] || 255;
        resolve({
          luminance: avgL,
          contrast: stdL / 64,
          temp: (avgR - avgB) / 255,
          saturation: sumSat / n,
          shadowLift: p5,
          highlightCrush: 255 - p95,
        });
      } catch (e) {
        reject(new Error("Image cannot be read (cross-origin or restricted)"));
      }
    };
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = url;
  });

const GRAYSCALE_SAT_THRESHOLD = 0.08;

export const computeGradeFromAnalysis = (input, reference = null) => {
  if (reference) {
    const isRefGrayscale = reference.saturation < GRAYSCALE_SAT_THRESHOLD;
    const dCont = (reference.contrast - input.contrast) * 60;
    const dLum = (reference.luminance - input.luminance) / 2.55;
    const exposureAdj = Math.round(dLum * 12);
    const exposure = Math.max(-50, Math.min(50, exposureAdj));

    return {
      exposure,
      contrast: Math.round(Math.max(50, Math.min(200, 100 + dCont))),
      saturation: isRefGrayscale
        ? 0
        : Math.round(
            Math.max(
              0,
              Math.min(
                200,
                100 + (reference.saturation - input.saturation) * 150
              )
            )
          ),
      temperature: isRefGrayscale
        ? 0
        : Math.round(
            Math.max(-100, Math.min(100, (reference.temp - input.temp) * 80))
          ),
      tint: 0,
      highlights: Math.round(
        Math.max(
          -100,
          Math.min(100, (reference.highlightCrush - input.highlightCrush) / 2.5)
        )
      ),
      shadows: Math.round(
        Math.max(
          -100,
          Math.min(100, (input.shadowLift - reference.shadowLift) / 2.5)
        )
      ),
    };
  }
  const exp = input.luminance < 90 ? 15 : input.luminance > 160 ? -10 : 5;
  const cont = input.contrast < 0.2 ? 130 : input.contrast > 0.4 ? 95 : 115;
  const sat = input.saturation < 0.2 ? 125 : input.saturation > 0.5 ? 95 : 115;
  const temp = input.temp < -0.05 ? 10 : input.temp > 0.05 ? -8 : 0;
  const high = input.highlightCrush > 80 ? -20 : 0;
  const shad = input.shadowLift < 40 ? 15 : 0;
  return {
    exposure: exp,
    contrast: cont,
    saturation: sat,
    temperature: temp,
    tint: 0,
    highlights: high,
    shadows: shad,
  };
};
