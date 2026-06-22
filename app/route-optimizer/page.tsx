//fix for leaflet unable to render on server
"use client";

import dynamic from "next/dynamic";

const RouteOptimizerClient = dynamic(
  () => import("@/components/route-optimizer/RouteOptimizerClient"),
  { ssr: false },
);

export default function RouteOptimizerPage() {
  return <RouteOptimizerClient />;
}