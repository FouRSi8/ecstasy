"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { useEcstasy } from "../../context/EcstasyContext";

export default function UploadPage() {
  const { 
    image, 
    handleFileUpload, 
    reference,
    handleReferenceUpload,
    handleAutoGrade,
    isProcessing,
    status,
    tier,
    usageCount,
    setHasLaunched
  } = useEcstasy();
  
  const router = useRouter();

  const onFileUpload = (e) => {
    handleFileUpload(e.target.files[0]);
  };
  
  const onReferenceUpload = (e) => {
    handleReferenceUpload(e.target.files[0]);
  };
  
  const triggerFileInput = () => document.getElementById("hidden-input").click();
  const triggerReferenceInput = () => document.getElementById("hidden-reference-input").click();

  const handleStartGrading = async () => {
    await handleAutoGrade();
    router.push("/editor");
  };

  const handleChangeKey = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("ecstasy_launched");
    }
    setHasLaunched(false);
    router.push("/landing");
  };

  // Flash effect state
  const [flash, setFlash] = React.useState(false);

  React.useEffect(() => {
    if (image) {
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 4000); // Slow fade out (4s)
      return () => clearTimeout(timer);
    }
  }, [image]);

  const buttonStyle = {
      backgroundColor: "var(--accent-color)", 
      color: "var(--accent-text)",
      fontWeight: "700"
  };

  return (
    <div className="app-container">
      <div className="upload-screen">
        <div className="brand">
          <h1>
            <span className="tilted-e">e</span>cstasy
          </h1>
          <p>Professional AI Color Grading</p>
          <div className="brand-meta">
            {tier === "free" && (
              <span 
                  className="usage-indicator"
                  style={buttonStyle}
              >
                  {usageCount}/20 today
              </span>
            )}
            <button 
              className="change-key-btn"
              onClick={handleChangeKey}
            >
              Change API Key
            </button>
          </div>
        </div>
        <div className={`upload-zone ${flash ? "flash" : ""}`}>
          {image ? (
            <>
              <div className="preview-container">
                <img 
                  key={image} 
                  src={image} 
                  className="preview-image" 
                  alt="Preview" 
                />
                {reference && (
                  <div className="thumbnail-box">
                    <img
                      src={reference}
                      className="thumb-img"
                      alt="Reference"
                    />
                    <span className="thumb-label">REF</span>
                  </div>
                )}
              </div>
              <div className="upload-actions">
                <button className="primary-btn" onClick={triggerFileInput}>
                  Change Image
                </button>
                <button
                  className="primary-btn"
                  onClick={triggerReferenceInput}
                >
                  {reference ? "Change Reference" : "Add Reference"}
                </button>
                <button
                  className="action-btn"
                  onClick={handleStartGrading}
                  disabled={isProcessing}
                >
                  {isProcessing ? "ANALYZING..." : "AUTO GRADE"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="no-image-content">
                <div className="upload-icon">📸</div>
                <p>Drop your RAW or JPEG files here</p>
                <button className="primary-btn" onClick={triggerFileInput}>
                  Select Image
                </button>
              </div>
            </>
          )}
          <input
            type="file"
            id="hidden-input"
            hidden
            accept="image/*"
            onChange={onFileUpload}
          />
          <input
            type="file"
            id="hidden-reference-input"
            hidden
            accept="image/*"
            onChange={onReferenceUpload}
          />
        </div>
        <div className="upload-footer">
          <span className="status-dot"></span>
          <span>{status}</span>
        </div>
      </div>
    </div>
  );
}
