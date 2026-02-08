"use client";
import { useRef, useEffect } from "react";

export default function TrailingE() {
  const layerRefs = useRef([]);
  const requestRef = useRef();

  // Family State
  const familyRef = useRef([]); 
  const isFamilyActiveRef = useRef(false);
  // [NEW] Use refs for family trails
  // Structure: Array of 3 arrays, each with 12 positions
  const familyTrailsRef = useRef([]); 
  const familyLayerRefs = useRef([]); // To store DOM refs for 3 fish * 12 layers
  
  // Independent params: Scale, Phase offset, Wandering Target
  const smallFishParams = useRef([]);
  
  // Physics State
  const mouseRef = useRef({ x: 0, y: 0 }); // Current physical position (Big E Head)
  const realMouseRef = useRef({ x: 0, y: 0 }); // Target (cursor)
  
  // Interaction State
  const hasStartedRef = useRef(false);

  // Advanced Fear State
  const startleAnchorRef = useRef({ x: 0, y: 0 }); 
  const hidingSpotRef = useRef(null); 
  const isScaredRef = useRef(false);
  const lastMoveTimeRef = useRef(Date.now());
  
  const positionsRef = useRef(Array(12).fill({ x: 0, y: 0 })); // Big E Trail
  
  // State for fish AI
  const behaviorStateRef = useRef({
    mode: 'waiting', 
    target: { x: 0, y: 0 },
    timer: 0, 
    bitePhase: 'wait',
    lastIdleCheck: 0
  });
  
  const getHidingSpots = () => [
     { x: -50, y: -50 }, { x: 50, y: -50 }, { x: -50, y: 50 }, { x: 50, y: 50 },
     { x: 0, y: -55 }, { x: 0, y: 55 }, { x: -55, y: 0 }, { x: 55, y: 0 },
     { x: -25, y: 0 } 
  ];

  useEffect(() => {
     const spots = getHidingSpots();
     const randomSpot = spots[Math.floor(Math.random() * 4)]; 
     mouseRef.current = { ...randomSpot };
     positionsRef.current = Array(12).fill({ ...randomSpot });
     hidingSpotRef.current = randomSpot;

     // Family Init
     familyRef.current = [
        { x: 50, y: 50 },
        { x: 50, y: 50 },
        { x: 50, y: 50 }
     ];
     // Init unique params
     smallFishParams.current = [0, 1, 2].map(() => ({
         scale: 0.3 + Math.random() * 0.2, // Smaller size for babies
         phaseOffset: Math.random() * 100,
         wanderTarget: { x: 0, y: 0 },
         wanderTimer: 0
     }));
     
     // Init trails for family (3 fish, 10 layers each)
     familyTrailsRef.current = [0, 1, 2].map(() => Array(10).fill({ x: 50, y: 50 }));
     // Init DOM refs container
     familyLayerRefs.current = [0, 1, 2].map(() => []);

  }, []);
  
  useEffect(() => {
      const handleStart = () => {
          hasStartedRef.current = true;
      };
      window.addEventListener('click', handleStart, { capture: true, once: true });
      return () => window.removeEventListener('click', handleStart, { capture: true });
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (typeof window !== "undefined") {
        const x = ((e.clientX / window.innerWidth) - 0.5) * 100;
        const y = ((e.clientY / window.innerHeight) - 0.5) * 100;
        
        realMouseRef.current = { x, y };
        const now = Date.now();
        const timeSinceLastMove = now - lastMoveTimeRef.current;
        lastMoveTimeRef.current = now;

        if (isFamilyActiveRef.current) {
            isFamilyActiveRef.current = false;
        }
        
        if (timeSinceLastMove > 500) {
            startleAnchorRef.current = { x, y };
        }
        
        const dx = x - startleAnchorRef.current.x;
        const dy = y - startleAnchorRef.current.y;
        const distFromAnchor = Math.sqrt(dx*dx + dy*dy);
        
        if (hasStartedRef.current) {
             if (distFromAnchor > 5) {
                if (!isScaredRef.current) {
                    isScaredRef.current = true;
                    behaviorStateRef.current.mode = 'fleeing';
                    pickBestHidingSpot(x, y);
                }
            } else if (distFromAnchor > 1) {
               if (!isScaredRef.current) {
                   behaviorStateRef.current.mode = 'startled';
                   behaviorStateRef.current.timer = now + 500;
               }
            }
        }
      }
    };
    
    const pickBestHidingSpot = (cursorX, cursorY) => {
        const spots = getHidingSpots();
        let maxDist = -1;
        let bestSpot = spots[0];
        
        spots.forEach(spot => {
            const dx = spot.x - cursorX;
            const dy = spot.y - cursorY;
            const d = dx*dx + dy*dy;
            const noise = Math.random() * 500; 
            if ((d + noise) > maxDist) {
                maxDist = d + noise;
                bestSpot = spot;
            }
        });
        hidingSpotRef.current = bestSpot;
    };
    
    window.addEventListener("mousemove", handleMouseMove);

    const animate = () => {
      const now = Date.now();
      const timeSinceMove = now - lastMoveTimeRef.current;
      const state = behaviorStateRef.current;
      
      let targetForE = { x: 0, y: 0 };
      let currentFriction = 0.05; 
      
      // --- BEHAVIOR TREE ---
      if (!hasStartedRef.current) {
          state.mode = 'waiting';
          targetForE = { 
              x: 25 + Math.sin(now * 0.0008) * 3, 
              y: Math.cos(now * 0.001) * 2 
          };
          currentFriction = 0.02; 
      }
      else if (isScaredRef.current) {
          if (timeSinceMove > 2000) { 
              isScaredRef.current = false;
              state.mode = 'swimming';
          } else {
              const hs = hidingSpotRef.current || {x:0, y:0};
              const dx = realMouseRef.current.x - hs.x;
              const dy = realMouseRef.current.y - hs.y;
              if (Math.sqrt(dx*dx + dy*dy) < 30) pickBestHidingSpot(realMouseRef.current.x, realMouseRef.current.y);
              targetForE = hidingSpotRef.current;
              currentFriction = 0.15; 
          }
      }
      else if (state.mode === 'startled') {
          if (now > state.timer) {
              state.mode = 'swimming'; 
          } else {
              const dx = mouseRef.current.x - realMouseRef.current.x;
              const dy = mouseRef.current.y - realMouseRef.current.y;
              const len = Math.sqrt(dx*dx + dy*dy) || 1;
              targetForE = {
                  x: mouseRef.current.x + (dx/len) * 10,
                  y: mouseRef.current.y + (dy/len) * 10
              };
              currentFriction = 0.1; 
          }
      }
      else if (timeSinceMove > 60000 && !isFamilyActiveRef.current && state.mode !== 'summoning') {
          state.mode = 'summoning';
          state.target = { x: 50, y: 50 }; 
      }
      else if (state.mode === 'summoning') {
          targetForE = state.target;
          currentFriction = 0.04;
          const dx = targetForE.x - mouseRef.current.x;
          const dy = targetForE.y - mouseRef.current.y;
          if (Math.sqrt(dx*dx + dy*dy) < 5) {
              isFamilyActiveRef.current = true;
              state.mode = 'swimming';
              familyRef.current.forEach(f => { f.x = mouseRef.current.x; f.y = mouseRef.current.y; });
          }
      }
      else if (timeSinceMove < 30000) {
         state.mode = 'swimming';
         if (now > state.timer) {
            state.timer = now + 2000 + Math.random() * 3000;
            state.target = {
                x: (Math.random() - 0.5) * 90,
                y: (Math.random() - 0.5) * 90
            };
         }
         targetForE = state.target;
         currentFriction = 0.02; 
      }
      else {
         const dx = realMouseRef.current.x - mouseRef.current.x;
         const dy = realMouseRef.current.y - mouseRef.current.y;
         const dist = Math.sqrt(dx*dx + dy*dy);
         if (dist > 8) { 
            state.mode = 'approaching';
            targetForE = realMouseRef.current;
            currentFriction = 0.006; 
         } else {
             state.mode = 'biting';
             if (now > state.timer) {
                 if (state.bitePhase === 'wait') {
                     state.bitePhase = 'lunge';
                     state.timer = now + 300; 
                 } else if (state.bitePhase === 'lunge') {
                     state.bitePhase = 'retreat';
                     state.timer = now + 600; 
                 } else {
                     state.bitePhase = 'wait';
                     state.timer = now + 1000 + Math.random() * 1000; 
                 }
             }
             if (state.bitePhase === 'wait') {
                 targetForE = { 
                     x: realMouseRef.current.x + Math.sin(now * 0.005) * 5, 
                     y: realMouseRef.current.y + Math.cos(now * 0.005) * 5 
                 };
                 currentFriction = 0.05;
             } else if (state.bitePhase === 'lunge') {
                 targetForE = realMouseRef.current;
                 currentFriction = 0.2; 
             } else {
                 const angle = Math.atan2(dy, dx);
                 targetForE = {
                     x: realMouseRef.current.x - Math.cos(angle) * 10,
                     y: realMouseRef.current.y - Math.sin(angle) * 10
                 };
                 currentFriction = 0.1;
             }
         }
      }

      // --- PHYSICS & OSCILLATION ---
      const swimX = Math.sin(now * 0.003) * 1.5;
      const swimY = Math.cos(now * 0.002) * 1.5;
      const activeTargetX = targetForE.x + swimX;
      const activeTargetY = targetForE.y + swimY;
      
      // Update Big E Head
      mouseRef.current.x += (activeTargetX - mouseRef.current.x) * currentFriction;
      mouseRef.current.y += (activeTargetY - mouseRef.current.y) * currentFriction;

      // Update Big E Trail
      const trailFriction = 0.14; 
      const newPositions = [];
      for (let i = 0; i < 12; i++) {
        const currentPos = positionsRef.current[i];
        const target = i === 0 ? mouseRef.current : positionsRef.current[i - 1];
        const layerFriction = trailFriction - (i * 0.002); 
        const x = currentPos.x + (target.x - currentPos.x) * layerFriction;
        const y = currentPos.y + (target.y - currentPos.y) * layerFriction;
        newPositions.push({ x, y });
        if (layerRefs.current[i]) {
          layerRefs.current[i].style.transform = `translate(calc(-50% + ${x}vw), calc(-50% + ${y}vh))`;
        }
      }
      positionsRef.current = newPositions;

      // Update Family (Baby Fish)
      familyRef.current.forEach((fish, fishIndex) => {
          const params = smallFishParams.current[fishIndex];
          if (!params) return;

          // HEAD LOGIC
          if (isFamilyActiveRef.current) {
             // ... previous logic for interacting? No, family logic was "Summoning" logic.
             // Wait, previous logic had independent wandering.
             if (now > params.wanderTimer) {
                 params.wanderTimer = now + 1000 + Math.random() * 2000;
                 const angle = Math.random() * Math.PI * 2;
                 const radius = 10 + Math.random() * 15; 
                 params.wanderTarget = {
                     x: Math.cos(angle) * radius,
                     y: Math.sin(angle) * radius
                 };
             }
             const tx = mouseRef.current.x + params.wanderTarget.x;
             const ty = mouseRef.current.y + params.wanderTarget.y;
             fish.x += (tx - fish.x) * 0.04; 
             fish.y += (ty - fish.y) * 0.04;
          } else {
             // If family is NOT active (meaning dispersed/hidden), move towards Big E?
             // Previous logic: "Disperse: opacity 0, move towards mouse"
             // Actually previous logic: "el.style.opacity = 0; fish.x += ..."
             // If we want them visible we should use isFamilyActiveRef.
             // The original code had logic to summon them.
             // For now, let's keep them always active if `hasStarted`?
             // Or follow the summoning logic. 
             // Let's stick to existing logic: if !isFamilyActiveRef, they are hidden.
             // But user asked for baby 'e's to have trailing animation.
             // This implies they should be visible.
             // Let's assume they are summoned or we force summon them.
             // For now, let's just process their physics.
             
             // If hidden, pull to head quickly so they are ready to pop out.
             if (!isFamilyActiveRef.current) {
                 fish.x += (mouseRef.current.x - fish.x) * 0.1;
                 fish.y += (mouseRef.current.y - fish.y) * 0.1;
             }
          }

          // TRAIL LOGIC FOR BABY
          // Get current trail array for this fish
          const currentTrail = familyTrailsRef.current[fishIndex] || [];
          const newTrail = [];
          
          // Process 10 layers
          for (let i = 0; i < 10; i++) {
              const currentPos = currentTrail[i] || { x: fish.x, y: fish.y };
              const target = i === 0 ? fish : (newTrail[i-1] || fish);
              // Slightly tighter trail for small fish
              const layerFriction = 0.20 - (i * 0.005); 
              
              const x = currentPos.x + (target.x - currentPos.x) * layerFriction;
              const y = currentPos.y + (target.y - currentPos.y) * layerFriction;
              
              newTrail.push({ x, y });
              
              // Apply to DOM
              const layerEl = familyLayerRefs.current[fishIndex]?.[i];
              if (layerEl) {
                  // Opacity logic:
                  // If family not active, hide.
                  // If active, show with fade.
                  const baseOpacity = isFamilyActiveRef.current ? 1 : 0;
                  const layerOpacity = baseOpacity * (1 - (i * 0.08)); 
                  
                  layerEl.style.opacity = layerOpacity;
                  layerEl.style.transform = `translate(calc(-50% + ${x}vw), calc(-50% + ${y}vh)) scale(${params.scale})`;
              }
          }
          // Update ref
          familyTrailsRef.current[fishIndex] = newTrail;
      });

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const layers = Array.from({ length: 12 });
  const babyLayers = Array.from({ length: 10 });
  const babies = [0, 1, 2];

  return (
    <>
      {/* Big E Layers */}
      {layers.map((_, i) => (
        <div
          key={`big-${i}`}
          ref={(el) => (layerRefs.current[i] = el)}
          className={`scatter-text trailing-layer layer-${i}`}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            pointerEvents: 'none',
            zIndex: 5 - i, 
            opacity: 1 - (i * 0.05), 
          }}
        >
          e
        </div>
      ))}

      {/* Baby E Layers */}
      {babies.map((fishIndex) => (
          <div key={`baby-group-${fishIndex}`}>
              {babyLayers.map((_, i) => (
                  <div
                    key={`baby-${fishIndex}-${i}`}
                    ref={(el) => {
                        if (!familyLayerRefs.current[fishIndex]) familyLayerRefs.current[fishIndex] = [];
                        familyLayerRefs.current[fishIndex][i] = el;
                    }}
                    className="scatter-text"
                    style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        fontSize: '200px', // Base size, scaled by transform
                        color: '#e4e4e7', 
                        textTransform: 'lowercase',
                        opacity: 0, 
                        zIndex: 4, // Behind Big E (5) ? Or mixed?
                        // If Big E is 5..5-12, let's put babies slightly behind or same.
                        // Let's use 4.
                        pointerEvents: 'none',
                        textShadow: '0 0 10px rgba(255,255,255,0.1)'
                    }}
                  >
                    e
                  </div>
              ))}
          </div>
      ))}
    </>
  );
}
