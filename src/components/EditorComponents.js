"use client";
import React, { useRef, useState, useCallback, useEffect } from "react";

// --- COMPONENT: CurvesEditor ---
export const CurvesEditor = ({ curves, onChange }) => {
  const svgRef = useRef(null);
  const [dragging, setDragging] = useState(null);

  const points = {
    shadows: curves.curveShadows || 0,
    midtones: curves.curveMidtones || 0,
    highlights: curves.curveHighlights || 0,
  };

  const handleMouseDown = (e, point) => {
    e.preventDefault();
    setDragging(point);
  };

  const handleMouseMove = useCallback(
    (e) => {
      if (!dragging || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const normalized = ((100 - (y / rect.height) * 200) / 100) * 30;
      const key = `curve${dragging.charAt(0).toUpperCase() + dragging.slice(1)}`;
      onChange(key, Math.max(-30, Math.min(30, Math.round(normalized))));
    },
    [dragging, onChange]
  );

  const handleMouseUp = useCallback(() => setDragging(null), []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  // Calculate control point positions
  const shadowX = 40, midX = 100, highX = 160;
  const shadowY = 160 - (points.shadows / 30) * 60;
  const midY = 100 - (points.midtones / 30) * 60;
  const highY = 40 - (points.highlights / 30) * 60;

  // Generate curve path
  const curvePath = `M 0,200 Q ${shadowX},${shadowY} ${midX},${midY} T ${highX},${highY} L 200,0`;

  return (
    <div className="curves-editor">
      <svg ref={svgRef} viewBox="0 0 200 200" className="curves-svg">
        {/* Grid */}
        <line x1="0" y1="100" x2="200" y2="100" stroke="#333" strokeWidth="1" />
        <line x1="100" y1="0" x2="100" y2="200" stroke="#333" strokeWidth="1" />
        {/* Diagonal reference */}
        <line x1="0" y1="200" x2="200" y2="0" stroke="#444" strokeWidth="1" strokeDasharray="4" />
        {/* Curve */}
        <path d={curvePath} fill="none" stroke="#fff" strokeWidth="2" />
        {/* Control points */}
        <circle cx={shadowX} cy={shadowY} r="8" fill="#fff" style={{ cursor: "ns-resize" }} onMouseDown={(e) => handleMouseDown(e, "shadows")} />
        <circle cx={midX} cy={midY} r="8" fill="#fff" style={{ cursor: "ns-resize" }} onMouseDown={(e) => handleMouseDown(e, "midtones")} />
        <circle cx={highX} cy={highY} r="8" fill="#fff" style={{ cursor: "ns-resize" }} onMouseDown={(e) => handleMouseDown(e, "highlights")} />
      </svg>
      <div className="curves-labels">
        <span>Shadows</span>
        <span>Midtones</span>
        <span>Highlights</span>
      </div>
    </div>
  );
};

// --- COMPONENT: HSLWheel (Polygonal Color Wheel) ---
export const HSLWheel = ({ values, onChange }) => {
  const svgRef = useRef(null);
  const [dragging, setDragging] = useState(null);

  const centerX = 100, centerY = 100, radius = 85;
  const segments = 24; // Number of color pie slices

  // Generate pie segment paths
  const generateSegments = () => {
    const paths = [];
    for (let i = 0; i < segments; i++) {
      const startAngle = (i * 360 / segments - 90) * (Math.PI / 180);
      const endAngle = ((i + 1) * 360 / segments - 90) * (Math.PI / 180);
      const x1 = centerX + Math.cos(startAngle) * radius;
      const y1 = centerY + Math.sin(startAngle) * radius;
      const x2 = centerX + Math.cos(endAngle) * radius;
      const y2 = centerY + Math.sin(endAngle) * radius;
      const hue = (i * 360 / segments);
      paths.push(
        <path
          key={i}
          d={`M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`}
          fill={`hsl(${hue}, 70%, 50%)`}
          stroke="rgba(0,0,0,0.3)"
          strokeWidth="0.5"
        />
      );
    }
    return paths;
  };

  // Color range markers positioned around the wheel
  const colorMarkers = [
    { key: "red", hue: 0, color: "#ff6b6b", label: "R" },
    { key: "orange", hue: 30, color: "#ffa94d", label: "O" },
    { key: "green", hue: 120, color: "#51cf66", label: "G" },
    { key: "blue", hue: 210, color: "#339af0", label: "B" },
  ];

  const getMarkerPos = (marker) => {
    const hueVal = values[`${marker.key}Hue`] || 0;
    const satVal = values[`${marker.key}Sat`] || 0;
    const angle = (marker.hue + hueVal - 90) * (Math.PI / 180);
    const dist = 45 + (satVal / 50) * 20; // Inner area, expands with saturation
    return {
      x: centerX + Math.cos(angle) * dist,
      y: centerY + Math.sin(angle) * dist,
    };
  };

  const handleMouseDown = (e, key) => {
    e.preventDefault();
    setDragging(key);
  };

  const handleMouseMove = useCallback(
    (e) => {
      if (!dragging || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const scale = 200 / rect.width;
      const x = (e.clientX - rect.left) * scale - centerX;
      const y = (e.clientY - rect.top) * scale - centerY;
      
      const angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
      const marker = colorMarkers.find((m) => m.key === dragging);
      if (marker) {
        let hueAdj = angle - marker.hue;
        // Normalize to -180 to 180
        while (hueAdj > 180) hueAdj -= 360;
        while (hueAdj < -180) hueAdj += 360;
        onChange(`${dragging}Hue`, Math.max(-50, Math.min(50, Math.round(hueAdj))));
        
        const dist = Math.sqrt(x * x + y * y);
        const satAdj = Math.round(((dist - 45) / 20) * 50);
        onChange(`${dragging}Sat`, Math.max(-50, Math.min(50, satAdj)));
      }
    },
    [dragging, onChange]
  );

  const handleMouseUp = useCallback(() => setDragging(null), []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  return (
    <div className="hsl-polygon-wheel">
      <svg ref={svgRef} viewBox="0 0 200 200" className="polygon-svg">
        {/* Outer ring of color segments */}
        <g className="wheel-segments">{generateSegments()}</g>
        {/* Inner dark circle */}
        <circle cx={centerX} cy={centerY} r="40" fill="#1a1a2e" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        {/* Draggable color markers */}
        {colorMarkers.map((marker) => {
          const pos = getMarkerPos(marker);
          return (
            <g key={marker.key} style={{ cursor: "pointer" }} onMouseDown={(e) => handleMouseDown(e, marker.key)}>
              <circle cx={pos.x} cy={pos.y} r="10" fill={marker.color} stroke="#fff" strokeWidth="2" />
              <text x={pos.x} y={pos.y + 4} textAnchor="middle" fill="#000" fontSize="9" fontWeight="bold" pointerEvents="none">
                {marker.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="hsl-readout">
        {colorMarkers.map((m) => (
          <div key={m.key} className="readout-item">
            <span className="readout-label" style={{ color: m.color }}>{m.label}</span>
            <span className="readout-val">H:{values[`${m.key}Hue`] || 0}</span>
            <span className="readout-val">S:{values[`${m.key}Sat`] || 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- COMPONENT: CompareSlider ---
export const CompareSlider = ({ image, processedImage }) => {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef(null);
  const handleMove = useCallback((e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = (x / rect.width) * 100;
    setSliderPos(percent);
  }, []);
  const handleMouseUp = useCallback(() => {
    window.removeEventListener("mousemove", handleMove);
    window.removeEventListener("mouseup", handleMouseUp);
    window.removeEventListener("touchmove", handleMove, { passive: false });
    window.removeEventListener("touchend", handleMouseUp);
  }, [handleMove]);
  const handleMouseDown = useCallback(
    (e) => {
      e.preventDefault();
      handleMove(e);
      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleMove, { passive: false });
      window.addEventListener("touchend", handleMouseUp);
    },
    [handleMove, handleMouseUp]
  );
  return (
    <div
      className="compare-grid"
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
    >
      {/* 1. Ghost Image for sizing */}
      <img src={image} className="ghost-img" alt="" aria-hidden />
      {/* 2. After Layer (processed, bottom) */}
      <div className="grid-layer after-layer">
        {processedImage && (
          <img src={processedImage} className="render-img" alt="After" />
        )}
      </div>
      {/* 3. Before Layer (original, top, clipped) */}
      <div
        className="grid-layer before-layer"
        style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
      >
        <img src={image} className="render-img" alt="Before" />
      </div>
      {/* 4. Handle */}
      <div
        className="grid-layer slider-handle-container"
        style={{ left: `${sliderPos}%` }}
      >
        <div className="slider-line"></div>
        <div className="slider-button">↔</div>
      </div>
    </div>
  );
};

export const ControlSlider = ({ label, value, min, max, onChange }) => (
  <div className="control-group">
    <label>
      <span>{label}</span>
      <span className="value">{value.toFixed(0)}</span>
    </label>
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
    />
  </div>
);
