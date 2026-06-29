//route_optimizer service API client.
import {API_BASE, absolute, errorMessage} from "./apiClient";

//selectable map locations (POIs), served from Postgres by the backend. Same
//shape the old public/route-optimizer/locations.json used.
export interface Location {
  name: string;
  type: string;
  lat: number;
  lon: number;
}

export async function fetchLocations(): Promise<Location[]> {
  const res = await fetch(`${API_BASE}/route-optimizer/locations`);
  if (!res.ok) throw new Error(await errorMessage(res, "Failed to load locations"));
  return res.json();
}

export interface WaypointWeather {
  waypoint: number;
  coords: [number, number];
  precipitation_mm: number;
  wind_kmh: number;
  weather_code: number;
  penalty: number;
}

export interface RouteResult {
  segments: [number, number][][]; //each segment is a list of [lon, lat]
  distance: number;               //meters
  duration: number;               //seconds
  adjusted_duration: number;      //seconds
  order: number[];
  optimized_waypoints: [number, number][];
  dynamic?: { waypoint_weather: WaypointWeather[]; note?: string };
}

//utlizes jobs instead of session since persistent model use and states are unnecessary
//just queing of A* calls
interface JobSnapshot {
  job_id: string;
  status: "pending" | "running" | "done" | "error";
  result?: RouteResult;
  error?: string;
}

export interface RouteRequest {
  waypoints: [number, number][];
  optimize: boolean;
  dynamic: boolean;
  start_index: number | null;
  end_index: number | null;
}

export async function submitRoute(req: RouteRequest): Promise<{ statusUrl: string }>{
    const res = await fetch(`${API_BASE}/route-optimizer/route`, {method: "POST",headers: { "Content-Type": "application/json" },body: JSON.stringify(req),} )
    const data =await res.json();
    if (!res.ok) throw new Error(data.error || "Route request failed");
    return {statusUrl: data.status_url as string};
}

//poll for result
export async function pollRoute(statusUrl: string,{ intervalMs = 1000, timeoutMs = 90000 } = {},): Promise<RouteResult>{
  const url = absolute(statusUrl);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const snap: JobSnapshot = await (await fetch(url)).json();
    if (snap.status === "done") return snap.result!;
    if (snap.status === "error") throw new Error(snap.error || "Routing failed");
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("Routing timed out");
}
