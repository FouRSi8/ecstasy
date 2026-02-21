"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { useEcstasy } from "../../context/EcstasyContext";
import {
  CurvesEditor,
  HSLWheel,
  CompareSlider,
  ControlSlider
} from "../../components/EditorComponents";
import { applyColorGrading } from "../../hooks/useImageFilter";
import { setCrossOriginIfNeeded } from "../../utils/colorUtils";

// --- COMPONENT: ExportSplitButton ---
const ExportSplitButton = ({ onExport }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  if (!isOpen) {
    return (
      <button
        className="export-btn"
        onClick={() => setIsOpen(true)}
        style={{ width: '100px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
      >
        Export
      </button>
    );
  }

  return (
    <div style={{ display: 'flex', width: '100px' }}>
      <button
        className="export-btn"
        onClick={() => { onExport('image/jpeg'); }}
        style={{ flex: 1, padding: '10px 0', borderTopRightRadius: 0, borderBottomRightRadius: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '11px' }}
      >
        JPG
      </button>
      <button
        className="export-btn"
        onClick={() => { onExport('image/png'); }}
        style={{ flex: 1, padding: '10px 0', borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderLeft: '1px solid rgba(255,255,255,0.2)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '11px' }}
      >
        PNG
      </button>
    </div>
  );
};

export default function EditorPage() {
  const router = useRouter();
  const {
    image,
    previewImage,
    reference,
    processedImageUrl,
    fileName,
    category,
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
    cinematicGrade, setCinematicGrade,
    cinematicStyle, setCinematicStyle,
    dynamicPalettes,
    resetAdjustments,
    undo, redo, canUndo, canRedo
  } = useEcstasy();

  const [toastOpacity, setToastOpacity] = React.useState(0);
  const [toastVisible, setToastVisible] = React.useState(false);

  React.useEffect(() => {
    if (image) {
      setToastVisible(true);
      const showTimer = setTimeout(() => setToastOpacity(1), 50);
      const fadeTimer = setTimeout(() => setToastOpacity(0), 3500);
      const removeTimer = setTimeout(() => setToastVisible(false), 4000);
      return () => {
        clearTimeout(showTimer);
        clearTimeout(fadeTimer);
        clearTimeout(removeTimer);
      };
    }
  }, [image]);

  React.useEffect(() => {
    if (reference && activePanel === "cinematic") {
      setActivePanel("basic");
    }
  }, [reference, activePanel, setActivePanel]);

  const handleExport = (format = "image/jpeg") => {
    if (!image) return;

    // We process the full resolution image right before export
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

        // Grab current context state for settings object
        const currentSettings = {
          exposure, contrast, highlights, shadows,
          temperature, tint, vibrance, saturation,
          redHue, redSat, orangeHue, orangeSat,
          greenHue, greenSat, blueHue, blueSat,
          curveShadows, curveMidtones, curveHighlights,
          cinematicGrade, cinematicStyle,
          dynamicPalettes: dynamicPalettes ? {
            warm: { shadowColor: dynamicPalettes.warm?.shadowColor, highlightColor: dynamicPalettes.warm?.highlightColor },
            neutral: { shadowColor: dynamicPalettes.neutral?.shadowColor, highlightColor: dynamicPalettes.neutral?.highlightColor },
            cold: { shadowColor: dynamicPalettes.cold?.shadowColor, highlightColor: dynamicPalettes.cold?.highlightColor }
          } : null
        };

        applyColorGrading(imageData.data, currentSettings);
        ctx.putImageData(imageData, 0, 0);

        // Export as requested format (JPG or PNG)
        const ext = format === "image/png" ? "png" : "jpg";
        const fullResUrl = canvas.toDataURL(format, format === "image/jpeg" ? 0.95 : undefined);
        const link = document.createElement("a");
        link.href = fullResUrl;
        link.download = `ecstasy-grade-${fileName ? fileName.split('.')[0] : "image"}.${ext}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        console.error("Export Failed:", err);
        // Fallback to preview if full res fails (e.g. strict CORS on canvas)
        if (processedImageUrl) {
          const ext = format === "image/png" ? "png" : "jpg";
          const link = document.createElement("a");
          link.href = processedImageUrl;
          link.download = `ecstasy-preview-${fileName ? fileName.split('.')[0] : "image"}.${ext}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }
    };
  };

  // If no image, redirect back to upload (safety)
  if (!image) {
    if (typeof window !== "undefined") {
      router.replace("/upload");
    }
    return null;
  }

  return (
    <div className="app-container">
      <div className="editor-screen">
        <header className="editor-header">
          <div className="header-left">
            <h2>ECSTASY</h2>
            <span className="divider">|</span>
            <span className="file-name">{fileName}</span>
            {category && (
              <span
                className="category-badge"
                style={{
                  backgroundColor: "var(--accent-color, #6366f1)",
                  color: "var(--accent-text, #ffffff)"
                }}
                title="AI Detected Category"
              >
                {category}
              </span>
            )}
          </div>
          <div className="header-right">
            <button className="header-btn" onClick={() => router.push("/upload")}>
              ← Back
            </button>
            <button
              className="header-btn"
              onClick={undo}
              disabled={!canUndo}
              style={{ opacity: canUndo ? 1 : 0.4, cursor: canUndo ? "pointer" : "not-allowed" }}
            >
              ↩ Undo
            </button>
            <button
              className="header-btn"
              onClick={redo}
              disabled={!canRedo}
              style={{ opacity: canRedo ? 1 : 0.4, cursor: canRedo ? "pointer" : "not-allowed" }}
            >
              ↪ Redo
            </button>
            <button className="header-btn" onClick={resetAdjustments}>
              Reset
            </button>
            <ExportSplitButton onExport={handleExport} />
          </div>
        </header>

        {/* Toast Notification */}
        {toastVisible && (
          <div style={{
            position: 'fixed',
            bottom: '24px',
            left: '24px',
            background: 'rgba(0, 0, 0, 0.85)',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: '8px',
            zIndex: 1000,
            fontSize: '13px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            opacity: toastOpacity,
            transition: 'opacity 0.5s ease',
            pointerEvents: 'none',
            textAlign: 'center',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
          }}>
            Preview images are displayed at a lower resolution to optimize performance.
          </div>
        )}

        <div className="editor-content">
          <div className="image-viewport">
            <CompareSlider image={previewImage || image} processedImage={processedImageUrl} />
          </div>
          <div className="controls-panel">
            <div className="panel-tabs">
              <button
                className={`tab-btn ${activePanel === "basic" ? "active" : ""}`}
                onClick={() => setActivePanel("basic")}
              >
                Basic
              </button>
              <button
                className={`tab-btn ${activePanel === "hsl" ? "active" : ""}`}
                onClick={() => setActivePanel("hsl")}
              >
                HSL
              </button>
              <button
                className={`tab-btn ${activePanel === "curves" ? "active" : ""}`}
                onClick={() => setActivePanel("curves")}
              >
                Curves
              </button>
              {!reference && (
                <button
                  className={`tab-btn ${activePanel === "cinematic" ? "active" : ""}`}
                  onClick={() => setActivePanel("cinematic")}
                  style={{
                    color: activePanel === "cinematic" ? "var(--accent-color)" : "inherit"
                  }}
                >
                  Cinematic
                </button>
              )}
            </div>
            {activePanel === "basic" && (
              <div className="panel-section">
                <h3>Light</h3>
                <ControlSlider
                  label="Exposure"
                  value={exposure}
                  min={-100}
                  max={100}
                  onChange={setExposure}
                />
                <ControlSlider
                  label="Contrast"
                  value={contrast}
                  min={0}
                  max={200}
                  onChange={setContrast}
                />
                <ControlSlider
                  label="Highlights"
                  value={highlights}
                  min={-100}
                  max={100}
                  onChange={setHighlights}
                />
                <ControlSlider
                  label="Shadows"
                  value={shadows}
                  min={-100}
                  max={100}
                  onChange={setShadows}
                />
                <h3 style={{ marginTop: "20px" }}>Color</h3>
                <ControlSlider
                  label="Temperature"
                  value={temperature}
                  min={-100}
                  max={100}
                  onChange={setTemperature}
                />
                <ControlSlider
                  label="Tint"
                  value={tint}
                  min={-100}
                  max={100}
                  onChange={setTint}
                />
                <ControlSlider
                  label="Vibrance"
                  value={vibrance}
                  min={-100}
                  max={100}
                  onChange={setVibrance}
                />
                <ControlSlider
                  label="Saturation"
                  value={saturation}
                  min={0}
                  max={200}
                  onChange={setSaturation}
                />
              </div>
            )}
            {activePanel === "hsl" && (
              <div className="panel-section">
                <h3>Color Wheel</h3>
                <HSLWheel
                  values={{
                    redHue, redSat,
                    orangeHue, orangeSat,
                    greenHue, greenSat,
                    blueHue, blueSat,
                  }}
                  onChange={(key, val) => {
                    if (key === "redHue") setRedHue(val);
                    else if (key === "redSat") setRedSat(val);
                    else if (key === "orangeHue") setOrangeHue(val);
                    else if (key === "orangeSat") setOrangeSat(val);
                    else if (key === "greenHue") setGreenHue(val);
                    else if (key === "greenSat") setGreenSat(val);
                    else if (key === "blueHue") setBlueHue(val);
                    else if (key === "blueSat") setBlueSat(val);
                  }}
                />
              </div>
            )}
            {activePanel === "curves" && (
              <div className="panel-section">
                <h3>Tone Curve</h3>
                <CurvesEditor
                  curves={{
                    curveShadows, curveMidtones, curveHighlights,
                  }}
                  onChange={(key, val) => {
                    if (key === "curveShadows") setCurveShadows(val);
                    else if (key === "curveMidtones") setCurveMidtones(val);
                    else if (key === "curveHighlights") setCurveHighlights(val);
                  }}
                />
              </div>
            )}
            {activePanel === "cinematic" && (
              <div className="panel-section">
                <h3>Cinematic Grade</h3>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', marginTop: '16px' }}>
                  <button
                    onClick={() => setCinematicStyle('warm')}
                    style={{
                      flex: 1, padding: '8px 4px', fontSize: '11px', borderRadius: '6px', cursor: 'pointer',
                      background: cinematicStyle === 'warm' ? '#fff' : 'rgba(255,255,255,0.05)',
                      color: cinematicStyle === 'warm' ? '#000' : '#888',
                      border: '1px solid', borderColor: cinematicStyle === 'warm' ? '#ffb414' : 'transparent',
                      transition: 'all 0.2s ease', fontWeight: 600
                    }}>Warm</button>
                  <button
                    onClick={() => setCinematicStyle('neutral')}
                    style={{
                      flex: 1, padding: '8px 4px', fontSize: '11px', borderRadius: '6px', cursor: 'pointer',
                      background: cinematicStyle === 'neutral' ? '#fff' : 'rgba(255,255,255,0.05)',
                      color: cinematicStyle === 'neutral' ? '#000' : '#888',
                      border: '1px solid', borderColor: cinematicStyle === 'neutral' ? '#00e5ff' : 'transparent',
                      transition: 'all 0.2s ease', fontWeight: 600
                    }}>Neutral</button>
                  <button
                    onClick={() => setCinematicStyle('cold')}
                    style={{
                      flex: 1, padding: '8px 4px', fontSize: '11px', borderRadius: '6px', cursor: 'pointer',
                      background: cinematicStyle === 'cold' ? '#fff' : 'rgba(255,255,255,0.05)',
                      color: cinematicStyle === 'cold' ? '#000' : '#888',
                      border: '1px solid', borderColor: cinematicStyle === 'cold' ? '#2979ff' : 'transparent',
                      transition: 'all 0.2s ease', fontWeight: 600
                    }}>Cold</button>
                </div>

                <ControlSlider
                  label="Intensity"
                  value={cinematicGrade}
                  min={0}
                  max={100}
                  onChange={setCinematicGrade}
                />
                <p style={{
                  fontSize: '10px', color: 'var(--text-muted)', marginTop: '20px',
                  lineHeight: '1.4', fontStyle: 'italic', opacity: 0.8
                }}>
                  A true "Teal & Orange" split-tone process mapping cool cinematic hues into shadows and vibrant, punchy colors into highlights depending on the chosen look. Includes a gentle S-Curve contrast pass.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
