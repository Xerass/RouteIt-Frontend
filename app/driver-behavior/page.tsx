"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import StatusBar, { type StatusType } from "@/components/StatusBar";
import DriverDashboard from "@/components/driver-behavior/DriverDashboard";
import * as api from "@/lib/driverBehaviorClient";
import type { DriverResult, DriverSummary } from "@/lib/driverBehaviorClient";
import dynamic from "next/dynamic";

const ServiceBackground = dynamic(
  () => import("@/components/backgrounds/ServiceBackground"),
  { ssr: false },
);

const TIER_TEXT: Record<string, string> = {
  Low: "text-accent",
  Medium: "text-warm",
  High: "text-danger",
};

export default function DriverBehaviorPage() {
  const [drivers, setDrivers] = useState<DriverSummary[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<DriverResult | null>(null);
  const [status, setStatus] = useState<{ msg: string; type: StatusType }>({
    msg: "loading drivers...",
    type: "loading",
  });

  useEffect(() => {
    api
      .listDrivers()
      .then((d) => {
        setDrivers(d);
        setStatus({ msg: `${d.length} drivers`, type: "" });
      })
      .catch((e) => setStatus({ msg: `error: ${(e as Error).message}`, type: "error" }));
  }, []);

  const select = async (id: number) => {
    setSelected(id);
    setResult(null);
    setStatus({ msg: "loading driver...", type: "loading" });
    try {
      const r = await api.getDriver(id);
      setResult(r);
      setStatus({ msg: `score ${r.score} · ${r.risk_level} risk`, type: "" });
    } catch (e) {
      setStatus({ msg: `error: ${(e as Error).message}`, type: "error" });
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <ServiceBackground />
      <Sidebar
        title="driver-behavior"
        subtitle="Seeded driver scorecards. Select a driver to view their dashboard."
      >
        <div className="scrollbar-thin flex-1 overflow-y-auto px-[14px] py-3">
          {drivers.map((d) => (
            <button
              key={d.driver_id}
              onClick={() => select(d.driver_id)}
              className={`mb-1.5 flex w-full items-center justify-between rounded-lg border px-3.5 py-2.5 text-left transition ${
                selected === d.driver_id
                  ? "border-accent-muted bg-[var(--accent-glow)]"
                  : "border-border bg-panel-raised hover:border-accent-muted"
              }`}
            >
              <span className="text-[13px] text-text">Driver #{d.driver_id}</span>
              <span className={`text-[13px] font-bold ${TIER_TEXT[d.risk_level]}`}>{d.score}</span>
            </button>
          ))}
        </div>
        <StatusBar message={status.msg} type={status.type} />
      </Sidebar>

      <div className="scrollbar-thin relative h-screen flex-1 overflow-y-auto bg-bg/60">
        {!result && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-text-mid drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
            <i className="fa-solid fa-id-card text-5xl" />
            <span className="text-sm">{selected ? "loading..." : "Select a driver"}</span>
          </div>
        )}
        {result && <DriverDashboard result={result} fileName={result.name ?? ""} />}
      </div>
    </div>
  );
}
