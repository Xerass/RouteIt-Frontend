"use client";

import { useEffect, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
import FileDrop from "@/components/FileDrop";
import AnalyticsPanel, { type AnalyticsRow } from "@/components/AnalyticsPanel";
import StatusBar, { type StatusType } from "@/components/StatusBar";
import * as api from "@/lib/damagedPackagesClient";
import type { DamageResult } from "@/lib/damagedPackagesClient";

export default function DamagedPackagesPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [result, setResult] = useState<DamageResult | null>(null);
  const [status, setStatus] = useState<{ msg: string; type: StatusType }>({ msg: "ready", type: "" });
  const [busy, setBusy] = useState(false);
  const previewRef = useRef("");

  //revoke the live object URL on unmount so previews dont leak
  useEffect(() => () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current); }, []);

  const onFile = (f: File) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const url = URL.createObjectURL(f);
    previewRef.current = url;
    setFile(f);
    setPreviewUrl(url);
    setResult(null);
    setStatus({ msg: `selected ${f.name}`, type: "" });
  };

  const analyze = async () => {
    if (!file) return;
    setBusy(true);
    setStatus({ msg: "analyzing...", type: "loading" });
    try {
      const r = await api.analyze(file);
      setResult(r);
      setStatus({ msg: `prediction: ${r.label}`, type: "" });
    } catch (e) {
      setStatus({ msg: `error: ${(e as Error).message}`, type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const clear = () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = "";
    setFile(null);
    setPreviewUrl("");
    setResult(null);
    setStatus({ msg: "cleared", type: "" });
  };

  const isDamaged = result?.label === "damaged";
  const rows: AnalyticsRow[] = result
    ? [
        { label: "Prediction", value: result.label },
        { label: "Confidence", value: `${(result.confidence * 100).toFixed(1)}%` },
        "divider",
        ...Object.entries(result.probabilities).map(([k, v]) => ({
          label: k,
          value: `${(v * 100).toFixed(1)}%`,
        })),
      ]
    : [];

  const btnBase =
    "rounded-lg px-4 py-[11px] text-[11.5px] font-semibold uppercase tracking-[0.8px] transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-30";

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        title="damaged-packages"
        subtitle="Upload a package photo to classify it as damaged or intact."
      >
        <FileDrop
          accept=".jpg,.jpeg,.png,.webp"
          hint=".jpg .png .webp"
          label="Drop a package image or click to browse"
          icon="fa-image"
          fileName={file?.name ?? ""}
          onFile={onFile}
        />

        <div className="border-b border-border px-[22px] py-[18px]">
          <div className="flex gap-2.5">
            <button
              onClick={analyze}
              disabled={!file || busy}
              className={`${btnBase} flex-1 bg-accent text-bg shadow-[0_2px_12px_var(--accent-glow)] hover:bg-accent-muted`}
            >
              Analyze
            </button>
            <button
              onClick={clear}
              className={`${btnBase} flex-1 border border-[rgba(217,78,78,0.2)] bg-[var(--danger-muted)] text-danger hover:bg-danger hover:text-white`}
            >
              Clear
            </button>
          </div>
        </div>

        <AnalyticsPanel title="result" rows={rows} visible={!!result} />
        <StatusBar message={status.msg} type={status.type} />
      </Sidebar>

      <div className="relative flex h-screen flex-1 items-center justify-center bg-bg p-8">
        {!previewUrl && (
          <div className="flex flex-col items-center gap-4 text-text-dim">
            <i className="fa-solid fa-box-open text-5xl" />
            <span className="text-sm">No image selected</span>
          </div>
        )}

        {previewUrl && (
          <div className="flex flex-col items-center gap-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="package"
              className={`max-h-[70vh] max-w-full rounded-xl border-2 object-contain ${
                result ? (isDamaged ? "border-danger" : "border-accent") : "border-border"
              }`}
            />
            {result && (
              <div
                className={`flex items-center gap-3 rounded-lg px-5 py-3 ${
                  isDamaged ? "bg-[var(--danger-muted)] text-danger" : "bg-[var(--accent-glow)] text-accent"
                }`}
              >
                <i className={`fa-solid ${isDamaged ? "fa-triangle-exclamation" : "fa-circle-check"} text-xl`} />
                <span className="text-lg font-bold uppercase tracking-wide">{result.label}</span>
                <span className="text-sm opacity-80">{(result.confidence * 100).toFixed(1)}%</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
