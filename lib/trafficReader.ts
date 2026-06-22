//traffic-reader service API client.

import { API_BASE, errorMessage } from "./api";

//re-export so consumers building feed URLs can do `api.absolute(...)`
export { absolute } from "./api";

const TR = `${API_BASE}/traffic-reader`;

export interface TrafficStatus {
  active: boolean;
  frames_processed: number;
  density: number;
  avg_velocity: number;
  crossing_count: number;
  status: string;
  detections: { car: number; bus: number; van: number; others: number };
  unique_ids: number;
  error?: string;
}

export interface FeedSession {
  feed_url: string;
  session_id: string;
}

//grab a single preview frame (as an image blob) for line calibration.
export async function preview(opts: { file?: File; url?: string }): Promise<Blob> {
  let res: Response;
  if (opts.file) {
    const form = new FormData();
    form.append("video", opts.file);
    res = await fetch(`${TR}/preview`, { method: "POST", body: form });
  } else {
    res = await fetch(`${TR}/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: opts.url }),
    });
  }
  if (!res.ok) throw new Error(await errorMessage(res, "Preview failed"));
  return res.blob();
}

export async function uploadVideo(
  file: File,
  lineStart: string,
  lineEnd: string,
): Promise<FeedSession> {
  const form = new FormData();
  form.append("video", file);
  form.append("line_start", lineStart);
  form.append("line_end", lineEnd);
  const res = await fetch(`${TR}/upload`, { method: "POST", body: form });
  if (!res.ok) throw new Error(await errorMessage(res, "Upload failed"));
  return res.json();
}

export async function startStream(
  url: string,
  lineStart: string,
  lineEnd: string,
): Promise<FeedSession> {
  const res = await fetch(`${TR}/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, line_start: lineStart, line_end: lineEnd }),
  });
  if (!res.ok) throw new Error(await errorMessage(res, "Stream failed"));
  return res.json();
}

export async function getStatus(sid: string): Promise<TrafficStatus> {
  const res = await fetch(`${TR}/status/${sid}`);
  return res.json();
}

export async function stopSession(sid: string): Promise<void> {
  try {
    await fetch(`${TR}/stop/${sid}`, { method: "POST" });
  } catch {
    //best-effort; the session also stops on its own when the feed ends
  }
}
