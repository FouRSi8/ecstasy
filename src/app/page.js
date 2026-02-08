"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useEcstasy } from "../context/EcstasyContext";

export default function Home() {
  const { hasLaunched } = useEcstasy();
  const router = useRouter();

  useEffect(() => {
    // Only redirect if "hasLaunched" check is complete (state from localStorage loaded)
    // We might need a "loading" state in context to know if storage was checked.
    // But assuming hasLaunched is false by default, and effect in context runs presumably fast or before this?
    // Actually, context effect runes on mount. This page also mounts.
    // If context initializes hasLaunched as false, and localstorage is 'true', 
    // it will flip to true after context mount effect.
    // We should probably wait for context to be ready.
    // Or just rely on the router pushing to landing, then later pushing to upload?
    // Let's add a small check or just redirect based on current state.
    // If "ecstasy_launched" is in localStorage, we should go to upload.
    
    // Better: let the context determine the "isReady" state or handle redirection?
    // But strict routing logic belongs in pages.
    
    if (typeof window !== "undefined") {
       const launched = localStorage.getItem("ecstasy_launched") === "true";
       if (launched) {
           router.replace("/upload");
       } else {
           router.replace("/landing");
       }
    }
  }, [hasLaunched, router]);

  return (
    <div style={{ 
        height: '100vh', 
        width: '100vw', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        backgroundColor: '#000', 
        color: '#666' 
    }}>
      Loading...
    </div>
  );
}
