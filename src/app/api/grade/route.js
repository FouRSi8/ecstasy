import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const DEFAULT_GRADE = {
  category: "General",
  exposure: 0,
  contrast: 100,
  saturation: 100,
  temperature: 0,
  tint: 0,
  highlights: 0,
  shadows: 0,
  vibrance: 0,
  // HSL adjustments
  redHue: 0,
  redSat: 0,
  orangeHue: 0,
  orangeSat: 0,
  greenHue: 0,
  greenSat: 0,
  blueHue: 0,
  blueSat: 0,
  // Curves (control points as offsets from linear)
  curveShadows: 0,
  curveMidtones: 0,
  curveHighlights: 0,
  // Cinematic Look
  cinematicGrade: 100,
  cinematicStyle: "neutral",
};

function parseGradeJson(text) {
  try {
    const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/;
    const match = text.match(jsonBlockRegex);
    let jsonString = match ? match[1] : text;

    if (!match) {
      const start = jsonString.indexOf("{");
      const end = jsonString.lastIndexOf("}");
      if (start !== -1 && end !== -1) {
        jsonString = jsonString.slice(start, end + 1);
      }
    }

    const parsed = JSON.parse(jsonString);
    const n = {};
    for (const key in parsed) {
      n[key] = parsed[key];
    }

    // New format leverages dynamicStyles, fallback to single format if not present
    if (n.dynamicStyles) {
      return {
        category: String(n.category || "General"),
        dynamicStyles: n.dynamicStyles,
        cinematicGrade: n.cinematicGrade !== undefined ? Number(n.cinematicGrade) : 100,
        cinematicStyle: "neutral" // Default style
      }
    }

    // Legacy fallback mapping
    return {
      category: String(n.category || "General"),
      exposure: Number(n.exposure) || 0,
      contrast: Number(n.contrast) || 100,
      saturation: Number(n.saturation) || 100,
      temperature: Number(n.temperature) || 0,
      tint: Number(n.tint) || 0,
      highlights: Number(n.highlights) || 0,
      shadows: Number(n.shadows) || 0,
      vibrance: Number(n.vibrance) || 0,
      redHue: Number(n.redhue) || 0,
      redSat: Number(n.redsat) || 0,
      orangeHue: Number(n.orangehue) || 0,
      orangeSat: Number(n.orangesat) || 0,
      greenHue: Number(n.greenhue) || 0,
      greenSat: Number(n.greensat) || 0,
      blueHue: Number(n.bluehue) || 0,
      blueSat: Number(n.bluesat) || 0,
      curveShadows: Number(n.curveshadows) || 0,
      curveMidtones: Number(n.curvemidtones) || 0,
      curveHighlights: Number(n.curvehighlights) || 0,
      cinematicGrade: n.cinematicgrade !== undefined ? Number(n.cinematicgrade) : 100,
      cinematicStyle: String(n.cinematicstyle || "neutral").toLowerCase(),
      dynamicPalettes: n.dynamicpalettes || null,
    };
  } catch (e) {
    console.error("JSON Parse Error:", e);
    return DEFAULT_GRADE;
  }
}

function extractBase64(dataUrl) {
  return dataUrl.split(",")[1] || dataUrl;
}

