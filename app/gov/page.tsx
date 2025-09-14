"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { MapPin, Navigation, Brain } from "lucide-react";
import { PostDetailView } from "@/components/ui/post-detail-view";
import { ClaudePolicyModal } from "@/components/ui/claude-policy-modal";
import type { Post } from "@/lib/types";
import { supabase } from "@/lib/supabaseClient";
import { getUserVoteForPost } from "@/lib/vote-persistence";

type CaseItem = {
  id: string;
  city: "sf" | "boston" | "nyc";
  category: string;
  description: string;
  address?: string;
  createdAt?: string;
  status?: string;
  coordinates?: [number, number];
  images?: string[];
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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [deptPoints, setDeptPoints] = useState<{
    city: 'NYC' | 'BOSTON' | 'SF'
    department: string;
    address: string;
    coordinates: [number, number];
  }[]>([]);
  const [activeCity, setActiveCity] = useState<'BOSTON' | 'SF' | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [loadingPost, setLoadingPost] = useState(false);
  const [claudePolicyOpen, setClaudePolicyOpen] = useState(false);

  // Types for department API items and properties
  type DeptApiItem = {
    city: 'NYC' | 'BOSTON' | 'SF' | string
    department: string
    address: string
    coordinates: [number, number]
  }
  type DeptProperties = { city: 'NYC'|'BOSTON'|'SF'; department: string; address: string }

  // City preset snap
  const applyCityPreset = React.useCallback((key: 'BOSTON' | 'SF') => {
    if (!map.current) return;
    const m = map.current;
    const preset = CITY_PRESETS[key];
    setActiveCity(key);
    m.fitBounds(preset.bounds as unknown as mapboxgl.LngLatBoundsLike, {
      padding: { top: 40, right: 40, bottom: 40, left: 40 },
      duration: 800,
    });
    const onMoveEnd = () => {
      m.easeTo({
        center: preset.camera.center,
        zoom: preset.camera.zoom,
        pitch: preset.camera.pitch,
        bearing: preset.camera.bearing,
        duration: 800,
      });
    };
    if (m.isMoving()) {
      m.once('moveend', onMoveEnd);
    } else {
      onMoveEnd();
    }
  }, [])

  // Default map center
  const DEFAULT_CENTER: [number, number] = [-98.5795, 39.8283];

  type CityPreset = {
    camera: { center: [number, number]; zoom: number; pitch: number; bearing: number };
    bounds: [[number, number], [number, number]];
  };

  const CITY_PRESETS: Record<'BOSTON' | 'SF', CityPreset> = {
    BOSTON: {
      camera: {
        center: [-71.10854197159861, 42.31579034590908],
        zoom: 11.716079462000417,
        pitch: 45.00000000000001,
        bearing: -10,
      },
      bounds: [
        [-71.36999850470605, 42.2354273032376],
        [-70.90936796171755, 42.47620893272935],
      ],
    },
    SF: {
      camera: {
        center: [-122.45347499644797, 37.755113984001724],
        zoom: 11.939716839367692,
        pitch: 45.00000000000001,
        bearing: -10,
      },
      bounds: [
        [-122.67738729048725, 37.68153677225834],
        [-122.28290167423756, 37.9020490620171],
      ],
    },
  };

  // Build GeoJSON from items with deterministic color per category
  const geojson: FeatureCollection = useMemo(() => {
    const features: Feature[] = items
      .filter((i) => i.coordinates && (i.city === "boston" || i.city === "sf"))
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
      center: DEFAULT_CENTER,
      zoom: 3.5,
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
  }, [mapboxToken, DEFAULT_CENTER]);

  // Fetch items via unified API once token present
  useEffect(() => {
    if (!mapboxToken) return;
    (async () => {
      try {
        const res = await fetch("/api/reports?limit=10000");
        const json = await res.json();
        const combined: CaseItem[] = json.items || [];
        setItems(combined);
      } catch (e) {
        console.error("Failed to load 311 data", e);
      }
    })();
  }, [mapboxToken]);

  // Load department points for all supported cities
  useEffect(() => {
    if (!mapboxToken) return;
    (async () => {
      try {
        const cities: ('BOSTON'|'SF')[] = ['BOSTON','SF']
        const results = await Promise.all(
          cities.map(async (c) => {
            try {
              const res = await fetch(`/api/departments?city=${c}&list=all`)
              const json = await res.json()
              const items = (Array.isArray(json.items) ? json.items : []) as Partial<DeptApiItem>[]
              return items
                .filter((i): i is DeptApiItem => Array.isArray(i.coordinates) && i.coordinates!.length === 2 && typeof i.department === 'string' && typeof i.address === 'string' && typeof i.city === 'string')
                .map((i) => ({ city: i.city as 'NYC'|'BOSTON'|'SF', department: i.department, address: i.address, coordinates: i.coordinates as [number, number] }))
            } catch {
              return []
            }
          })
        )
        setDeptPoints(results.flat())
      } catch (e) {
        console.error('Failed to load department points', e)
        setDeptPoints([])
      }
    })()
  }, [mapboxToken])

  // Add or update non-clustered source + single points layer whenever geojson changes
  useEffect(() => {
    if (!map.current || !mapReady) return;
    const m = map.current;

    // Wait for style to be fully loaded before adding sources
    if (!m.isStyleLoaded()) {
      const onStyleLoad = () => {
        m.off('styledata', onStyleLoad);
        // Re-run this effect after style loads
        setTimeout(() => {
          if (m.getSource("cases")) {
            (m.getSource("cases") as mapboxgl.GeoJSONSource).setData(geojson as unknown as GeoJSON.FeatureCollection);
          } else {
            addMapSources();
          }
        }, 100);
      };
      m.on('styledata', onStyleLoad);
      return;
    }

    if (m.getSource("cases")) {
      (m.getSource("cases") as mapboxgl.GeoJSONSource).setData(geojson as unknown as GeoJSON.FeatureCollection);
    } else {
      addMapSources();
    }

    function addMapSources() {
      if (m.getSource("cases")) return; // Prevent duplicate sources
      
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
        // Load full post details (votes, comments) like /post/[id]
        const reportId = f.properties?.id as string | undefined
        if (reportId) {
          setLoadingPost(true)
          ;(async () => {
            try {
              // 1) Fetch report from Supabase
              const { data: report, error: repErr } = await supabase
                .from('report_ranked')
                .select('id, street_address, city, description, reported_time, images, upvotes, downvotes')
                .eq('id', reportId)
                .maybeSingle()
              if (repErr) throw repErr

              // 2) Fetch comments via API
              const comRes = await fetch(`/api/comments?report_id=${encodeURIComponent(reportId)}`, { cache: 'no-store' })
              const comJson = await comRes.json()
              if (!comRes.ok) throw new Error(comJson?.error || 'comments failed')
              const flatComments = comJson.items

              // 3) Build nested comment tree
              type CommentNode = {
                id: string
                author: string
                content: string
                createdAt: string
                children?: CommentNode[]
              }
              const byId = new Map<string, CommentNode>()
              const roots: CommentNode[] = []
              for (const c of flatComments || []) {
                byId.set(c.id as string, {
                  id: c.id as string,
                  author: (c.author_name as string) || 'Anonymous',
                  content: c.content as string,
                  createdAt: c.created_at as string,
                  children: [],
                })
              }
              for (const c of flatComments || []) {
                const node = byId.get(c.id as string)!
                const parentId = c.parent_comment_id as string | null
                if (parentId && byId.has(parentId)) {
                  byId.get(parentId)!.children!.push(node)
                } else {
                  roots.push(node)
                }
              }

              // 4) Map to Post
              const mapped: Post = {
                id: reportId,
                description: (report?.description as string) || '',
                location: (report?.street_address as string) || (f.properties.address || ''),
                city: (report?.city as string) || (f.properties.city as string),
                imageUrl: Array.isArray(report?.images) && (report?.images as string[]).length > 0
                  ? ((report?.images as string[])[0] as string)
                  : (Array.isArray(f.properties.images) && f.properties.images.length > 0 ? f.properties.images[0] : undefined),
                upvotes: (report?.upvotes as number) ?? 0,
                downvotes: (report?.downvotes as number) ?? 0,
                userVote: getUserVoteForPost(reportId),
                createdAt: (report?.reported_time as string) || (f.properties.createdAt as string) || new Date().toISOString(),
                comments: roots,
              }
              setSelectedPost(mapped)
            } catch (err) {
              console.error('load post details failed', err)
              setSelectedPost(null)
            } finally {
              setLoadingPost(false)
            }
          })()
        } else {
          setSelectedPost(null)
        }
        // Fetch nearest department route for this issue
        (async () => {
          try {
            const department = f.properties.category
            const [lon, lat] = f.geometry.coordinates
            const qs = new URLSearchParams({
              department,
              fromLon: String(lon),
              fromLat: String(lat),
              includeRoute: 'true',
            })
            const res = await fetch(`/api/departments?${qs.toString()}`)
            const json = await res.json()
            // Draw route if exists
            if (json?.route && m.getSource('route')) {
              const feature: GeoJSON.Feature<GeoJSON.LineString> = { type: 'Feature', geometry: json.route as GeoJSON.LineString, properties: {} }
              ;(m.getSource('route') as mapboxgl.GeoJSONSource).setData(feature as unknown as GeoJSON.FeatureCollection)
            } else if (json?.route) {
              const feature: GeoJSON.Feature<GeoJSON.LineString> = { type: 'Feature', geometry: json.route as GeoJSON.LineString, properties: {} }
              m.addSource('route', { type: 'geojson', data: feature as unknown as GeoJSON.FeatureCollection })
              m.addLayer({
                id: 'route-line',
                type: 'line',
                source: 'route',
                paint: { 'line-color': '#38bdf8', 'line-width': 4, 'line-opacity': 0.85 },
              })
            }
          } catch (err) {
            console.error('route fetch failed', err)
          }
        })()
      });
      m.on("mouseenter", "points", () => (m.getCanvas().style.cursor = "pointer"));
      m.on("mouseleave", "points", () => (m.getCanvas().style.cursor = ""));

      // Department points source/layer
      const deptFc: GeoJSON.FeatureCollection<GeoJSON.Geometry, DeptProperties> = {
        type: 'FeatureCollection',
        features: deptPoints.map((p) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: p.coordinates },
          properties: { city: p.city, department: p.department, address: p.address },
        })) as unknown as GeoJSON.Feature<GeoJSON.Geometry, DeptProperties>[],
      }
      
      if (!m.getSource('departments')) {
        m.addSource('departments', { type: 'geojson', data: deptFc as unknown as GeoJSON.FeatureCollection })
      m.addLayer({
        id: 'departments-layer',
        type: 'symbol',
        source: 'departments',
        layout: {
          'icon-image': 'town-hall-15',
          'icon-size': 1.1,
          'icon-allow-overlap': true,
        },
        paint: {},
      })

      // Click a department to animate route to nearest issue and show nearest issue details on left
      m.on('click', 'departments-layer', async (e) => {
        const f = (e as mapboxgl.MapLayerMouseEvent).features?.[0] as mapboxgl.MapboxGeoJSONFeature
        if (!f) return
        const dept = f.properties?.department as string
        const deptCity = f.properties?.city as 'NYC' | 'BOSTON' | 'SF' | undefined
        const geometry = f.geometry
        const coords = (geometry && 'coordinates' in geometry ? (geometry as any).coordinates as [number, number] : undefined)
        if (!dept || !Array.isArray(coords)) return

        try {
          const qs = new URLSearchParams({
            department: dept,
            fromLon: String(coords[0]),
            fromLat: String(coords[1]),
            includeRoute: 'true',
            city: deptCity || '',
          })
          const res = await fetch(`/api/departments?${qs.toString()}`)
          const json = await res.json()
          const route = json?.route as GeoJSON.LineString | undefined
          const nearest = json?.nearest as { coordinates?: [number, number] } | undefined
          // Draw or update route line with simple fade animation
          if (route) {
            const routeFeature: GeoJSON.Feature<GeoJSON.LineString> = { type: 'Feature', geometry: route, properties: {} }
            if (m.getSource('dept-route')) {
              ;(m.getSource('dept-route') as mapboxgl.GeoJSONSource).setData(routeFeature as unknown as GeoJSON.Feature)
            } else {
              m.addSource('dept-route', { type: 'geojson', data: routeFeature as unknown as GeoJSON.Feature })
              m.addLayer({
                id: 'dept-route-line',
                type: 'line',
                source: 'dept-route',
                paint: {
                  'line-color': '#22d3ee',
                  'line-width': 5,
                  'line-opacity': 0.0,
                },
              })
            }
            // Animate opacity from 0 -> 0.9
            let opacity = 0
            const step = () => {
              opacity = Math.min(0.9, opacity + 0.08)
              m.setPaintProperty('dept-route-line', 'line-opacity', opacity)
              if (opacity < 0.9) requestAnimationFrame(step)
            }
            requestAnimationFrame(step)
          }

          // If we have a nearest dept location, pick the closest issue point in this city and update left overlay
          if (nearest && Array.isArray(nearest.coordinates)) {
            const [dlon, dlat] = nearest.coordinates
            let best: Feature | null = null
            let bestDist = Number.POSITIVE_INFINITY
            for (const feat of (geojson.features)) {
              const [lon, lat] = feat.geometry.coordinates
              const dx = (dlon - lon)
              const dy = (dlat - lat)
              const d = dx*dx + dy*dy
              if (d < bestDist) { bestDist = d; best = feat }
            }
            if (best) {
              const nearestId = best.properties?.id
              if (nearestId) {
                // trigger same loader as point click
                const ev = { features: [{ properties: { id: nearestId }, geometry: { coordinates: best.geometry.coordinates } }] } as unknown as mapboxgl.MapLayerMouseEvent
                m.fire('click', ev)
              }
            }
          }
        } catch (err) {
          console.error('dept route error', err)
        }
      })
      m.on('mouseenter', 'departments-layer', () => (m.getCanvas().style.cursor = 'pointer'))
      m.on('mouseleave', 'departments-layer', () => (m.getCanvas().style.cursor = ''))
      }
    }

    // Update department data if source exists
    const deptFc: GeoJSON.FeatureCollection<GeoJSON.Geometry, DeptProperties> = {
      type: 'FeatureCollection',
      features: deptPoints.map((p) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: p.coordinates },
        properties: { city: p.city, department: p.department, address: p.address },
      })) as unknown as GeoJSON.Feature<GeoJSON.Geometry, DeptProperties>[],
    }
    if (m.getSource('departments')) {
      (m.getSource('departments') as mapboxgl.GeoJSONSource).setData(deptFc as unknown as GeoJSON.FeatureCollection)
    }

    // Apply city + category filter on the single points layer
    if (selectedCategory) {
      const catFilter = ["==", ["get", "category"], selectedCategory] as unknown as mapboxgl.Expression;
      m.setFilter("points", catFilter as unknown as mapboxgl.Expression);
      // Center to the mean of filtered points (category within selected city)
      const coords = geojson.features
        .filter((f) => f.properties.category === selectedCategory)
        .map((f) => f.geometry.coordinates as [number, number]);
      if (coords.length && !activeCity) {
        const sum = coords.reduce((acc, [x, y]) => [acc[0] + x, acc[1] + y] as [number, number], [0, 0]);
        const mean: [number, number] = [sum[0] / coords.length, sum[1] / coords.length];
        m.easeTo({ center: mean, duration: 800 });
      } else {
        // no-op if none
      }
    } else {
      m.setFilter("points", undefined as unknown as mapboxgl.Expression);
      // Center to the mean of all points
      const coords = geojson.features.map((f) => f.geometry.coordinates as [number, number]);
      if (coords.length && !activeCity) {
        const sum = coords.reduce((acc, [x, y]) => [acc[0] + x, acc[1] + y] as [number, number], [0, 0]);
        const mean: [number, number] = [sum[0] / coords.length, sum[1] / coords.length];
        m.easeTo({ center: mean, duration: 800 });
      } else {
        // no-op if none
      }
    }
  }, [geojson, selectedCategory, deptPoints, mapReady, activeCity]);
  
  // Snap to Boston by default when map is ready
  useEffect(() => {
    if (!mapReady || !map.current) return;
    applyCityPreset('BOSTON')
  }, [mapReady, applyCityPreset])

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

      {/* Left overlay: controls + category grouping */}
      <div className="absolute top-4 left-4 w-80 map-overlay animate-slide-in z-10 pointer-events-auto">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <Navigation className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Gov View</h1>
            <p className="text-xs text-muted-foreground">311 categories</p>
          </div>
        </div>

        {/* City presets */}
        <div className="flex gap-2 mb-3">
          <button className="btn-glass px-3 py-1 text-xs" onClick={() => applyCityPreset('BOSTON')}>Boston</button>
          <button className="btn-glass px-3 py-1 text-xs" onClick={() => applyCityPreset('SF')}>SF</button>
        </div>

        {/* Claude Policy Analysis */}
        <div className="mb-4">
          <button 
            className="btn-glass w-full px-3 py-2 text-sm flex items-center gap-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 hover:from-blue-500/20 hover:to-purple-500/20 border-blue-500/20"
            onClick={() => setClaudePolicyOpen(true)}
          >
            <Brain className="w-4 h-4" />
            <span>Claude Policy Analyst</span>
          </button>
        </div>

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
      <div className="absolute top-4 right-4 w-96 map-overlay animate-slide-in z-10 pointer-events-auto bg-black/80">
        <div className="text-center mb-3">
          <div className="w-12 h-12 bg-gradient-to-br from-primary to-map-accent rounded-full mx-auto mb-2 flex items-center justify-center">
            <MapPin className="w-6 h-6 text-white" />
          </div>
          <p className="text-xs text-muted-foreground">Issue details</p>
        </div>
        {selectedPost ? (
          <PostDetailView post={selectedPost} compact />
        ) : loadingPost ? (
          <div className="text-center text-xs text-muted-foreground">Loading...</div>
        ) : (
          <div className="text-center text-xs text-muted-foreground">Click any point to view details</div>
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

      {/* Claude Policy Modal */}
      <ClaudePolicyModal 
        open={claudePolicyOpen} 
        onOpenChange={setClaudePolicyOpen} 
      />
    </div>
  );
}