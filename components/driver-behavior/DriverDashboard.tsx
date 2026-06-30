"use client";

import type { DriverResult } from "@/lib/driverBehaviorClient";

//tier -> theme color. Low green, Medium warm/amber, High danger/red.
const TIER = {
  Low: { text: "text-accent", fill: "var(--accent-glow-strong)" },
  Medium: { text: "text-warm", fill: "rgba(232,197,109,0.22)" },
  High: { text: "text-danger", fill: "var(--danger-muted)" },
} as const;

//score factors paired with human labels. pts_<key> is the deduction this
//factor made; result[key] is its underlying 0..1 rate.
const FACTORS = [
  { key: "over_limit", label: "Overspeeding", hint: "time over the limit" },
  { key: "low_ttc", label: "Tailgating", hint: "low time-to-collision" },
  { key: "risk", label: "Behavior risk", hint: "drowsy / aggressive" },
  { key: "adherence", label: "Route adherence", hint: "off-route fraction" },
  { key: "timeliness", label: "Late deliveries", hint: "trips delivered late" },
] as const;

const pct = (v: number | null) => (v == null ? "—" : `${Math.round(v * 100)}%`);
const num = (v: number | null, unit = "") => (v == null ? "—" : `${v}${unit}`);

//bar tint scales with how big a factor's deduction is relative to the worst one
const barColor = (ratio: number) =>
  ratio > 0.66
    ? "var(--color-danger)"
    : ratio > 0.33
      ? "var(--color-warm)"
      : "var(--color-accent-muted)";

