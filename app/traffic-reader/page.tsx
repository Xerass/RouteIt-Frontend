"use client";

import { useEffect, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";
import ModeTabs, { type ModeTab } from "@/components/ModeTabs";
import FileDrop from "@/components/FileDrop";
import AnalyticsPanel, { type AnalyticsRow } from "@/components/AnalyticsPanel";
import StatusBar, { type StatusType } from "@/components/StatusBar";
import * as api from "@/lib/trafficReader";
import type { TrafficStatus } from "@/lib/trafficReader";

type Mode = "upload" | "stream";
type View = "idle" | "calibrating" | "feeding" | "ended";
type Point = { x: number; y: number };

const DEFAULT_START = "0.0,0.0";
const DEFAULT_END = "1.0,1.0";

const MODE_TABS: ModeTab[] = [
  { mode: "upload", label: "Upload", icon: "fa-solid fa-file-video" },
  { mode: "stream", label: "Stream", icon: "fa-solid fa-tower-broadcast" },
];

export default function TrafficReaderPage() {
  const [mode, setMode] = useState<Mode>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [streamUrl, setStreamUrl] = useState("");

  const [view, setView] = useState<View>("idle");
  const [status, setStatus] = useState<{ msg: string; type: StatusType }>({
    msg: "ready",
    type: "",
  });
  const [analytics, setAnalytics] = useState<TrafficStatus | null>(null);
  const [feedSrc, setFeedSrc] = useState("");
  const [endedMsg, setEndedMsg] = useState("Video processing complete");
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [points, setPoints] = useState<Point[]>([]);
  const lineRef = useRef({ start: DEFAULT_START, end: DEFAULT_END });
  const calibImgRef = useRef<HTMLImageElement | null>(null);

  const feedAreaRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const setStatusMsg = (msg: string, type: StatusType = "") =>
    setStatus({ msg, type });

  const canStart = mode === "upload" ? !!file : streamUrl.trim() !== "";
  const startDisabled =
    !canStart || view === "calibrating" || view === "feeding";
  const stopDisabled = view !== "feeding";
  const showResetLine = view === "feeding" || view === "ended";
  const analyticsVisible = view === "feeding" || view === "ended";

  // ----- analytics polling: runs while a session id is set -----
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    const tick = async () => {
      try {
        const data = await api.getStatus(sessionId);
        if (cancelled) return;
        setAnalytics(data);
        if (!data.active) {
          clearInterval(timer);
          setEndedMsg(
            data.error ? `Error: ${data.error}` : "Video processing complete",
          );
          setStatusMsg(
            data.error ? `error: ${data.error}` : "video processing complete",
            data.error ? "error" : "",
          );
          setView("ended");
          setSessionId(null);
        }
      } catch {
        // transient network error — keep polling
      }
    };

    const timer = setInterval(tick, 1000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [sessionId]);

  // ----- draw the calibration frame whenever the image or points change -----
  useEffect(() => {
    if (view !== "calibrating") return;
    const canvas = canvasRef.current;
    const area = feedAreaRef.current;
    const img = calibImgRef.current;
    if (!canvas || !area || !img) return;

    const rect = area.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cw = canvas.width;
    const ch = canvas.height;
    ctx.drawImage(img, 0, 0, cw, ch);

    points.forEach((pt, i) => {
      const px = pt.x * cw;
      const py = pt.y * ch;
      ctx.beginPath();
      ctx.arc(px, py, 8, 0, Math.PI * 2);
      ctx.fillStyle = i === 0 ? "#00ffcc" : "#ff4466";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.font = "14px monospace";
      ctx.fillText(i === 0 ? "START" : "END", px + 12, py - 4);
    });

    if (points.length === 2) {
      ctx.beginPath();
      ctx.moveTo(points[0].x * cw, points[0].y * ch);
      ctx.lineTo(points[1].x * cw, points[1].y * ch);
      ctx.strokeStyle = "#00ffcc";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [view, points]);

  // ----- flow -----
  const startPreview = async () => {
    setStatusMsg("fetching preview frame...", "loading");
    try {
      const blob = await api.preview(
        mode === "upload" ? { file: file! } : { url: streamUrl.trim() },
      );
      const img = new Image();
      img.onload = () => {
        calibImgRef.current = img;
        setPoints([]);
        setView("calibrating");
        setStatusMsg("click start point of intersection line");
      };
      img.src = URL.createObjectURL(blob);
    } catch (err) {
      setStatusMsg((err as Error).message || "Preview failed", "error");
    }
  };

  const onCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (view !== "calibrating" || points.length >= 2) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const next = [...points, { x, y }];
    setPoints(next);
    setStatusMsg(
      next.length === 1
        ? "click end point of intersection line"
        : "line set — confirm or reset",
    );
  };

  const exitCalibration = () => {
    if (calibImgRef.current) {
      URL.revokeObjectURL(calibImgRef.current.src);
      calibImgRef.current = null;
    }
  };

  const launchFeed = async () => {
    exitCalibration();
    const { start, end } = lineRef.current;
    setStatusMsg(
      mode === "upload" ? "uploading video..." : "connecting to stream...",
      "loading",
    );
    try {
      const data =
        mode === "upload"
          ? await api.uploadVideo(file!, start, end)
          : await api.startStream(streamUrl.trim(), start, end);
      setFeedSrc(api.absolute(data.feed_url));
      setAnalytics(null);
      setView("feeding");
      setSessionId(data.session_id);
      setStatusMsg(
        mode === "upload" ? "processing video..." : "streaming...",
        "loading",
      );
    } catch (err) {
      setStatusMsg((err as Error).message || "Failed to start", "error");
      setView("idle");
    }
  };

  const onConfirmLine = () => {
    const [p0, p1] = points;
    lineRef.current = {
      start: `${p0.x.toFixed(4)},${p0.y.toFixed(4)}`,
      end: `${p1.x.toFixed(4)},${p1.y.toFixed(4)}`,
    };
    launchFeed();
  };

  const onResetLine = () => {
    setPoints([]);
    setStatusMsg("click start point of intersection line");
  };

  const onSkipLine = () => {
    lineRef.current = { start: DEFAULT_START, end: DEFAULT_END };
    launchFeed();
  };

  const stopFeed = async () => {
    if (sessionId) await api.stopSession(sessionId);
    setSessionId(null);
    setFeedSrc("");
  };

  const onStop = async () => {
    await stopFeed();
    setView("idle");
    setAnalytics(null);
    setStatusMsg("stopped");
  };

  const onResetLineRestart = async () => {
    await stopFeed();
    startPreview();
  };

  // ----- analytics rows -----
  const a = analytics;
  const dash = "—";
  const rows: AnalyticsRow[] = [
    { label: "Status", value: a?.status ?? dash },
    { label: "Vehicles", value: a?.density ?? dash },
    {
      label: "Avg velocity",
      value: a?.avg_velocity != null ? `${a.avg_velocity} px/f` : dash,
    },
    { label: "Crossings", value: a?.crossing_count ?? dash },
    "divider",
    { label: "Cars", value: a?.detections?.car ?? dash },
    { label: "Buses", value: a?.detections?.bus ?? dash },
    { label: "Vans", value: a?.detections?.van ?? dash },
    { label: "Others", value: a?.detections?.others ?? dash },
  ];

  const btnBase =
    "rounded-lg px-4 py-[11px] text-[11.5px] font-semibold uppercase tracking-[0.8px] transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-30";
  const smallBtn =
    "rounded-lg px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.8px] transition active:scale-[0.97]";

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        title="traffic-reader"
        subtitle="Upload a video or connect a live stream for real-time vehicle detection."
      >
        <ModeTabs
          tabs={MODE_TABS}
          active={mode}
          onChange={(m) => setMode(m as Mode)}
        />

        {mode === "upload" ? (
          <FileDrop
            accept=".mp4,.avi,.mov,.mkv,.webm"
            hint=".mp4 .avi .mov .mkv .webm"
            fileName={file?.name ?? ""}
            onFile={setFile}
          />
        ) : (
          <div className="px-[22px] py-[18px]">
            <input
              type="text"
              value={streamUrl}
              onChange={(e) => setStreamUrl(e.target.value)}
              placeholder="rtsp:// or http:// stream URL"
              autoComplete="off"
              className="w-full rounded-lg border border-border bg-bg px-3.5 py-2.5 text-[12.5px] text-text outline-none transition-colors placeholder:text-text-dim focus:border-accent-muted"
            />
          </div>
        )}

        <div className="border-b border-border px-[22px] py-[18px]">
          <div className="flex gap-2.5">
            <button
              onClick={startPreview}
              disabled={startDisabled}
              className={`${btnBase} flex-1 bg-accent text-bg shadow-[0_2px_12px_var(--accent-glow)] hover:bg-accent-muted hover:shadow-[0_2px_20px_var(--accent-glow-strong)]`}
            >
              Start
            </button>
            <button
              onClick={onStop}
              disabled={stopDisabled}
              className={`${btnBase} flex-1 border border-[rgba(217,78,78,0.2)] bg-[var(--danger-muted)] text-danger hover:bg-danger hover:text-white`}
            >
              Stop
            </button>
          </div>
          {showResetLine && (
            <button
              onClick={onResetLineRestart}
              className={`${smallBtn} mt-2 w-full border border-border bg-panel-raised text-text hover:border-accent-muted`}
            >
              <i className="fa-solid fa-crosshairs" /> Reset Line
            </button>
          )}
        </div>

        <AnalyticsPanel
          title="analytics"
          rows={rows}
          visible={analyticsVisible}
        />

        <StatusBar message={status.msg} type={status.type} />
      </Sidebar>

      {/* feed area */}
      <div
        ref={feedAreaRef}
        className="relative flex h-screen flex-1 items-center justify-center overflow-hidden bg-bg"
      >
        {view === "idle" && (
          <div className="flex flex-col items-center gap-4 text-text-dim">
            <i className="fa-solid fa-video text-5xl" />
            <span className="text-sm">No active feed</span>
          </div>
        )}

        {(view === "feeding" || view === "ended") && feedSrc && (
          // MJPEG stream from the backend; plain <img> (not next/image) so the
          // multipart stream is consumed directly by the browser.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={feedSrc}
            alt="annotated feed"
            className="max-h-full max-w-full object-contain"
          />
        )}

        {view === "ended" && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70">
            <i className="fa-solid fa-flag-checkered text-5xl text-accent" />
            <span className="text-base text-text">{endedMsg}</span>
          </div>
        )}

        {/* calibration overlay */}
        {view === "calibrating" && (
          <>
            <canvas
              ref={canvasRef}
              onClick={onCanvasClick}
              className="absolute inset-0 z-10 h-full w-full cursor-crosshair"
            />
            {points.length < 2 && (
              <div className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-md bg-black/75 px-4 py-2 font-mono text-sm text-[#00ffcc]">
                Click two points to define the intersection line
              </div>
            )}
            {points.length === 2 && (
              <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2">
                <button
                  onClick={onConfirmLine}
                  className={`${smallBtn} bg-accent text-bg hover:bg-accent-muted`}
                >
                  Confirm Line
                </button>
                <button
                  onClick={onResetLine}
                  className={`${smallBtn} border border-[rgba(217,78,78,0.2)] bg-[var(--danger-muted)] text-danger hover:bg-danger hover:text-white`}
                >
                  Reset
                </button>
                <button
                  onClick={onSkipLine}
                  className={`${smallBtn} border border-border bg-panel-raised text-text hover:border-accent-muted`}
                >
                  Skip
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
