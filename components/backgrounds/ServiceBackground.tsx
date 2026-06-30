"use client";

import { ShaderGradientCanvas, ShaderGradient } from "@shadergradient/react";

// Ambient ShaderGradient backdrop shared by the service pages that have a blank
// main area (traffic-reader, damaged-packages, driver-behavior). Fixed behind
// the content and non-interactive. Imported with ssr:false by each page, since
// the canvas is WebGL/client-only.
//
// Studio-only props from the shadergradient.co snippet (axesHelper, gizmoHelper,
// bgColor1/2, destination, embedMode, format, frameRate) are dropped — the typed
// component rejects them. fov + pixelDensity live on the Canvas, not the gradient.
export default function ServiceBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      <ShaderGradientCanvas
        style={{ width: "100%", height: "100%" }}
        pointerEvents="none"
        fov={30}
        pixelDensity={1}
      >
        <ShaderGradient
          animate="on"
          brightness={1}
          cAzimuthAngle={95}
          cDistance={5.08}
          cPolarAngle={50}
          cameraZoom={9.1}
          color1="#1f374d"
          color2="#28caaf"
          color3="#150000"
          envPreset="city"
          grain="on"
          lightType="3d"
          positionX={-0.7}
          positionY={0.2}
          positionZ={0}
          range="disabled"
          rangeEnd={40}
          rangeStart={0}
          reflection={0.1}
          rotationX={50}
          rotationY={0}
          rotationZ={-60}
          shader="defaults"
          type="waterPlane"
          uAmplitude={0}
          uDensity={1.5}
          uFrequency={0}
          uSpeed={0.1}
          uStrength={1.5}
          uTime={8}
          wireframe={false}
        />
      </ShaderGradientCanvas>
    </div>
  );
}
