"use client";
import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export default function Whispers() {
  const pathname = usePathname();
  const [text, setText] = useState('');
  const [opacity, setOpacity] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const idleTimer = useRef(null);
  const sequenceTimer = useRef(null); // New dedicated timer for message flow
  const hasShownRef = useRef(false);
  const mouseRef = useRef({ x: 0, y: 0 });
  const messages = [
    "oh! you're idle?",
    "wait...",
    "let her feel safe",
    "she's curious",
    "she thinks you're a bait"
  ];

  const messageIndexRef = useRef(0);
  const hasClickedRef = useRef(false);

  useEffect(() => {
    if (pathname !== '/' && pathname !== '/landing') return;

    // DEBUG: Clear session storage on mount to allow testing
    sessionStorage.removeItem('whispers_complete_v2');

    const handleVisualMove = (e) => {
      const { x, y } = e.detail;
      mouseRef.current = { x, y };
    };

    const handleNativeMove = (e) => {
      if (mouseRef.current.x === 0 && mouseRef.current.y === 0) {
        mouseRef.current = { x: e.clientX, y: e.clientY };
      }
      handleUserActivity(e);
    };

    // Handler for MANUAL user interactions (Reset Idle)
    const handleUserActivity = (e) => {
      if (e.type === 'click') {
        hasClickedRef.current = true;
      }

      // Cancel any active sequence if user moves
      if (hasShownRef.current) {
        setOpacity(0);
        hasShownRef.current = false;
        // Do NOT reset index, let it resume
        if (sequenceTimer.current) clearTimeout(sequenceTimer.current);
      }

      if (idleTimer.current) clearTimeout(idleTimer.current);

      // Only start timer if user has clicked at least once
      if (hasClickedRef.current) {
        const shownSession = typeof window !== 'undefined' ? sessionStorage.getItem('whispers_complete_v2') : null;
        if (!shownSession) {
          idleTimer.current = setTimeout(startWhisperCycle, 3000);
        }
      }
    };

    const startWhisperCycle = () => {
      const shownSession = typeof window !== 'undefined' ? sessionStorage.getItem('whispers_complete_v2') : null;
      if (shownSession) return;

      showNextMessage();
    };

    const showNextMessage = () => {
      if (messageIndexRef.current >= messages.length) {
        sessionStorage.setItem('whispers_complete_v2', 'true');
        return;
      }

      const msg = messages[messageIndexRef.current];
      setText(msg);

      if (messageIndexRef.current === 0) {
        const x = mouseRef.current.x || window.innerWidth / 2;
        const y = mouseRef.current.y || window.innerHeight / 2;

        setPosition({
          x: x + 30,
          y: y + 30
        });
      }

      setOpacity(1);
      hasShownRef.current = true;

      // Use Independent Sequence Timer
      sequenceTimer.current = setTimeout(() => {
        setOpacity(0);
        hasShownRef.current = false;
        messageIndexRef.current++;

        sequenceTimer.current = setTimeout(() => {
          showNextMessage();
        }, 1000);

      }, 3000);
    };

    const handleDisturbance = () => {
      setOpacity(0);
      hasShownRef.current = false;
      if (sequenceTimer.current) clearTimeout(sequenceTimer.current);
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };

    window.addEventListener('visual-cursor-move', handleVisualMove);
    window.addEventListener('mousemove', handleNativeMove);
    window.addEventListener('click', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('cursor-bump', handleDisturbance);

    const handleBabiesArrived = () => {
      setText("the babies listen to no one");
      setPosition({
        x: mouseRef.current.x + 30,
        y: mouseRef.current.y + 30
      });
      setOpacity(1);
      setTimeout(() => setOpacity(0), 4000);
    };

    window.addEventListener('babies-arrived', handleBabiesArrived, { once: true });

    return () => {
      window.removeEventListener('visual-cursor-move', handleVisualMove);
      window.removeEventListener('mousemove', handleNativeMove);
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('cursor-bump', handleDisturbance);
      window.removeEventListener('babies-arrived', handleBabiesArrived);

      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (sequenceTimer.current) clearTimeout(sequenceTimer.current);
    };
  }, [pathname]);

  if (pathname !== '/' && pathname !== '/landing') return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: typeof window !== 'undefined' && window.innerWidth <= 768 ? '10px' : '12px',
        fontFamily: 'var(--font-geist-mono)',
        pointerEvents: 'none',
        transition: 'opacity 0.8s ease',
        opacity: opacity,
        zIndex: 9998, // Below cursor (9999)
        textTransform: 'lowercase',
        letterSpacing: '1px',
        whiteSpace: 'nowrap'
      }}
    >
      {text}
    </div>
  );
}
