"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { useImageFilter } from "../hooks/useImageFilter";
import { analyzeImage, computeGradeFromAnalysis, setCrossOriginIfNeeded } from "../utils/colorUtils";

const EcstasyContext = createContext();

export const EcstasyProvider = ({ children }) => {
  // --- STATE ---
  const [image, setImage] = useState(null);
  const [reference, setReference] = useState(null);
  const [fileName, setFileName] = useState("New Project");
  const [activePanel, setActivePanel] = useState("basic");
  
  // Basic Controls State
  const [exposure, setExposure] = useState(0);
  const [contrast, setContrast] = useState(100);
  const [highlights, setHighlights] = useState(0);
  const [shadows, setShadows] = useState(0);
  const [temperature, setTemperature] = useState(0);
  const [tint, setTint] = useState(0);
  const [vibrance, setVibrance] = useState(0);
  const [saturation, setSaturation] = useState(100);
  
  // HSL State
  const [redHue, setRedHue] = useState(0);
  const [redSat, setRedSat] = useState(0);
  const [orangeHue, setOrangeHue] = useState(0);
  const [orangeSat, setOrangeSat] = useState(0);
  const [greenHue, setGreenHue] = useState(0);
  const [greenSat, setGreenSat] = useState(0);
  const [blueHue, setBlueHue] = useState(0);
  const [blueSat, setBlueSat] = useState(0);
  
  // Curves State
  const [curveShadows, setCurveShadows] = useState(0);
  const [curveMidtones, setCurveMidtones] = useState(0);
  const [curveHighlights, setCurveHighlights] = useState(0);
  
  // AI Category & Processing
  const [category, setCategory] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState("Ready");

  // Auth & Usage State
  const [hasLaunched, setHasLaunched] = useState(false);
  const [userApiKey, setUserApiKey] = useState("");
  const [tier, setTier] = useState("free");
  const [usageCount, setUsageCount] = useState(0);

  // --- STORAGE EFFECTS ---
  useEffect(() => {
    if (typeof window !== "undefined") {
      const launched = localStorage.getItem("ecstasy_launched") === "true";
      const savedKey = localStorage.getItem("ecstasy_api_key") || "";
      const savedTier = localStorage.getItem("ecstasy_tier") || "free";
      const savedUsage = parseInt(localStorage.getItem("ecstasy_usage_count") || "0", 10);
      const lastDate = localStorage.getItem("ecstasy_usage_date");
      const today = new Date().toDateString();
      
      // Reset counter if it's a new day
      if (lastDate !== today) {
        localStorage.setItem("ecstasy_usage_date", today);
        localStorage.setItem("ecstasy_usage_count", "0");
        setUsageCount(0);
      } else {
        setUsageCount(savedUsage);
      }
      
      setUserApiKey(savedKey);
      setTier(savedTier);
      if (launched && savedKey) {
        setHasLaunched(true);
      }
    }
  }, []);

  // --- COLOR EXTRACTION EFFECT ---
  useEffect(() => {
    if (!image) return;
    const img = new Image();
    // Only set crossOrigin if it's not a blob/data URL
    if (!image.startsWith("data:") && !image.startsWith("blob:")) {
        img.crossOrigin = "anonymous";
    }
    
    img.onload = () => {
      // Default to White (Ambient)
      let r = 255, g = 255, b = 255;

      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        // Tiny size for maximum performance
        const size = 20; 
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);
        const imageData = ctx.getImageData(0, 0, size, size).data;
        
        // Simple Algorithm: Find the most saturated pixel
        let maxSat = -1;
        
        for (let i = 0; i < imageData.length; i += 4) {
          const cR = imageData[i];
          const cG = imageData[i + 1];
          const cB = imageData[i + 2];
          
          if (imageData[i+3] === 0) continue; // Skip transparency

          const max = Math.max(cR, cG, cB);
          const min = Math.min(cR, cG, cB);
          
          // Saturation approximation: interval constant (chroma)
          const saturation = max - min;
          
          // Preference for non-dark pixels (l > 20)
          const lightness = (max + min) / 2;
          
          if (lightness > 20 && saturation > maxSat) {
             maxSat = saturation;
             r = cR; g = cG; b = cB;
          }
        }
      } catch (e) {
        console.warn("Extraction failed, using default");
      }

      // --- AESTHETIC REFINEMENT ---
      // 1. Calculate HSL manually
      const rNorm = r / 255, gNorm = g / 255, bNorm = b / 255;
      const max = Math.max(rNorm, gNorm, bNorm), min = Math.min(rNorm, gNorm, bNorm);
      let h, s, l = (max + min) / 2;

      if (max === min) {
        h = s = 0; 
      } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
          case gNorm: h = (bNorm - rNorm) / d + 2; break;
          case bNorm: h = (rNorm - gNorm) / d + 4; break;
        }
        h /= 6;
      }
      
      // 2. Reduce Saturation (Elegance check)
      s = Math.max(0.4, Math.min(0.8, s * 0.7)); 

      // 3. Normalize Lightness (Visibility check)
      // Target range 0.6 - 0.8 for nice UI accent on dark bg
      l = Math.max(0.6, Math.min(0.8, l)); 

      // 4. Convert back to RGB
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      
      r = Math.round(hue2rgb(p, q, h + 1/3) * 255);
      g = Math.round(hue2rgb(p, q, h) * 255);
      b = Math.round(hue2rgb(p, q, h - 1/3) * 255);

      const color = `rgb(${r}, ${g}, ${b})`;
      const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      const textColor = lum > 0.6 ? "#000000" : "#ffffff";

      document.documentElement.style.setProperty("--accent-color", color);
      document.documentElement.style.setProperty("--accent-text", textColor);
      document.documentElement.style.setProperty(
        "--accent-glow",
        `rgba(${r}, ${g}, ${b}, 0.5)`
      );
    };

    img.src = image;

  }, [image]);

  // --- IMAGE PROCESSING HOOK ---
  const settings = {
    exposure, contrast, highlights, shadows,
    temperature, tint, vibrance, saturation,
    redHue, redSat, orangeHue, orangeSat,
    greenHue, greenSat, blueHue, blueSat,
    curveShadows, curveMidtones, curveHighlights
  };
  
  const processedImageUrl = useImageFilter(image, settings);

  // --- ACTIONS ---
  const resetAdjustments = () => {
    setExposure(0);
    setContrast(100);
    setHighlights(0);
    setShadows(0);
    setTemperature(0);
    setTint(0);
    setVibrance(0);
    setSaturation(100);
    setRedHue(0);
    setRedSat(0);
    setOrangeHue(0);
    setOrangeSat(0);
    setGreenHue(0);
    setGreenSat(0);
    setBlueHue(0);
    setBlueSat(0);
    setCurveShadows(0);
    setCurveMidtones(0);
    setCurveHighlights(0);
    setCategory(null);
  };

  const handleFileUpload = (file) => {
    if (file) {
      const url = URL.createObjectURL(file);
      setImage(url);
      setFileName(file.name);
      setStatus("Ready");
      resetAdjustments();
    }
  };
  
  const handleReferenceUpload = (file) => {
    if (file) {
      const url = URL.createObjectURL(file);
      setReference(url);
      setStatus("Reference added");
    }
  };

  const resizeImage = (url, maxSize = 512) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      setCrossOriginIfNeeded(img, url);
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxSize) {
              height *= maxSize / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width *= maxSize / height;
              height = maxSize;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.7));
        } catch (e) {
          reject(new Error("Image cannot be processed (cross-origin)"));
        }
      };
      img.onerror = () => reject(new Error("Could not load image"));
      img.src = url;
    });

  const handleAutoGrade = async () => {
    if (!image) return;
    
    // Check free tier usage limit
    if (tier === "free" && usageCount >= 20) {
      setStatus("Daily limit reached! Upgrade to Pro or wait until tomorrow.");
      return;
    }
    
    setIsProcessing(true);
    setStatus(
      reference ? "Analyzing reference & image..." : "AI analyzing image..."
    );
    
    const runLocal = async () => {
      const inputStats = await analyzeImage(image);
      const refStats = reference ? await analyzeImage(reference) : null;
      const settings = computeGradeFromAnalysis(inputStats, refStats);
      setExposure(settings.exposure);
      setContrast(settings.contrast);
      setSaturation(settings.saturation);
      setTemperature(settings.temperature);
      setTint(settings.tint);
      setHighlights(settings.highlights);
      setShadows(settings.shadows);
      setStatus(reference ? "Matched to reference" : "Graded");
    };

    try {
      if (reference) {
        await runLocal();
        setIsProcessing(false);
        return;
      }
      
      const imageBase64 = await resizeImage(image);
      const response = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          image: imageBase64,
          userApiKey: userApiKey || undefined,
          tier: tier,
        }),
      });
      
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.result) {
        const resultSettings = JSON.parse(data.result);
        setCategory(resultSettings.category || "General");
        
        setExposure(resultSettings.exposure ?? 0);
        setContrast(resultSettings.contrast ?? 100);
        setSaturation(resultSettings.saturation ?? 100);
        setTemperature(resultSettings.temperature ?? 0);
        setTint(resultSettings.tint ?? 0);
        setHighlights(resultSettings.highlights ?? 0);
        setShadows(resultSettings.shadows ?? 0);
        setVibrance(resultSettings.vibrance ?? 0);
        
        // HSL
        setRedHue(resultSettings.redHue ?? 0);
        setRedSat(resultSettings.redSat ?? 0);
        setOrangeHue(resultSettings.orangeHue ?? 0);
        setOrangeSat(resultSettings.orangeSat ?? 0);
        setGreenHue(resultSettings.greenHue ?? 0);
        setGreenSat(resultSettings.greenSat ?? 0);
        setBlueHue(resultSettings.blueHue ?? 0);
        setBlueSat(resultSettings.blueSat ?? 0);
        
        // Curves
        setCurveShadows(resultSettings.curveShadows ?? 0);
        setCurveMidtones(resultSettings.curveMidtones ?? 0);
        setCurveHighlights(resultSettings.curveHighlights ?? 0);
        
        setStatus("Graded");
        
        // Increment usage counter for free tier
        if (tier === "free") {
          const newCount = usageCount + 1;
          setUsageCount(newCount);
          if (typeof window !== "undefined") {
            localStorage.setItem("ecstasy_usage_count", String(newCount));
          }
        }
      } else {
        await runLocal();
      }
    } catch (e) {
      console.warn("Falling back to local analysis:", e.message);
      await runLocal();
    } finally {
      setIsProcessing(false);
    }
  };

  const value = {
    image, setImage,
    reference, setReference,
    fileName, setFileName,
    processedImageUrl,
    activePanel, setActivePanel,
    exposure, setExposure,
    contrast, setContrast,
    highlights, setHighlights,
    shadows, setShadows,
    temperature, setTemperature,
    tint, setTint,
    vibrance, setVibrance,
    saturation, setSaturation,
    redHue, setRedHue,
    redSat, setRedSat,
    orangeHue, setOrangeHue,
    orangeSat, setOrangeSat,
    greenHue, setGreenHue,
    greenSat, setGreenSat,
    blueHue, setBlueHue,
    blueSat, setBlueSat,
    curveShadows, setCurveShadows,
    curveMidtones, setCurveMidtones,
    curveHighlights, setCurveHighlights,
    category, setCategory,
    isProcessing, setIsProcessing,
    status, setStatus,
    hasLaunched, setHasLaunched,
    userApiKey, setUserApiKey,
    tier, setTier,
    usageCount, setUsageCount,
    resetAdjustments,
    handleFileUpload,
    handleReferenceUpload,
    handleAutoGrade
  };

  return (
    <EcstasyContext.Provider value={value}>
      {children}
    </EcstasyContext.Provider>
  );
};

export const useEcstasy = () => useContext(EcstasyContext);
