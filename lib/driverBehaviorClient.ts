import { API_BASE, errorMessage } from "./apiClient";

//mirror model.predict()
export interface BehaviorMix {
  pct_normal: number;
  pct_drowsy: number;
  pct_aggressive: number;
}

//mirror driver_score.summarize_driver
export interface Telemetry {
  n_trips: number;
  total_duration_s: number | null;
  total_distance_km: number | null;
  speed_mean: number | null;
  speed_max: number | null;
  pct_over_limit: number | null;
  max_overspeed: number | null;
  pct_tailgating: number | null;
  min_ttc: number | null;
  min_dist_lead: number | null;
  pct_with_lead: number | null;
  harsh_accel_count: number;
  harsh_brake_count: number;
  harsh_turn_count: number;
  jerk_std: number | null;
  lane_wander_std: number | null;
  course_var_std: number | null;
  n_vehicles_mean: number | null;
  road_type_mix: Record<string, number>;
  route_adherence_mean: number | null;
  pct_trips_late: number | null;
}

//Driver specific results
export interface DriverResult {
  driver_id: number;
  name?: string | null;
  score: number;
  risk_level: "Low" | "Medium" | "High";
  recommendation: string;

  //scorecard factors, each 0..1
  risk: number;
  over_limit: number;
  low_ttc: number;
  adherence: number;
  timeliness: number;

  //points each factor subtracted from 100 (factor * weight)
  pts_risk: number;
  pts_over_limit: number;
  pts_low_ttc: number;
  pts_adherence: number;
  pts_timeliness: number;

  behavior_mix: BehaviorMix;
  telemetry: Telemetry;
}

//the list endpoint returns the scorecard without telemetry (Driver.to_dict)
export type DriverSummary = Omit<DriverResult, "telemetry">;

export async function listDrivers(): Promise<DriverSummary[]> {
  const res = await fetch(`${API_BASE}/driver-behavior/drivers`);
  if (!res.ok) throw new Error(await errorMessage(res, "Failed to load drivers"));
  return res.json();
}

export async function getDriver(id: number): Promise<DriverResult> {
  const res = await fetch(`${API_BASE}/driver-behavior/drivers/${id}`);
  if (!res.ok) throw new Error(await errorMessage(res, "Failed to load driver"));
  return res.json();
}
