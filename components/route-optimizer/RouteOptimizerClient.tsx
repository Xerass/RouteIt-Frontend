"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./route-optimizer.css";
import { submitRoute, pollRoute, type RouteResult, type WaypointWeather } from "@/lib/routeOptimizer";

type Pt = [number, number]; // [lon, lat]
interface Poi { name: string; type: string; lat: number; lon: number; }

const MAX_WP = 8;
const POI_DATA_URL = "/route-optimizer/locations.json";

const POI_ICONS: Record<string, string> = {
  airport: "fa-plane", stadium: "fa-futbol", mall: "fa-cart-shopping",
  university: "fa-graduation-cap", museum: "fa-landmark", cinema: "fa-film",
  hospital: "fa-hospital", tourism: "fa-camera", resort: "fa-umbrella-beach",
  park: "fa-tree", bus_station: "fa-bus", hotel: "fa-bed",
  government: "fa-building-columns", library: "fa-book", police: "fa-shield-halved",
  fire_station: "fa-fire-extinguisher", bank: "fa-money-bill", fuel: "fa-gas-pump",
  school: "fa-school", market: "fa-store", other: "fa-location-dot",
  warehouse: "fa-warehouse",
};
const POI_ZOOM: Record<string, number> = {
  airport: 8, stadium: 8, mall: 10, university: 10, museum: 10, cinema: 10,
  hospital: 11, tourism: 11, resort: 11, park: 11, bus_station: 11,
  hotel: 12, government: 12, library: 12, police: 13, fire_station: 13,
  bank: 13, fuel: 13, market: 13, school: 14, other: 14,
  warehouse: 8,
};
const WEATHER_NAMES: Record<number, string> = {
  0: "Clear", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Fog", 48: "Rime fog", 51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
  61: "Light rain", 63: "Rain", 65: "Heavy rain", 71: "Light snow", 73: "Snow",
  75: "Heavy snow", 80: "Light showers", 81: "Showers", 82: "Heavy showers",
  95: "Thunderstorm", 96: "Hail storm", 99: "Severe storm",
};

function makeIcon(label: number) {
  return L.divIcon({
    className: "",
    html: `<div class="custom-marker"></div><div class="custom-marker-label">${label}</div>`,
    iconSize: [14, 14], iconAnchor: [7, 7],
  });
}

