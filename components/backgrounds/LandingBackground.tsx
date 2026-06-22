"use client";

import LiquidEther from "./LiquidEther";

// Site-themed configuration of the LiquidEther fluid background.
// Colors are pulled from the platform palette (accent green + warm gold).
export default function LandingBackground() {
  return (
    <LiquidEther
      colors={["#47d98a", "#33a56a", "#e8c56d"]}
      mouseForce={20}
      cursorSize={100}
      isViscous
      viscous={30}
      iterationsViscous={32}
      iterationsPoisson={32}
      resolution={0.5}
      isBounce={false}
      autoDemo
      autoSpeed={0.5}
      autoIntensity={2.2}
      takeoverDuration={0.25}
      autoResumeDelay={3000}
      autoRampDuration={0.6}
    />
  );
}
