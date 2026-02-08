"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useEcstasy } from "../../context/EcstasyContext";
import TrailingE from "../../components/TrailingE";

export default function LandingPage() {
  const { setHasLaunched, setUserApiKey, setTier, tier: contextTier } = useEcstasy();
  const [apiKey, setLocalApiKey] = useState("");
  const [tier, setLocalTier] = useState("free");
  const [showKey, setShowKey] = useState(false);
  const router = useRouter();

  // Sync initial state if needed, though usually empty on landing
  // actually contextTier defaults to "free".

  const handleContinue = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("ecstasy_api_key", apiKey);
      localStorage.setItem("ecstasy_tier", tier);
      localStorage.setItem("ecstasy_launched", "true");
    }
    setUserApiKey(apiKey);
    setTier(tier);
    setHasLaunched(true);
    router.push("/upload");
  };

  const handleMouseMove = (e) => {
    // Parallax logic if needed, but TrailingE handles its own mouse events
    // LaunchPage in page.js had onMouseMove for parallax?
    // "const handleMouseMove = (e) => { ... setMousePos ... }"
    // But TrailingE uses window event listener.
    // The LaunchPage shell also had onMouseMove.
    // It seems LaunchPage shell used it but maybe didn't use the state?
    // Lines 594: const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    // Lines 616: <div className="launch-page" onMouseMove={handleMouseMove}>
    // It seems mousePos was UNUSED in the JSX shown in page.js (lines 616-738).
    // So I can probably omit it.
  };

  return (
    <div className="launch-page">
      {/* Background Layer: "Baby Fish" 'e' */}
      <TrailingE />

      {/* Background Scatter Text (Number of spans matches original) */}
      <div className="typo-scatter">
          <span className="scatter-text outline s1">c</span>
          <span className="scatter-text outline s2">s</span>
          <span className="scatter-text outline s3">t</span>
          <span className="scatter-text outline s4">a</span>
          <span className="scatter-text outline s5">y</span>
          <span className="scatter-text outline s6">c</span>
          <span className="scatter-text outline s7">s</span>
          <span className="scatter-text outline s8">t</span>
          <span className="scatter-text outline s9">a</span>
          <span className="scatter-text outline s10">y</span>
          <span className="scatter-text outline s11">c</span>
          <span className="scatter-text outline s12">s</span>
          <span className="scatter-text outline s13">t</span>
          <span className="scatter-text outline s14">a</span>
          <span className="scatter-text outline s15">y</span>
          <span className="scatter-text outline s16">s</span>
          <span className="scatter-text outline s17">t</span>
          <span className="scatter-text outline s18">c</span>
          <span className="scatter-text outline s19">a</span>
          <span className="scatter-text outline s20">y</span>
          <span className="scatter-text outline s21">s</span>
          <span className="scatter-text outline s22">t</span>
          <span className="scatter-text outline s23">c</span>
          <span className="scatter-text outline s24">a</span>
          <span className="scatter-text outline s25">y</span>
          <span className="scatter-text outline s26">s</span>
          <span className="scatter-text outline s27">t</span>
          <span className="scatter-text outline s28">c</span>
          <span className="scatter-text outline s29">a</span>
          <span className="scatter-text outline s30">y</span>
      </div>

      {/* Left Panel - Form */}
      <div className="launch-left">
        <div className="launch-form">
          <div className="launch-brand">
            <h1>ecstasy</h1>
            <p className="launch-tagline">AI-Powered Color Grading</p>
          </div>

          {/* Broken Box Wrapper */}
          <div className="broken-box">
            <div className="launch-section">
              <h3>Connect to Gemini AI</h3>
              <div className="input-wrapper">
                <input
                  type={showKey ? "text" : "password"}
                  placeholder="Enter your Gemini API key..."
                  value={apiKey}
                  onChange={(e) => setLocalApiKey(e.target.value)}
                  className="launch-input"
                />
                <button 
                  className="toggle-visibility" 
                  onClick={() => setShowKey(!showKey)}
                  type="button"
                >
                  {showKey ? "🙈" : "👁️"}
                </button>
              </div>
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noopener noreferrer"
                className="get-key-link"
              >
                Get your free API key →
              </a>
            </div>

            <div className="launch-section">
              <h3>Select Your Plan</h3>
              <div className="plan-cards">
                <button
                  className={`plan-card ${tier === "free" ? "active" : ""}`}
                  onClick={() => setLocalTier("free")}
                >
                  <span className="plan-icon">🆓</span>
                  <span className="plan-name">Free</span>
                  <span className="plan-desc">20 images/day</span>
                  <span className="plan-model">gemini-2.5-flash</span>
                </button>
                <button
                  className={`plan-card ${tier === "pro" ? "active" : ""}`}
                  onClick={() => setLocalTier("pro")}
                >
                  <span className="plan-icon">⚡</span>
                  <span className="plan-name">Pro</span>
                  <span className="plan-desc">Unlimited</span>
                  <span className="plan-model">gemini-2.5-pro</span>
                </button>
              </div>
            </div>

            <button 
              className="launch-continue-btn" 
              onClick={handleContinue}
              disabled={!apiKey.trim()}
            >
              Continue to Editor
            </button>

            <p className="security-footer">
              🔒 Your API key is stored locally in your browser only.
              <br />It is never sent to our servers—only directly to Google's API.
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Spacer (keeps form on left) */}
      <div className="launch-right">
      </div>
    </div>
  );
}
