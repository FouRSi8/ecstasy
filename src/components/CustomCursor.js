"use client";
import React, { useEffect, useRef } from "react";

export default function CustomCursor() {
  const cursorRef = useRef(null);
  const positionRef = useRef({ x: -100, y: -100 });
  const offsetRef = useRef({ x: 0, y: 0 }); // Track permanent offset
  const velocityRef = useRef({ x: 0, y: 0 }); // Track offset velocity
  const lastDispatchedPosRef = useRef({ x: -100, y: -100 });
  const requestRef = useRef(null);

  useEffect(() => {
    document.body.style.cursor = "none";
    
    const style = document.createElement('style');
    style.innerHTML = `
      * { cursor: none !important; }
      a, button, input { cursor: none !important; }
    `;
    document.head.appendChild(style);

    const handleMouseMove = (e) => {
      positionRef.current.x = e.clientX;
      positionRef.current.y = e.clientY;
      
      // Reset physics offset on user movement
      // This snaps the custom cursor back to the native cursor position
      offsetRef.current = { x: 0, y: 0 };
      velocityRef.current = { x: 0, y: 0 };
    };

    const handleBump = (e) => {
      const { forceX, forceY } = e.detail;
      // Much smaller force, applied to velocity
      velocityRef.current.x += forceX * 0.3; // Reduced from 3 to 0.3
      velocityRef.current.y += forceY * 0.3;
      
      // Visual reaction to bump (flash & shake)
      if(cursorRef.current) {
          cursorRef.current.classList.add('bumped');
          // Add a temporary "shake" class? Or just rely on physics?
          // The physics impulse will move it.
          // Let's add a "bite" scaling
          const bait = cursorRef.current.querySelector('.cursor-bait');
          if(bait) {
              bait.style.transform = "scale(0.8) rotate(20deg)"; // Crush/Bite effect
              setTimeout(() => bait.style.transform = "scale(1) rotate(0deg)", 150);
          }
          
          setTimeout(() => cursorRef.current?.classList.remove('bumped'), 200);
      }
    };

    const handleLeave = () => {
        if(cursorRef.current) cursorRef.current.style.opacity = "0";
    };
    
    const handleEnter = () => {
        if(cursorRef.current) cursorRef.current.style.opacity = "1";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("cursor-bump", handleBump);
    document.addEventListener("mouseleave", handleLeave);
    document.addEventListener("mouseenter", handleEnter);

    // Physics Vars
    let currentX = -100;
    let currentY = -100;
    let velocityX = 0;
    let velocityY = 0;
    
    // "Bait" Physics: slightly more floaty/springy
    const spring = 0.1; 
    const friction = 0.8; 
    const bumpFriction = 0.9;

    const animate = () => {
      // 1. Get raw mouse position
      const mouseX = positionRef.current.x;
      const mouseY = positionRef.current.y;
      
      // 2. Physics on the OFFSET only
      // No spring back to 0 (Permanent displacement)
      // High Drag (Water), increased to 0.92 for smoother "glide" (ease out) 
      const drag = 0.92; 

      velocityRef.current.x *= drag;
      velocityRef.current.y *= drag;
      
      // Stop completely if very slow (to prevent micro-drifting)
      if (Math.abs(velocityRef.current.x) < 0.01) velocityRef.current.x = 0;
      if (Math.abs(velocityRef.current.y) < 0.01) velocityRef.current.y = 0;

      // Apply velocity to offset
      offsetRef.current.x += velocityRef.current.x;
      offsetRef.current.y += velocityRef.current.y;

      // 3. Render at Mouse + Offset
      const currentX = mouseX + offsetRef.current.x;
      const currentY = mouseY + offsetRef.current.y;

      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`;
        
        // Dispatch global event for other components to track the VISUAL cursor
        // This ensures fish bite the visible cursor, not the invisible OS cursor
        if (typeof window !== "undefined") {
            const lastX = lastDispatchedPosRef.current.x;
            const lastY = lastDispatchedPosRef.current.y;
            
            // Only dispatch if moved > 0.1px 
            if (Math.abs(currentX - lastX) > 0.1 || Math.abs(currentY - lastY) > 0.1) {
                window.dispatchEvent(new CustomEvent('visual-cursor-move', {
                    detail: { x: currentX, y: currentY }
                }));
                lastDispatchedPosRef.current = { x: currentX, y: currentY };
            }
        }

        // Reactivity: Stretch based on velocity
        
        // Reactivity: Stretch based on velocity
        const speed = Math.sqrt(velocityX*velocityX + velocityY*velocityY);
        const scale = Math.min(1.4, 1 + speed * 0.015); // Stretch
        
        // "Bait" wobble
        const inner = cursorRef.current.querySelector('.cursor-bait');
        if (inner) {
            // Rotate towards movement
            const angle = Math.atan2(velocityY, velocityX) * (180 / Math.PI);
            if (speed > 1) {
                inner.style.transform = `rotate(${angle}deg) scaleX(${scale})`;
            } else {
                inner.style.transform = `rotate(0deg) scale(1)`;
            }
        }
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

  return () => {
      document.body.style.cursor = "auto";
      document.head.removeChild(style);
      window.removeEventListener("cursor-bump", handleBump);
      document.removeEventListener("mouseleave", handleLeave);
      document.removeEventListener("mouseenter", handleEnter);
      cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <div
      ref={cursorRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        pointerEvents: "none",
        zIndex: 9999,
        willChange: "transform",
        mixBlendMode: "difference", // Inverts color for perfect visibility
        transition: "opacity 0.3s ease",
        opacity: 1
      }}
    >
      <style jsx>{`
        .cursor-bait {
            width: 12px;
            height: 12px;
            background-color: white; /* Difference mode needs white to invert */
            border-radius: 50%;
            /* box-shadow: 0 0 15px var(--accent-glow); Removed to keep "difference" clean */
            transition: transform 0.3s ease;
            position: relative;
        }
        /* Minimal "hook" or "string" hint? Maybe just the dot is cleaner */
        
        /* Pulse Animation for "Lure" effect when idle */
        .cursor-bait::after {
            content: '';
            position: absolute;
            inset: -4px;
            border: 1px solid white;
            border-radius: 50%;
            opacity: 0.5;
            animation: pulse-ring 2s infinite;
        }
        
        @keyframes pulse-ring {
            0% { transform: scale(0.8); opacity: 0.5; }
            100% { transform: scale(1.5); opacity: 0; }
        }

        .bumped .cursor-bait {
            background-color: #fff !important; /* Flash white on impact */
            transform: scale(1.5) !important;
        }
      `}</style>

      <div className="cursor-bait" />
    </div>
  );
}
