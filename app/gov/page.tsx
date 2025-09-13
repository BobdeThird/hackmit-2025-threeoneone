"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { MapPin, Navigation } from "lucide-react";

type CaseItem = {
  id: string;
  city: "sf" | "boston";
  category: string;
  description: string;
  address?: string;
  createdAt?: string;
  status?: string;
  coordinates?: [number, number];
};

type Feature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: CaseItem & { color: string };
};

type FeatureCollection = { type: "FeatureCollection"; features: Feature[] };

const palette = [
  "#60a5fa",
  "#34d399",
  "#fbbf24",
  "#f472b6",
  "#a78bfa",
  "#f87171",
  "#22d3ee",
  "#84cc16",
];

function colorForCategory(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
}

export default function GovPage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const mapboxToken = (process.env.NEXT_PUBLIC_MAPBOX_TOKEN as string) || "";
  const [items, setItems] = useState<CaseItem[]>([]);
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Build GeoJSON from items with deterministic color per category
  const geojson: FeatureCollection = useMemo(() => {
    const features: Feature[] = items
      .filter((i) => i.coordinates)
      .map((i) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: i.coordinates as [number, number] },
        properties: { ...i, color: colorForCategory(i.category || "Unknown") },
      }));
    return { type: "FeatureCollection", features };
  }, [items]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const f of geojson.features) {
      const key = f.properties.category || "Unknown";
      map.set(key, (map.get(key) || 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [geojson]);

  // Init map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [-122.4194, 37.7749],
      zoom: 10,
      pitch: 45,
      bearing: -10,
      antialias: true,
    });

    map.current.on("load", () => setMapReady(true));

    map.current.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: true }),
      "top-right"
    );

    map.current.on("style.load", () => {
      if (!map.current) return;
      const fog: mapboxgl.FogSpecification = {
        range: [2, 8],
        color: "hsl(220, 27%, 8%)",
        "high-color": "hsl(217, 91%, 60%)",
        "horizon-blend": 0.1,
      };
      // setFog is available in Mapbox GL JS v3+; cast for type safety across defs
      (map.current as unknown as { setFog?: (f: mapboxgl.FogSpecification) => void }).setFog?.(fog);
    });

    return () => map.current?.remove();
  }, [mapboxToken]);

  // Fetch ~1k 311 items once token present (so we can render immediately after)
  useEffect(() => {
    if (!mapboxToken) return;
    (async () => {
      try {
        const [sfRes, bosRes] = await Promise.all([
          fetch("/api/311/sf?limit=1000"),
          fetch("/api/311/boston?status=open&limit=1000"),
        ]);
        const [sf, bos] = await Promise.all([sfRes.json(), bosRes.json()]);
        const combined: CaseItem[] = [...(sf.items || []), ...(bos.items || [])];
        setItems(combined);
      } catch (e) {
        console.error("Failed to load 311 data", e);
      }
    })();
  }, [mapboxToken]);

  // Add or update non-clustered source + single points layer whenever geojson changes
  useEffect(() => {
    if (!map.current || !mapReady) return;
    const m = map.current;

    if (m.getSource("cases")) {
      (m.getSource("cases") as mapboxgl.GeoJSONSource).setData(geojson as unknown as GeoJSON.FeatureCollection);
    } else {
      m.addSource("cases", {
        type: "geojson",
        data: geojson as GeoJSON.FeatureCollection,
      });

      m.addLayer({
        id: "points",
        type: "circle",
        source: "cases",
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": 5.5,
          "circle-stroke-color": "#0b1020",
          "circle-stroke-width": 1.25,
          "circle-opacity": 0.95,
        },
      });

      // Click a point to show details
      m.on("click", "points", (e) => {
        const f = (e as mapboxgl.MapLayerMouseEvent).features?.[0] as unknown as Feature | undefined;
        if (!f) return;
        setSelectedFeature(f as Feature);
      });
      m.on("mouseenter", "points", () => (m.getCanvas().style.cursor = "pointer"));
      m.on("mouseleave", "points", () => (m.getCanvas().style.cursor = ""));
    }

    // Apply category filter on the single points layer
    if (selectedCategory) {
      m.setFilter("points", ["==", ["get", "category"], selectedCategory] as unknown as mapboxgl.Expression);
      // Fit to bounds
      const coords = geojson.features
        .filter((f) => f.properties.category === selectedCategory)
        .map((f) => f.geometry.coordinates);
      if (coords.length) {
        let minX = coords[0][0], maxX = coords[0][0], minY = coords[0][1], maxY = coords[0][1];
        for (const [x, y] of coords) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
        m.fitBounds(
          [
            [minX, minY],
            [maxX, maxY],
          ],
          { padding: 60, duration: 800 }
        );
      }
    } else {
      m.setFilter("points", undefined as unknown as mapboxgl.Expression);
    }
  }, [geojson, selectedCategory, mapReady]);

  if (!mapboxToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="glass-strong rounded-2xl p-6 max-w-md w-full mx-4 text-center space-y-3">
          <MapPin className="w-10 h-10 text-primary mx-auto" />
          <h2 className="text-xl font-semibold">Missing Mapbox token</h2>
          <p className="text-sm text-muted-foreground">
            Set <code className="px-1 rounded bg-secondary">NEXT_PUBLIC_MAPBOX_TOKEN</code> in your <code className="px-1 rounded bg-secondary">.env.local</code> and reload.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-background overflow-hidden">
      <div ref={mapContainer} className="absolute inset-0 map-container" />

      {/* Left overlay: category grouping */}
      <div className="absolute top-4 left-4 w-80 map-overlay animate-slide-in">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <Navigation className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Gov View</h1>
            <p className="text-xs text-muted-foreground">311 categories</p>
          </div>
        </div>

        {/* Simplified UI: remove extra quick actions */}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">Top categories</span>
            <span className="opacity-70">{geojson.features.length} issues</span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            <button
              className={`btn-glass text-left px-3 py-2 text-sm ${!selectedCategory ? "bg-primary/20" : ""}`}
              onClick={() => setSelectedCategory(null)}
            >
              All categories
            </button>
            {categoryCounts.map(([cat, count]) => (
              <button
                key={cat}
                className={`btn-glass text-left px-3 py-2 text-sm flex items-center justify-between ${
                  selectedCategory === cat ? "bg-primary/30 border-primary/50" : ""
                }`}
                onClick={() => setSelectedCategory(cat)}
              >
                <span className="truncate">{cat}</span>
                <span
                  className="ml-2 text-[10px] px-1.5 py-0.5 rounded"
                  style={{ background: colorForCategory(cat), color: "#0b1020" }}
                >
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right overlay: details */}
      <div className="absolute top-4 right-4 w-72 map-overlay animate-slide-in">
        <div className="text-center mb-3">
          <div className="w-12 h-12 bg-gradient-to-br from-primary to-map-accent rounded-full mx-auto mb-2 flex items-center justify-center">
            <MapPin className="w-6 h-6 text-white" />
          </div>
          <p className="text-xs text-muted-foreground">Issue details</p>
        </div>

        {selectedFeature ? (
          <div className="space-y-3">
            <div className="text-center">
              <h3 className="text-sm font-semibold mb-1">
                {selectedFeature.properties.category}
              </h3>
              <p className="text-xs text-muted-foreground mb-2 whitespace-pre-wrap">
                {selectedFeature.properties.description || "No description"}
              </p>
              {selectedFeature.properties.address ? (
                <p className="text-[11px] opacity-70">{selectedFeature.properties.address}</p>
              ) : null}
            </div>
            <div className="flex gap-2 text-xs">
              <span className="btn-glass flex-1 px-3 py-2">{selectedFeature.properties.city.toUpperCase()}</span>
              {selectedFeature.properties.status ? (
                <span className="btn-glass flex-1 px-3 py-2">{selectedFeature.properties.status}</span>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="text-center space-y-2">
            <p className="text-xs text-muted-foreground">Click any point to view details</p>
            <div className="flex items-center justify-center gap-1">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-1 h-1 bg-map-accent rounded-full animate-glow-pulse"
                  style={{ animationDelay: `${i * 0.5}s` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
        <div className="glass rounded-full px-4 py-2 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-map-accent rounded-full animate-glow-pulse"></div>
            <span>{geojson.features.length} Issues</span>
          </div>
        </div>
      </div>
    </div>
  );
}