function Metric({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-panel-raised px-4 py-3">
      <div className="text-[10px] uppercase tracking-[1px] text-text-dim">{label}</div>
      <div className="mt-1 text-[17px] font-semibold text-text">{value}</div>
      {sub && <div className="text-[10px] text-text-dim">{sub}</div>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[1.5px] text-text-mid">
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">{children}</div>
    </section>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <span className="flex items-center gap-1.5 text-text-dim">
      <span className={`inline-block h-2 w-2 rounded-full ${color}`} />
      {label} <span className="font-semibold text-text-mid">{Math.round(value * 100)}%</span>
    </span>
  );
}

export default function DriverDashboard({
  result,
  fileName,
}: {
  result: DriverResult;
  fileName: string;
}) {
  const tier = TIER[result.risk_level];
  const t = result.telemetry;
  const mix = result.behavior_mix;

  //rank factors by points lost — these are the strongest drivers of the score
  const breakdown = FACTORS.map((f) => ({
    ...f,
    pts: result[`pts_${f.key}` as keyof DriverResult] as number,
    rate: result[f.key as keyof DriverResult] as number,
  })).sort((a, b) => b.pts - a.pts);
  const maxPts = Math.max(...breakdown.map((f) => f.pts), 0.1);

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      {/* header */}
      <div className="mb-6 flex items-baseline justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text">Driver #{result.driver_id}</h2>
          <p className="text-xs text-text-dim">{fileName}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${tier.text}`}
          style={{ background: tier.fill }}
        >
          {result.risk_level} risk
        </span>
      </div>

      {/* score hero + breakdown */}
      <div className="mb-7 grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr]">
        <div
          className="flex flex-col items-center justify-center rounded-2xl border border-border bg-panel-raised py-8"
          style={{ boxShadow: `inset 0 0 0 1px ${tier.fill}` }}
        >
          <div className={`text-[64px] font-bold leading-none ${tier.text}`}>{result.score}</div>
          <div className="mt-1 text-[10px] uppercase tracking-[2px] text-text-dim">
            / 100 safety score
          </div>
          <div className="mt-4 rounded-lg bg-bg px-3 py-1.5 text-[12px] text-text-mid">
            <i className="fa-solid fa-flag mr-2 text-text-dim" />
            {result.recommendation}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-panel-raised p-5">
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-[1.5px] text-text-mid">
            what moved the score
          </div>
          <div className="flex flex-col gap-3.5">
            {breakdown.map((f) => (
              <div key={f.key}>
                <div className="mb-1 flex items-center justify-between text-[12px]">
                  <span className="text-text-mid">
                    {f.label} <span className="text-text-dim">· {f.hint}</span>
                  </span>
                  <span className="font-semibold text-text">
                    −{f.pts} pts <span className="text-text-dim">({pct(f.rate)})</span>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-bg">
                  <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{ width: `${(f.pts / maxPts) * 100}%`, background: barColor(f.pts / maxPts) }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* behavior mix */}
      <div className="mb-7 rounded-2xl border border-border bg-panel-raised p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[1.5px] text-text-mid">
            behavior mix
          </span>
          <span className="text-[10px] text-text-dim">model-derived, per window</span>
        </div>
        <div className="flex h-3 overflow-hidden rounded-full bg-bg">
          <div className="h-full bg-accent" style={{ width: `${mix.pct_normal * 100}%` }} />
          <div className="h-full bg-warm" style={{ width: `${mix.pct_drowsy * 100}%` }} />
          <div className="h-full bg-danger" style={{ width: `${mix.pct_aggressive * 100}%` }} />
        </div>
        <div className="mt-2.5 flex gap-5 text-[11px]">
          <Legend color="bg-accent" label="normal" value={mix.pct_normal} />
          <Legend color="bg-warm" label="drowsy" value={mix.pct_drowsy} />
          <Legend color="bg-danger" label="aggressive" value={mix.pct_aggressive} />
        </div>
      </div>

      {/* telemetry */}
      <Section title="trip">
        <Metric label="Trips" value={t.n_trips} />
        <Metric
          label="Duration"
          value={t.total_duration_s != null ? `${Math.round(t.total_duration_s / 60)} min` : "—"}
        />
        <Metric label="Distance" value={num(t.total_distance_km, " km")} />
        <Metric label="Vehicles seen" value={num(t.n_vehicles_mean)} sub="avg per frame" />
      </Section>

      <Section title="speed">
        <Metric label="Avg speed" value={num(t.speed_mean, " km/h")} />
        <Metric label="Max speed" value={num(t.speed_max, " km/h")} />
        <Metric label="Over limit" value={pct(t.pct_over_limit)} sub="of the time" />
        <Metric label="Max overspeed" value={num(t.max_overspeed, " km/h")} />
      </Section>

      <Section title="following">
        <Metric label="Tailgating" value={pct(t.pct_tailgating)} sub="low TTC" />
        <Metric label="Min TTC" value={num(t.min_ttc, " s")} />
        <Metric label="Min lead dist" value={num(t.min_dist_lead, " m")} />
        <Metric label="Lead present" value={pct(t.pct_with_lead)} sub="of the time" />
      </Section>

      <Section title="harsh events & control">
        <Metric label="Harsh accel" value={t.harsh_accel_count} />
        <Metric label="Harsh brake" value={t.harsh_brake_count} />
        <Metric label="Harsh turn" value={t.harsh_turn_count} />
        <Metric label="Jerk σ" value={num(t.jerk_std)} />
        <Metric label="Lane wander σ" value={num(t.lane_wander_std)} />
        <Metric label="Course var σ" value={num(t.course_var_std)} />
        <Metric label="Route adherence" value={pct(t.route_adherence_mean)} />
        <Metric label="Late trips" value={pct(t.pct_trips_late)} />
      </Section>

      {/* road type mix — only render the chips that exist */}
      {Object.keys(t.road_type_mix).length > 0 && (
        <section className="mb-2">
          <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[1.5px] text-text-mid">
            road type mix
          </h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(t.road_type_mix)
              .sort((a, b) => b[1] - a[1])
              .map(([road, frac]) => (
                <span
                  key={road}
                  className="rounded-md border border-border bg-panel-raised px-2.5 py-1 text-[11px] text-text-mid"
                >
                  {road} <span className="font-semibold text-accent">{Math.round(frac * 100)}%</span>
                </span>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}
