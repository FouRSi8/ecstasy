"use client";
import { useRef, useEffect, useState } from "react";

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
        // Off-screen coordinates (Viewport is -50 to 50, so +/- 70 is safe)
        { x: -80, y: -80 }, { x: 80, y: -80 }, { x: -80, y: 80 }, { x: 80, y: 80 },
        { x: 0, y: -90 }, { x: 0, y: 90 }, { x: -90, y: 0 }, { x: 90, y: 0 }
    ];

    /* 
       Enhanced Behavior State:
       - fleeing: Run to off-screen spot
       - hiding: Wait there
       - peeking: Move to edge (e.g. +/- 45)
       - investigating: Move slowly towards cursor
    */

    // We will return early at the render phase, not before hooks.
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        setIsMobile(/Mobi|Android/i.test(navigator.userAgent));
    }, []);

    useEffect(() => {
        // Disable fish log on mobile
        if (isMobile || (typeof navigator !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent))) {
            return;
        }

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
        familyTrailsRef.current = [0, 1, 2].map(() => Array(5).fill({ x: 50, y: 50 }));
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
        const handleVisualMove = (e) => {
            if (typeof window !== "undefined") {
                const { x: vX, y: vY } = e.detail;

                // Convert Pixels to Vmin (-50 to 50)
                const x = ((vX / window.innerWidth) - 0.5) * 100;
                const y = ((vY / window.innerHeight) - 0.5) * 100;

                realMouseRef.current = { x, y };

                // NOTE: Do NOT update lastMoveTimeRef here!
                // visual-cursor-move fires on every frame, breaking idle detection.
                // Idle is tracked separately via native 'mousemove'.
            }
        };

        // Separate handler for USER activity (Idle Detection)
        const handleUserActivity = () => {
            const now = Date.now();
            const timeSinceLastMove = now - lastMoveTimeRef.current;
            lastMoveTimeRef.current = now;

            if (timeSinceLastMove > 500) {
                startleAnchorRef.current = { ...realMouseRef.current };
            }

            const dx = realMouseRef.current.x - startleAnchorRef.current.x;
            const dy = realMouseRef.current.y - startleAnchorRef.current.y;
            const distFromAnchor = Math.sqrt(dx * dx + dy * dy);

            if (hasStartedRef.current) {
                if (distFromAnchor > 5) {
                    if (!isScaredRef.current) {
                        isScaredRef.current = true;
                        behaviorStateRef.current.mode = 'fleeing';
                        pickBestHidingSpot(realMouseRef.current.x, realMouseRef.current.y);
                    }
                } else if (distFromAnchor > 1) {
                    if (!isScaredRef.current) {
                        behaviorStateRef.current.mode = 'startled';
                        behaviorStateRef.current.timer = now + 500;
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
                const d = dx * dx + dy * dy;
                const noise = Math.random() * 500;
                if ((d + noise) > maxDist) {
                    maxDist = d + noise;
                    bestSpot = spot;
                }
            });
            hidingSpotRef.current = bestSpot;
        };


        const animate = () => {
            const now = Date.now();
            const timeSinceMove = now - lastMoveTimeRef.current;
            const state = behaviorStateRef.current;

            // --- COORDINATE CONVERSION (Pixel-based Collision) ---
            const toPx = (v, side) => (v / 100) * side;
            const toRel = (px, side) => (px / side) * 100;

            const mxPx = toPx(mouseRef.current.x, window.innerWidth);
            const myPx = toPx(mouseRef.current.y, window.innerHeight);
            const rmxPx = toPx(realMouseRef.current.x, window.innerWidth);
            const rmyPx = toPx(realMouseRef.current.y, window.innerHeight);

            const pixelDx = rmxPx - mxPx;
            const pixelDy = rmyPx - myPx;
            const pixelDist = Math.sqrt(pixelDx * pixelDx + pixelDy * pixelDy);

            const COLLISION_RADIUS_PX = 45; // Aggressive reduction (Big E visual ~100px radius)
            const CURSOR_RADIUS_PX = 8; // Minimal cursor point
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
                if (state.mode !== 'fleeing' && state.mode !== 'hiding' && state.mode !== 'peeking') {
                    // First time scared
                    state.mode = 'fleeing';
                }

                if (state.mode === 'fleeing') {
                    // Move fast to hiding spot
                    const hs = hidingSpotRef.current || { x: 0, y: 0 };
                    targetForE = hs;
                    currentFriction = 0.15; // Fast flee

                    // Check if arrived
                    const dist = Math.sqrt(Math.pow(mouseRef.current.x - hs.x, 2) + Math.pow(mouseRef.current.y - hs.y, 2));
                    if (dist < 5) {
                        state.mode = 'hiding';
                        state.timer = now + 2000; // Hide for 2s
                    }
                }
                else if (state.mode === 'hiding') {
                    if (now > state.timer) {
                        state.mode = 'peeking';
                        // Pick a spot near the edge to peek (e.g. reduce mag to 40)
                        const hx = hidingSpotRef.current.x;
                        const hy = hidingSpotRef.current.y;
                        // Normalize and scale to 45 (just inside edge)
                        const len = Math.sqrt(hx * hx + hy * hy) || 1;
                        state.target = {
                            x: (hx / len) * 45,
                            y: (hy / len) * 45
                        };
                    }
                    targetForE = hidingSpotRef.current; // Stay hidden
                }
                else if (state.mode === 'peeking') {
                    targetForE = state.target;
                    currentFriction = 0.05; // Sneak slowly

                    const dist = Math.sqrt(Math.pow(mouseRef.current.x - targetForE.x, 2) + Math.pow(mouseRef.current.y - targetForE.y, 2));
                    if (dist < 5) {
                        // After peeking, check if safe
                        const distToMouse = Math.sqrt(Math.pow(state.target.x - realMouseRef.current.x, 2) + Math.pow(state.target.y - realMouseRef.current.y, 2));
                        if (distToMouse > 30) {
                            // Safe to return
                            isScaredRef.current = false;
                            state.mode = 'swimming'; // Will naturally transition to approach
                        } else {
                            // Still scary! Flee again!
                            state.mode = 'fleeing';
                            pickBestHidingSpot(realMouseRef.current.x, realMouseRef.current.y);
                        }
                    }
                }
            }
            else if (state.mode === 'startled') {
                if (now > state.timer) {
                    // Finished startling
                    isScaredRef.current = false;
                    state.mode = 'swimming';
                } else {
                    // Retreat from startle anchor
                    const dx = mouseRef.current.x - startleAnchorRef.current.x;
                    const dy = mouseRef.current.y - startleAnchorRef.current.y;
                    const len = Math.sqrt(dx * dx + dy * dy) || 1;
                    targetForE = {
                        x: startleAnchorRef.current.x + (dx / len) * 20,
                        y: startleAnchorRef.current.y + (dy / len) * 20
                    };
                    currentFriction = 0.1;
                }
            }
            // --- SUMMONING SEQUENCE (Fetch Babies) ---
            else if (timeSinceMove > 60000 && !isFamilyActiveRef.current && state.mode !== 'summoning_out' && state.mode !== 'summoning_wait' && state.mode !== 'summoning_in') {
                state.mode = 'summoning_out';
                // Pick off-screen target
                state.target = { x: -80, y: 20 };
            }
            else if (state.mode === 'summoning_out') {
                targetForE = state.target;
                currentFriction = 0.05;
                // If reached off-screen
                const dist = Math.sqrt(Math.pow(mouseRef.current.x - state.target.x, 2) + Math.pow(mouseRef.current.y - state.target.y, 2));
                if (dist < 10) {
                    state.mode = 'summoning_wait';
                    state.timer = now + 2000;
                    // Teleport babies to here
                    familyRef.current.forEach(f => { f.x = mouseRef.current.x; f.y = mouseRef.current.y; });
                }
            }
            else if (state.mode === 'summoning_wait') {
                targetForE = state.target; // Stay there
                if (now > state.timer) {
                    state.mode = 'summoning_in';
                    isFamilyActiveRef.current = true; // Activate babies
                    // Init baby behavior to 'schooling'
                    smallFishParams.current.forEach(p => { p.mode = 'schooling'; });
                }
            }
            else if (state.mode === 'summoning_in') {
                // Return to center/mouse
                targetForE = realMouseRef.current;
                currentFriction = 0.04;
                if (pixelDist < 300) { // Close enough to user
                    state.mode = 'swimming'; // Resume normal
                    // disperse babies
                    smallFishParams.current.forEach(p => {
                        p.mode = 'chaos';
                        p.wanderTimer = now + 1000;
                    });

                    // Notify Whispers that babies have arrived
                    if (typeof window !== "undefined") {
                        window.dispatchEvent(new CustomEvent('babies-arrived'));
                    }
                }
            }
            else if (timeSinceMove < 30000 && state.mode !== 'biting' && state.mode !== 'approaching' && state.mode !== 'circling') {
                // Default wander
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
                // --- INTERACTIVE MODES (Pixel Dist Check) ---

                // Collision prevents getting closer than threshold.
                // Threshold for interaction logic (px)
                const INTERACT_DIST_PX = 300;

                if (pixelDist > INTERACT_DIST_PX) {
                    state.mode = 'approaching';
                    // "Checking"
                    const checkAngle = now * 0.002;
                    const checkOffsetPx = {
                        x: Math.sin(checkAngle) * 60, // 60px orbit
                        y: Math.cos(checkAngle) * 60
                    };
                    // Convert check offset back to Relative for target
                    targetForE = {
                        x: realMouseRef.current.x + toRel(checkOffsetPx.x, window.innerWidth),
                        y: realMouseRef.current.y + toRel(checkOffsetPx.y, window.innerHeight)
                    };
                    currentFriction = 0.008;
                }
                else {
                    state.mode = 'biting';
                    // ... existing biting timer logic ...
                    // But ensure targets are valid.
                    // Biting logic needs to be robust.
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
                        currentFriction = 0.25;
                    } else {
                        // retreat
                        const angle = Math.atan2(pixelDy, pixelDx);
                        targetForE = {
                            x: realMouseRef.current.x - Math.cos(angle) * 15, // Retreat ~15%
                            y: realMouseRef.current.y - Math.sin(angle) * 15
                        };
                        currentFriction = 0.1;
                    }
                }
            }

            // --- INTERACTION: BUMP CURSOR ---


            // --- PHYSICS & OSCILLATION ---
            const swimX = Math.sin(now * 0.003) * 1.5;
            const swimY = Math.cos(now * 0.002) * 1.5;
            const activeTargetX = targetForE.x + swimX;
            const activeTargetY = targetForE.y + swimY;

            // update position
            mouseRef.current.x += (activeTargetX - mouseRef.current.x) * currentFriction;
            mouseRef.current.y += (activeTargetY - mouseRef.current.y) * currentFriction;

            // --- COLLISION DETECTION (Px Based) ---
            // Recalculate Px after move
            const currPxX = toPx(mouseRef.current.x, window.innerWidth);
            const currPxY = toPx(mouseRef.current.y, window.innerHeight);

            const cDx = currPxX - rmxPx;
            const cDy = currPxY - rmyPx;
            const cDist = Math.sqrt(cDx * cDx + cDy * cDy);

            const MIN_SEP_PX = COLLISION_RADIUS_PX + CURSOR_RADIUS_PX; // ~140px

            if (cDist < MIN_SEP_PX && cDist > 0) {
                const overlapPx = MIN_SEP_PX - cDist;
                const pushPxX = (cDx / cDist) * overlapPx;
                const pushPxY = (cDy / cDist) * overlapPx;

                // Apply back to Rel
                mouseRef.current.x += toRel(pushPxX, window.innerWidth);
                mouseRef.current.y += toRel(pushPxY, window.innerHeight);

                // Trigger Bump
                if (state.mode === 'biting' && state.bitePhase === 'lunge') {
                    if (typeof window !== "undefined") {
                        const event = new CustomEvent('cursor-bump', {
                            detail: {
                                forceX: -(cDx / cDist) * 0.8, // Stronger push in px context?
                                forceY: -(cDy / cDist) * 0.8
                            }
                        });
                        window.dispatchEvent(event);
                    }
                }
            }

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

                // HEAD LOGIC - BABY AI
                if (isFamilyActiveRef.current) {
                    if (now > params.wanderTimer) {
                        // Switch behavior periodically
                        const chance = Math.random();

                        if (params.mode === 'schooling' || params.mode === 'mimic') {
                            // Maintain schooling/mimicry for longer?
                            // handled below
                        }

                        // NEW WEIGHTS FOR VARIETY
                        if (chance > 0.90) {
                            params.mode = 'bite';
                            params.wanderTimer = now + 800;
                        } else if (chance > 0.80) {
                            params.mode = 'kid_fights'; // High energy interaction
                            params.wanderTimer = now + 4000;
                        } else if (chance > 0.70) {
                            params.mode = 'mimic'; // Follow leader
                            params.wanderTimer = now + 5000;
                        } else if (chance > 0.60) {
                            params.mode = 'scatter'; // Burst
                            params.wanderTimer = now + 1500;
                        } else if (chance > 0.45) {
                            params.mode = 'playful_orbit';
                            params.wanderTimer = now + 6000;
                        } else if (chance > 0.35) {
                            params.mode = 'hide_behind';
                            params.wanderTimer = now + 4000;
                        } else {
                            params.mode = 'chaos'; // Wander/Chaos
                            params.wanderTimer = now + 2000 + Math.random() * 2000;
                        }
                    }

                    let babyTx = fish.x;
                    let babyTy = fish.y;
                    let babyFric = 0.04;

                    if (params.mode === 'schooling') {
                        // Follow Big E in delta formation
                        const offset = fishIndex * 15 - 15; // -15, 0, 15
                        babyTx = mouseRef.current.x + offset;
                        babyTy = mouseRef.current.y + 15; // Behind
                        babyFric = 0.1; // Tight
                    }
                    else if (params.mode === 'mimic') {
                        // Follow Big E's TRAIL (Mimicry)
                        // Use a delayed position from the trail history
                        // fishIndex 0 -> index 2, fishIndex 1 -> index 5, etc.
                        const trailIdx = (fishIndex + 1) * 3;
                        const targetPos = positionsRef.current[trailIdx] || mouseRef.current;
                        babyTx = targetPos.x;
                        babyTy = targetPos.y;
                        babyFric = 0.15; // Strict following
                    }
                    else if (params.mode === 'hide_behind') {
                        // Hide behind Big E relative to cursor
                        const dx = mouseRef.current.x - realMouseRef.current.x;
                        const dy = mouseRef.current.y - realMouseRef.current.y;
                        const len = Math.sqrt(dx * dx + dy * dy) || 1;

                        // Position: BigE + (Vector away from cursor) * Distance
                        babyTx = mouseRef.current.x + (dx / len) * (30 + fishIndex * 10);
                        babyTy = mouseRef.current.y + (dy / len) * (30 + fishIndex * 10);
                        babyFric = 0.08;
                    }
                    else if (params.mode === 'playful_orbit') {
                        // Orbit the cursor safely
                        const speed = 0.002 + (fishIndex * 0.001);
                        const angle = now * speed + params.phaseOffset;
                        const radius = 60 + Math.sin(now * 0.001) * 20; // Pulse radius

                        babyTx = realMouseRef.current.x + Math.cos(angle) * radius;
                        babyTy = realMouseRef.current.y + Math.sin(angle) * radius;
                        babyFric = 0.03; // Floaty
                    }
                    else if (params.mode === 'kid_fights') {
                        // Fight a sibling!
                        const siblingIndex = (fishIndex + 1) % 3;
                        const sibling = familyRef.current[siblingIndex];

                        // Circle/Chase Sibling
                        const dx = sibling.x - fish.x;
                        const dy = sibling.y - fish.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);

                        if (dist > 15) {
                            // Chase
                            babyTx = sibling.x;
                            babyTy = sibling.y;
                            babyFric = 0.12; // Aggressive chase
                        } else {
                            // Orbit/Fight (Tight spiral)
                            const angle = now * 0.015; // Fast
                            babyTx = sibling.x + Math.sin(angle) * 10; // Tight radius
                            babyTy = sibling.y + Math.cos(angle) * 10;
                            babyFric = 0.08;
                        }
                    }
                    else if (params.mode === 'bite') {
                        // Lunge at cursor
                        babyTx = realMouseRef.current.x;
                        babyTy = realMouseRef.current.y;
                        babyFric = 0.15; // Fast lunge
                    }
                    else if (params.mode === 'scatter') {
                        // Burst away from Big E
                        const angle = params.phaseOffset; // Random direction
                        babyTx = mouseRef.current.x + Math.cos(angle) * 80;
                        babyTy = mouseRef.current.y + Math.sin(angle) * 80;
                        babyFric = 0.1;
                    }
                    else {
                        // Chaos/Circle (Default)
                        const angle = (now * 0.003) + params.phaseOffset;
                        const radius = 15;
                        babyTx = realMouseRef.current.x + Math.cos(angle) * radius;
                        babyTy = realMouseRef.current.y + Math.sin(angle) * radius;
                        babyFric = 0.04;
                    }

                    // Move
                    fish.x += (babyTx - fish.x) * babyFric;
                    fish.y += (babyTy - fish.y) * babyFric;

                    // Px Collision for Baby
                    const bPxX = toPx(fish.x, window.innerWidth);
                    const bPxY = toPx(fish.y, window.innerHeight);
                    const bDx = bPxX - rmxPx;
                    const bDy = bPxY - rmyPx;
                    const bDist = Math.sqrt(bDx * bDx + bDy * bDy);

                    // Solid Circle Hitbox (External Perimeter Only)
                    // User request: "The Whole circular perimeter is the hitbox"
                    // "Dont let the cursor get inside this circle"
                    // Visual 'e' is roughly 200px * scale.
                    const baseSize = 200 * params.scale;
                    const hitRadius = baseSize * 0.45; // Matches full visual bounding circle (~90px for big babies)

                    // Check if cursor is INSIDE the circle -> Push OUT
                    if (bDist < hitRadius) {
                        const overlap = hitRadius - bDist;

                        // Push fish AWAY from cursor (Standard repulsion)
                        const pushX = (bDx / bDist) * overlap;
                        const pushY = (bDy / bDist) * overlap;
                        fish.x += toRel(pushX, window.innerWidth);
                        fish.y += toRel(pushY, window.innerHeight);

                        // Bump (Always fire on collision, same force as Big E)
                        if (typeof window !== "undefined") {
                            const event = new CustomEvent('cursor-bump', {
                                detail: {
                                    forceX: -(bDx / bDist) * 0.8,
                                    forceY: -(bDy / bDist) * 0.8
                                }
                            });
                            window.dispatchEvent(event);
                        }
                    }

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

                // Process 5 layers (Half length)
                for (let i = 0; i < 5; i++) {
                    const currentPos = currentTrail[i] || { x: fish.x, y: fish.y };
                    const target = i === 0 ? fish : (newTrail[i - 1] || fish);
                    // Slightly faster decay for shorter trail?
                    const layerFriction = 0.25 - (i * 0.02);

                    const x = currentPos.x + (target.x - currentPos.x) * layerFriction;
                    const y = currentPos.y + (target.y - currentPos.y) * layerFriction;

                    newTrail.push({ x, y });

                    // Apply to DOM
                    const layerEl = familyLayerRefs.current[fishIndex]?.[i];
                    if (layerEl) {
                        const baseOpacity = isFamilyActiveRef.current ? 1 : 0;
                        const layerOpacity = baseOpacity * (1 - (i * 0.15)); // Faster fade for 5 layers

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

        // Listen to VISUAL cursor (from CustomCursor physics)
        window.addEventListener('visual-cursor-move', handleVisualMove);

        // Listen to NATIVE mouse for IDLE detection
        window.addEventListener('mousemove', handleUserActivity);

        return () => {
            window.removeEventListener('visual-cursor-move', handleVisualMove);
            window.removeEventListener('mousemove', handleUserActivity);
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, []);

    const layers = Array.from({ length: 12 });
    const babyLayers = Array.from({ length: 5 }); // Reduced to 5
    const babies = [0, 1, 2];

    if (isMobile) {
        return null;
    }

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            pointerEvents: 'none', // Ensure it doesn't block interactions
            zIndex: 9999, // High z-index to be on top
        }}>
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
                            // Inherit the same layer classes as Big E to match color
                            className={`scatter-text layer-${i}`}
                            style={{
                                position: 'absolute',
                                left: '50%',
                                top: '50%',
                                fontSize: typeof window !== 'undefined' && window.innerWidth <= 768 ? '100px' : '200px', // Responsive base size
                                // color: removed to allow CSS class override
                                textTransform: 'lowercase',
                                opacity: 0,
                                zIndex: 4 - i, // Relative z-stacking matches father
                                pointerEvents: 'none',
                                textShadow: '0 0 10px rgba(255, 255, 255, 0.1)'
                            }}
                        >
                            e
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}