export default function RouteOptimizerClient() {
  const mapElRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const poiLayerRef = useRef<L.LayerGroup | null>(null);
  const allPoisRef = useRef<Poi[]>([]);
  const waypointsRef = useRef<Pt[]>([]);
  // leaflet listeners are registered once; route them through a ref so they
  // always call the latest closures (avoids stale-state bugs)
  const cbRef = useRef<{
    onMapClick?: (e: L.LeafletMouseEvent) => void;
    poiClick?: (poi: Poi) => void;
  }>({});

  const [waypoints, setWaypoints] = useState<Pt[]>([]);
  const [names, setNames] = useState<(string | null)[]>([]);
  const [startIndex, setStartIndex] = useState<number | null>(null);
  const [endIndex, setEndIndex] = useState<number | null>(null);
  const [optimize, setOptimize] = useState(false);
  const [dynamic, setDynamic] = useState(false);
  const [stats, setStats] = useState<{ distance: number; duration: number } | null>(null);
  const [conditions, setConditions] = useState<
    { weather: WaypointWeather[]; order: number[]; adjusted: number; note?: string } | null
  >(null);
  const [status, setStatus] = useState<{ msg: string; type: string }>({ msg: "ready", type: "" });
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Poi[]>([]);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const setStatusMsg = (msg: string, type = "") => setStatus({ msg, type });
  useEffect(() => { waypointsRef.current = waypoints; }, [waypoints]);

  // ---- waypoint ops (state only; markers sync via effect below) ----
  const clearRoute = () => {
    if (routeLayerRef.current && mapRef.current) mapRef.current.removeLayer(routeLayerRef.current);
    routeLayerRef.current = null;
    setStats(null);
    setConditions(null);
  };

  const addWaypoint = (lon: number, lat: number, name: string | null = null) => {
    if (waypointsRef.current.length >= MAX_WP) { setStatusMsg("Max 8 waypoints reached", "error"); return; }
    const num = waypointsRef.current.length + 1;
    setWaypoints((p) => [...p, [lon, lat]]);
    setNames((p) => [...p, name]);
    clearRoute();
    setStatusMsg(name ? `added ${name}` : `waypoint ${num} added`);
  };

  const removeWaypoint = (idx: number) => {
    setWaypoints((p) => p.filter((_, i) => i !== idx));
    setNames((p) => p.filter((_, i) => i !== idx));
    setStartIndex((s) => (s === idx ? null : s !== null && s > idx ? s - 1 : s));
    setEndIndex((e) => (e === idx ? null : e !== null && e > idx ? e - 1 : e));
    clearRoute();
  };

  const setStart = (idx: number) => {
    setStartIndex((s) => (s === idx ? null : idx));
    setEndIndex((e) => (e === idx ? null : e));
  };
  const setEnd = (idx: number) => {
    setEndIndex((e) => (e === idx ? null : idx));
    setStartIndex((s) => (s === idx ? null : s));
  };

  const findNearestPoi = (lat: number, lon: number, threshold: number): Poi | null => {
    let best: Poi | null = null;
    let bestDist = threshold;
    for (const p of allPoisRef.current) {
      const d = Math.hypot(p.lat - lat, p.lon - lon);
      if (d < bestDist) { bestDist = d; best = p; }
    }
    return best;
  };

  // keep leaflet callbacks pointing at the latest closures (runs every render)
  useEffect(() => {
    cbRef.current.onMapClick = (e) => {
      const lon = e.latlng.lng, lat = e.latlng.lat;
      const near = findNearestPoi(lat, lon, 0.002);
      if (near) addWaypoint(near.lon, near.lat, near.name);
      else addWaypoint(lon, lat);
    };
    cbRef.current.poiClick = (poi) => addWaypoint(poi.lon, poi.lat, poi.name);
  });

  // ---- map init (once) ----
  useEffect(() => {
    if (mapRef.current || !mapElRef.current) return;
    let cancelled = false;

    const bounds = L.latLngBounds([12.4, 122.8], [14.4, 124.8]);
    const map = L.map(mapElRef.current, {
      zoomControl: false, maxBounds: bounds, maxBoundsViscosity: 1.0, minZoom: 8,
    }).setView([13.1594, 123.7103], 9);
    mapRef.current = map;

    L.control.zoom({ position: "topright" }).addTo(map);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a> | &copy; <a href="https://osm.org/copyright">OSM</a>',
      maxZoom: 19,
    }).addTo(map);

    const poiLayer = L.layerGroup().addTo(map);
    poiLayerRef.current = poiLayer;

    const updatePoiMarkers = () => {
      poiLayer.clearLayers();
      const zoom = map.getZoom();
      const b = map.getBounds();
      for (const poi of allPoisRef.current) {
        if (zoom < (POI_ZOOM[poi.type] ?? 14)) continue;
        const ll = L.latLng(poi.lat, poi.lon);
        if (!b.contains(ll)) continue;
        const icon = POI_ICONS[poi.type] || "fa-location-dot";
        const m = L.marker(ll, {
          icon: L.divIcon({
            className: "",
            html: `<div class="poi-marker"><i class="fa-solid ${icon}"></i></div>`,
            iconSize: [24, 24], iconAnchor: [12, 12],
          }),
        });
        m.bindTooltip(poi.name, { className: "poi-tooltip", direction: "top", offset: [0, -14] });
        m.on("click", () => cbRef.current.poiClick?.(poi));
        poiLayer.addLayer(m);
      }
    };

    map.on("zoomend", updatePoiMarkers);
    map.on("moveend", updatePoiMarkers);
    map.on("click", (e) => cbRef.current.onMapClick?.(e as L.LeafletMouseEvent));

    fetch(POI_DATA_URL)
      .then((r) => r.json())
      .then((data: Poi[]) => { if (!cancelled) { allPoisRef.current = data; updatePoiMarkers(); } });

    // resize map whenever its container changes (sidebar collapse, window resize)
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(mapElRef.current);

    return () => {
      cancelled = true;
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ---- sync waypoint markers from state ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = waypoints.map((wp, i) => {
      const marker = L.marker([wp[1], wp[0]], { icon: makeIcon(i + 1), draggable: true }).addTo(map);
      marker.on("dragend", (e) => {
        const pos = (e.target as L.Marker).getLatLng();
        setWaypoints((p) => { const n = [...p]; n[i] = [pos.lng, pos.lat]; return n; });
        clearRoute();
      });
      return marker;
    });
  }, [waypoints]);

  // ---- search (debounced) ----
  // all setState happens inside the timeout (not synchronously in the effect
  // body) to satisfy react-hooks/set-state-in-effect
  useEffect(() => {
    const q = query.trim().toLowerCase();
    const t = setTimeout(() => {
      if (q.length < 2) {
        setResults([]);
        setResultsOpen(false);
        return;
      }
      setResults(allPoisRef.current.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 20));
      setResultsOpen(true);
    }, 150);
    return () => clearTimeout(t);
  }, [query]);

  // ---- calculate (submit + poll) ----
  const drawRoute = (segments: Pt[][]) => {
    const map = mapRef.current!;
    const layer = L.layerGroup().addTo(map);
    segments.forEach((seg) => {
      const latlngs = seg.map((c) => [c[1], c[0]] as [number, number]);
      L.polyline(latlngs, { color: "#3dd68c", weight: 8, opacity: 0.15 }).addTo(layer);
      L.polyline(latlngs, { color: "#3dd68c", weight: 3, opacity: 0.9 }).addTo(layer);
    });
    routeLayerRef.current = layer;
  };

  const applyResult = (r: RouteResult) => {
    drawRoute(r.segments);
    if (optimize && r.optimized_waypoints) {
      setNames((prev) => r.order.map((i) => prev[i]));
      setWaypoints(r.optimized_waypoints);
      setStartIndex((s) => (s !== null ? r.order.indexOf(s) : s));
      setEndIndex((e) => (e !== null ? r.order.indexOf(e) : e));
    }
    setStats({ distance: r.distance, duration: r.duration });
    setConditions(
      r.dynamic
        ? { weather: r.dynamic.waypoint_weather, order: r.order, adjusted: r.adjusted_duration, note: r.dynamic.note }
        : null,
    );
    setStatusMsg(`route found — ${(r.distance / 1000).toFixed(2)} km`);
  };

  const calculate = async () => {
    if (waypoints.length < 2) return;
    clearRoute();
    setBusy(true);
    setStatusMsg("calculating route...", "loading");
    try {
      const { statusUrl } = await submitRoute({
        waypoints, optimize, dynamic, start_index: startIndex, end_index: endIndex,
      });
      applyResult(await pollRoute(statusUrl));
    } catch (err) {
      setStatusMsg(`error: ${(err as Error).message}`, "error");
    } finally {
      setBusy(false);
    }
  };

  const clearAll = () => {
    setWaypoints([]); setNames([]); setStartIndex(null); setEndIndex(null);
    clearRoute(); setStatusMsg("cleared");
  };

  const orderedWeather = conditions ? conditions.order.map((i) => conditions.weather[i]) : [];

  return (
    <div className="ro-root">
      <div className={`sidebar ${collapsed ? "collapsed" : ""}`} id="sidebar">
        <button className="sidebar-toggle" onClick={() => setCollapsed((c) => !c)}>
          <i className="fa-solid fa-chevron-left" />
        </button>

        <div className="sidebar-header">
          <h1>route-optimizer</h1>
          <p>Click the map to drop waypoints. Max 8.</p>
          <p style={{ marginTop: 6 }}>
            <Link href="/" style={{ color: "var(--accent)" }}>&larr; back to platform</Link>
          </p>
        </div>

        <div className="search-section">
          <div className="search-box">
            <input
              type="text" value={query} placeholder="Search locations..." autoComplete="off"
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") setResultsOpen(false); }}
            />
          </div>
          <div className={`search-results ${resultsOpen ? "visible" : ""}`}>
            {results.length === 0 ? (
              <div className="search-result-item">
                <span className="search-result-name" style={{ color: "var(--text-dim)" }}>No results</span>
              </div>
            ) : (
              results.map((p, i) => (
                <div
                  key={`${p.name}-${i}`} className="search-result-item"
                  onClick={() => {
                    addWaypoint(p.lon, p.lat, p.name);
                    mapRef.current?.setView([p.lat, p.lon], 14);
                    setQuery(""); setResultsOpen(false);
                  }}
                >
                  <span className="search-result-icon"><i className={`fa-solid ${POI_ICONS[p.type] || "fa-location-dot"}`} /></span>
                  <div className="search-result-info">
                    <div className="search-result-name">{p.name}</div>
                    <div className="search-result-type">{p.type.replace("_", " ")}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="controls">
          <div className="toggle-row">
            <label htmlFor="optimizeToggle">Optimize route (TSP)</label>
            <div className="switch">
              <input id="optimizeToggle" type="checkbox" checked={optimize} onChange={(e) => setOptimize(e.target.checked)} />
              <span className="slider" />
            </div>
          </div>
          <div className="toggle-row">
            <label htmlFor="dynamicToggle">Dynamic conditions</label>
            <div className="switch">
              <input id="dynamicToggle" type="checkbox" checked={dynamic} onChange={(e) => setDynamic(e.target.checked)} />
              <span className="slider" />
            </div>
          </div>
          <div className="btn-row">
            <button className="btn btn-primary" disabled={waypoints.length < 2 || busy} onClick={calculate}>CALCULATE</button>
            <button className="btn btn-danger" onClick={clearAll}>CLEAR</button>
          </div>
        </div>

        <div className="waypoint-list">
          {waypoints.length === 0 ? (
            <div className="empty-state">Click anywhere on the map<br />to add waypoints</div>
          ) : (
            waypoints.map((wp, i) => (
              <div key={i} className={`waypoint-item ${startIndex === i ? "is-start" : ""} ${endIndex === i ? "is-end" : ""}`}>
                <div className="waypoint-number">{i + 1}</div>
                <div className="waypoint-info">
                  {names[i] ? (
                    <>
                      <div className="waypoint-name">{names[i]}</div>
                      <div className="waypoint-coords-sub">{wp[1].toFixed(4)}, {wp[0].toFixed(4)}</div>
                    </>
                  ) : (
                    <div className="waypoint-coords">{wp[1].toFixed(4)}, {wp[0].toFixed(4)}</div>
                  )}
                </div>
                <div className="waypoint-role-btns">
                  <button className={`role-btn ${startIndex === i ? "active-start" : ""}`} title="Set as start" onClick={() => setStart(i)}>
                    <i className="fa-solid fa-flag" />
                  </button>
                  <button className={`role-btn ${endIndex === i ? "active-end" : ""}`} title="Set as end" onClick={() => setEnd(i)}>
                    <i className="fa-solid fa-location-crosshairs" />
                  </button>
                </div>
                <button className="waypoint-remove" onClick={() => removeWaypoint(i)}>×</button>
              </div>
            ))
          )}
        </div>

        <div className={`route-stats ${stats ? "visible" : ""}`}>
          <div className="stat-row"><span className="stat-label">Distance</span><span className="stat-value">{stats ? `${(stats.distance / 1000).toFixed(2)} km` : "—"}</span></div>
          <div className="stat-row"><span className="stat-label">Duration</span><span className="stat-value">{stats ? `${(stats.duration / 60).toFixed(1)} min` : "—"}</span></div>
          <div className="stat-row"><span className="stat-label">Waypoints</span><span className="stat-value">{waypoints.length}</span></div>
        </div>

        <div className={`conditions-panel ${conditions ? "visible" : ""}`}>
          <div className="conditions-header">conditions</div>
          <div className="conditions-waypoints">
            {orderedWeather.map((w, i) => {
              const name = WEATHER_NAMES[w.weather_code] || `Code ${w.weather_code}`;
              const pct = ((w.penalty - 1) * 100).toFixed(0);
              const penaltyStr = w.penalty > 1.0 ? `+${pct}%` : "none";
              const cls = w.penalty >= 1.3 ? "penalty-high" : w.penalty > 1.0 ? "penalty-mid" : "penalty-ok";
              return (
                <div className="cond-waypoint" key={i}>
                  <div className="cond-wp-number">{i + 1}</div>
                  <div className="cond-wp-detail">
                    <span className="cond-wp-weather">{name}</span>
                    <span className="cond-wp-sub">{w.precipitation_mm}mm rain, {w.wind_kmh}km/h wind</span>
                  </div>
                  <div className={`cond-wp-penalty ${cls}`}>{penaltyStr}</div>
                </div>
              );
            })}
          </div>
          <div className="stat-row conditions-adjusted">
            <span className="stat-label">Adj. duration</span>
            <span className="stat-value">{conditions ? `${(conditions.adjusted / 60).toFixed(1)} min` : "—"}</span>
          </div>
          {conditions?.note && (
            <div className="cond-wp-sub" style={{ marginTop: 8 }}>{conditions.note}</div>
          )}
        </div>

        <div className={`status-bar ${status.type}`}>{status.msg}</div>
      </div>

      <div className="ro-map-wrap" style={{ flex: 1, position: "relative" }}>
        <div id="map" ref={mapElRef} style={{ height: "100vh", width: "100%" }} />
      </div>
    </div>
  );
}