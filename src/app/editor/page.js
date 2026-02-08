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

export default function EditorPage() {
  const router = useRouter();
  const {
    image,
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
    resetAdjustments
  } = useEcstasy();

  const handleExport = () => {
    if (!processedImageUrl) return;
    const link = document.createElement("a");
    link.href = processedImageUrl;
    link.download = `edited-${fileName || "image.jpg"}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
            {category && (() => {
              // Chameleon colors based on category
              const categoryColors = {
                Landscape: "#4ade80",
                Wildlife: "#facc15",
                Portrait: "#f472b6",
                Anime: "#a78bfa",
                Urban: "#64748b",
                Food: "#fb923c",
                Macro: "#22d3d1",
                General: "#6366f1",
                "Digital Art": "#ec4899",
              };
              const bgColor = categoryColors[category] || "#6366f1";
              // Calculate contrast text color
              const hex = bgColor.replace("#", "");
              const r = parseInt(hex.substr(0, 2), 16);
              const g = parseInt(hex.substr(2, 2), 16);
              const b = parseInt(hex.substr(4, 2), 16);
              const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
              const textColor = luminance > 0.5 ? "#000000" : "#ffffff";
              return (
                <span
                  className="category-badge"
                  style={{ backgroundColor: bgColor, color: textColor }}
                  title="AI Detected Category"
                >
                  {category}
                </span>
              );
            })()}
          </div>
          <div className="header-right">
            <button className="header-btn" onClick={() => router.push("/upload")}>
              ← Back
            </button>
            <button className="header-btn" onClick={resetAdjustments}>
              Reset
            </button>
            <button className="export-btn" onClick={handleExport}>
              Export
            </button>
          </div>
        </header>
        <div className="editor-content">
          <div className="image-viewport">
            <CompareSlider image={image} processedImage={processedImageUrl} />
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
          </div>
        </div>
      </div>
    </div>
  );
}