const SYSTEM_PROMPT = `You are an elite professional colorist. Analyze the image and provide a complete color grade.

## STEP 1: CLASSIFY THE IMAGE
Determine the category:
- **Landscape**: Nature, scenery, mountains, beaches, forests
- **Wildlife**: Animals, birds, insects in natural settings
- **Portrait**: Human subjects, faces, fashion
- **Automotive**: Cars, motorcycles, vehicles
- **Fashion**: Clothing, style, editorial photography
- **Product**: Studio shots, electronics, packaging
- **Cyberpunk**: Neon, futuristic, synthwave aesthetics
- **Film/Vintage**: Analog film look, retro aesthetics, polaroids
- **Architecture**: Buildings, interiors, structural design
- **Anime**: Japanese animation style, hand-drawn illustrations
- **Digital Art**: Computer-generated art, 3D renders, AI art, concept art
- **Urban**: Cityscapes, street photography
- **Food**: Culinary photography
- **Macro**: Extreme close-ups, textures
- **General**: Anything else

## STEP 2: APPLY CATEGORY-SPECIFIC GRADING

### YOUR MISSION:
Create a FINAL, PERFECT grade. You are a **Correctional Colorist**. The goal is to make the image look stunning and balanced, ready for social media or wallpaper use.
**CRITICAL AI CONSTRAINT**: You MUST evaluate the original image properties provided to you. If an image is already bright and colorful, you MUST NOT increase the saturation—you should maintain or slightly lower it (saturation <= 100) to preserve detail and prevent deep-frying the colors. You are enhancing, not destroying. Keep colors true to life, do not shift actual realistic subject colors.

### GRADING PHILOSOPHY BY CATEGORY:
- **Wildlife**: Extremely subtle, natural look. Think National Geographic. Contrast: 105-112. CRITICAL: Preserve natural colors of the animal. DO NOT over-saturate. DO NOT shift the animal's hue.
- **Landscape**: Cinematic but grounded. Contrast: 108-118. Enhance golden hour warmth naturally.
- **Portrait**: Skin-friendly. Soft contrast: 102-108. Protect skin tones.
- **Anime**: Vibrant but balanced. Contrast: 110-125. *DO NOT oversaturate if the original is already colorful.*
- **Digital Art**: Rich, vibrant colors. Contrast: 110-125. Deep blacks, punchy highlights. Think trending ArtStation quality. *DO NOT oversaturate if the original is already colorful.*
- **Urban**: Moody/cinematic. Contrast: 110-120. Often cooler temperature.
- **Food**: Warm and appetizing. Slight orange warmth.
- **Macro**: High detail. Moderate contrast: 105-115.

### BASIC CONTROLS (Scales):
- exposure: -100 to 100 (0=neutral)
- contrast: 0 to 200 (100=neutral). See category guidance above.
- saturation: 0 to 200 (100=neutral). **Only increase if the original image is dull/desaturated.**
- temperature: -100 to 100. Warm for golden hour, cool for moody.
- tint: -100 to 100
- highlights: -100 to 100. Recover blown highlights with negatives.
- shadows: -100 to 100. Lift shadows for detail.
- vibrance: -100 to 100. Boosts muted colors selectively.

### HSL ADJUSTMENTS (-50 to 50):
Fine-tune specific color ranges:
- redHue, redSat: Skin tones, sunsets
- orangeHue, orangeSat: Warmth, autumn leaves
- greenHue, greenSat: Foliage, nature
- blueHue, blueSat: Sky, water

### TONE CURVES (-30 to 30):
Control tonal response:
- curveShadows: Lift/crush dark tones
- curveMidtones: Overall brightness pivot
- curveHighlights: Clip/extend bright tones

### CINEMATIC STYLES MULTI-GENERATION (CRITICAL STEP):
You must output a \`dynamicStyles\` object containing three completely separate grading packages: \`neutral\`, \`warm\`, and \`cold\`.

CRITICAL INSTRUCTION ON WARM/COLD STYLES & SKIN TONES:
1. Do NOT use the global \`temperature\` or \`tint\` sliders to create the warmth or coldness! Keep \`temperature\` and \`tint\` relatively close to 0 (or balanced to the original image) across all three styles. 
2. **PORTRAIT / HUMAN SKIN WARNING**: When creating a 'Warm' style for an image with humans in it, NEVER push \`orangeHue\` positive (e.g. +15). Positive orange hue shifts skin tones into yellow/green (jaundice). Keep \`orangeHue\` at 0 or slightly negative (reddish) to protect skin!
3. Rely heavily on the \`shadowColor\` and \`highlightColor\` split-toning palettes to inject the mood into the shadows and highlights intelligently.

- **Neutral**: Forcefully balance the image. Remove oversaturation or extreme color casts to make it perfectly natural.
- **Warm**: Apply Industry grade color correction to make the image change its tones entirely to warmth. Push orange/gold HSL (but protect skin hue), and provide a strong warm split-toning palette (\`shadowColor\` & \`highlightColor\`).
- **Cold**: Apply Industry grade color correction to make the image change its tones entirely to cold. Push cyan/navy HSL, and provide a strong icy split-toning palette (\`shadowColor\` & \`highlightColor\`).

For each style, provide exact RGB values for \`shadowColor\` and \`highlightColor\` that fit this specific image perfectly!

## STEP 3: OUTPUT
Provide brief reasoning, then output JSON in a code block. Output MUST match this structure:

\`\`\`json
{
  "category": "Landscape",
  "cinematicGrade": 100,
  "dynamicStyles": {
    "neutral": {
      "exposure": 5, "contrast": 115, "saturation": 100, "temperature": 0, "tint": 0,
      "highlights": -10, "shadows": 15, "vibrance": 5,
      "redHue": 0, "redSat": 0, "orangeHue": 0, "orangeSat": 0, "greenHue": 0, "greenSat": 0, "blueHue": 0, "blueSat": 0,
      "curveShadows": 5, "curveMidtones": 0, "curveHighlights": -5,
      "shadowColor": { "r": 10, "g": 80, "b": 100 }, "highlightColor": { "r": 255, "g": 200, "b": 150 }
    },
    "warm": {
      "exposure": 5, "contrast": 115, "saturation": 110, "temperature": 5, "tint": 0,
      "highlights": -10, "shadows": 15, "vibrance": 15,
      "redHue": 5, "redSat": 10, "orangeHue": 15, "orangeSat": 20, "greenHue": -5, "greenSat": 5, "blueHue": 0, "blueSat": -10,
      "curveShadows": 5, "curveMidtones": 0, "curveHighlights": -5,
      "shadowColor": { "r": 80, "g": 20, "b": 10 }, "highlightColor": { "r": 255, "g": 210, "b": 100 }
    },
    "cold": {
      "exposure": 2, "contrast": 120, "saturation": 95, "temperature": -5, "tint": 0,
      "highlights": -15, "shadows": 10, "vibrance": -5,
      "redHue": 0, "redSat": -15, "orangeHue": 0, "orangeSat": -20, "greenHue": 5, "greenSat": -10, "blueHue": -10, "blueSat": 25,
      "curveShadows": 10, "curveMidtones": -5, "curveHighlights": -5,
      "shadowColor": { "r": 5, "g": 20, "b": 120 }, "highlightColor": { "r": 180, "g": 220, "b": 230 }
    }
  }
}
\`\`\`
`;

