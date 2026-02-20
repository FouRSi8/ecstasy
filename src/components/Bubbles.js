"use client";
import { useEffect, useRef, useState } from "react";

export default function Bubbles() {
  const containerRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(/Mobi|Android/i.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    if (isMobile) return;
    const container = containerRef.current;
    if (!container) return;

    // Disable on mobile/Android for performance
    if (typeof navigator !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent)) {
      return;
    }

    const createBubble = () => {
      const bubble = document.createElement("div");

      // Random properties
      const size = Math.random() * 40 + 10; // 10px to 50px
      const left = Math.random() * 100; // 0% to 100%
      const duration = Math.random() * 10 + 10; // 10s to 20s
      const delay = Math.random() * 5;

      // Styling
      bubble.style.position = "absolute";
      bubble.style.bottom = "-50px";
      bubble.style.left = `${left}%`;
      bubble.style.width = `${size}px`;
      bubble.style.height = `${size}px`;
      bubble.style.borderRadius = "50%";
      bubble.style.border = "1px solid rgba(255, 255, 255, 0.05)";
      bubble.style.background = "radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.02), transparent)";
      bubble.style.opacity = "0";
      bubble.style.pointerEvents = "none";
      bubble.style.transition = `transform ${duration}s linear, opacity 1s ease`;

      container.appendChild(bubble);

      // Animate
      requestAnimationFrame(() => {
        // Trigger reflow
        bubble.offsetHeight;

        // Keyframes alternative using transition for simplicity in pure JS logic? 
        // Better to use Web Animations API for smooth complex path.
        const animation = bubble.animate([
          { transform: `translate(0, 0)`, opacity: 0 },
          { transform: `translate(${Math.random() * 20 - 10}px, -20vh)`, opacity: 0.1, offset: 0.2 },
          { transform: `translate(${Math.random() * 20 - 10}px, -110vh)`, opacity: 0 }
        ], {
          duration: duration * 1000,
          delay: delay * 1000,
          easing: 'linear'
        });

        animation.onfinish = () => {
          if (container.contains(bubble)) container.removeChild(bubble);
        };
      });
    };

    // Spawn interval
    const interval = setInterval(createBubble, 2000); // New bubble every 2s

    // Initial burst
    for (let i = 0; i < 5; i++) createBubble();

    return () => clearInterval(interval);
  }, [isMobile]);

  if (isMobile) return null;

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
        overflow: "hidden"
      }}
    />
  );
}