export async function POST(req) {
  try {
    const body = await req.json();
    const { image, stats, reference, userApiKey, tier } = body;

    // Use user's API key if provided, otherwise fall back to env
    const apiKey = userApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "No API key available. Please add your Gemini API key in Settings." },
        { status: 401 }
      );
    }

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // Select model based on tier: pro users get gemini-2.5-pro
    const modelName = tier === "pro" ? "gemini-2.5-pro" : "gemini-2.5-flash";
    const model = genAI.getGenerativeModel({ model: modelName });

    const contentParts = [SYSTEM_PROMPT];

    if (reference) {
      contentParts.push("\n\nREFERENCE IMAGE (Match this style):");
      contentParts.push({
        inlineData: {
          data: extractBase64(reference),
          mimeType: "image/jpeg",
        },
      });
      contentParts.push("\n\nTARGET IMAGE (Apply grade to this):");
      if (stats) {
        contentParts.push(`\n\nORIGINAL IMAGE STATISTICS:
        - Base Saturation (0-1): ${stats.saturation?.toFixed(3)}
        - Base Contrast: ${stats.contrast?.toFixed(3)}
        - Base Luminance (0-255): ${stats.luminance?.toFixed(1)}
        *NOTE: If Base Saturation > 0.35, the image is ALREADY extremely saturated. Do NOT increase saturation > 100.*`);
      }
      contentParts.push(`\n\nCRITICAL INSTRUCTION FOR REFERENCE MATCHING: 
      A reference image has been provided! Your objective is to extract the cinematic color palette (especially shadow and highlight colors) from the REFERENCE image and logically apply them to the TARGET image.
      
      RULES FOR REFERENCE MATCHING:
      1. AVOID OVERSATURATION: Do not blindly crank up global saturation, temperature, or tint. This ruins the image.
      2. USE SPLIT TONING: Map the reference's dominant atmospheric colors primarily through 'shadowColor' and 'highlightColor', not harsh HSL shifts.
      3. PROTECT SKIN TONES: If the reference is heavily tinted (e.g., extremely orange or green), do not let it destroy human skin in the target image. Keep 'orangeHue' safe.
      4. Place your final matched grading values inside the "neutral" object in "dynamicStyles" (you can duplicate those exact same values into "warm" and "cold"). Ignore standard 'neutral/warm/cold' rules for this request and focus entirely on matching the reference.`);
    } else {
      contentParts.push("\n\nTARGET IMAGE (Grade this professionally):");
      if (stats) {
        contentParts.push(`\n\nORIGINAL IMAGE STATISTICS:
        - Base Saturation (0-1): ${stats.saturation?.toFixed(3)}
        - Base Contrast: ${stats.contrast?.toFixed(3)}
        - Base Luminance (0-255): ${stats.luminance?.toFixed(1)}
        *NOTE: If Base Saturation > 0.35, the image is ALREADY extremely saturated. Do NOT increase saturation > 100.*`);
      }
    }

    contentParts.push({
      inlineData: {
        data: extractBase64(image),
        mimeType: "image/jpeg",
      },
    });

    const result = await model.generateContent(contentParts);
    const response = await result.response;
    const text = response.text();

    const parsed = parseGradeJson(text);
    return NextResponse.json({ result: JSON.stringify(parsed) });
  } catch (error) {
    console.error("Grading error:", error);
    return NextResponse.json(
      {
        error: error.message,
        fallback: JSON.stringify(DEFAULT_GRADE),
      },
      { status: 503 }
    );
  }
}
