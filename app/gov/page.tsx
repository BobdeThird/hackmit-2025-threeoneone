"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { MapPin, Navigation } from "lucide-react";
import { PostDetailView } from "@/components/ui/post-detail-view";
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
  "#60a5fa", "#34d399", "#fbbf24", "#f472b6", "#a78bfa", "#f87171", "#22d3ee", "#84cc16",
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
  const [mapReady, setMapReady] = useState(false);
  const [deptPoints, setDeptPoints] = useState<{
    city: 'NYC' | 'BOSTON' | 'SF';
    department: string;
    address: string;
    coordinates: [number, number];
  }[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [loadingPost, setLoadingPost] = useState(false);

  // City presets
  const CITY_PRESETS = {
    BOSTON: {
      center: [-71.10854197159861, 42.31579034590908] as [number, number],
      zoom: 11.7,
      bounds: [[-71.37, 42.24], [-70.91, 42.48]] as [[number, number], [number, number]]
    },
    SF: {
      center: [-122.45347499644797, 37.755113984001724] as [number, number],
      zoom: 11.9,
      bounds: [[-122.68, 37.68], [-122.28, 37.90]] as [[number, number], [number, number]]
    },
  };

  const applyCityPreset = (key: 'BOSTON' | 'SF') => {
    if (!map.current) return;
    const preset = CITY_PRESETS[key];
    map.current.fitBounds(preset.bounds as mapboxgl.LngLatBoundsLike, {
      padding: 40,
      duration: 800,
    });
  };

  // Build GeoJSON from items
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

  // Init map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [-98.5795, 39.8283],
      zoom: 3.5,
      pitch: 45,
      bearing: -10,
      antialias: true,
    });

    map.current.on("load", () => setMapReady(true));
    map.current.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");

    return () => map.current?.remove();
  }, [mapboxToken]);

  // Fetch 311 data
  useEffect(() => {
    if (!mapboxToken) return;
    (async () => {
      try {
        const res = await fetch("/api/reports?limit=10000");
        const json = await res.json();
        setItems(json.items || []);
      } catch (e) {
        console.error("Failed to load 311 data", e);
      }
    })();
  }, [mapboxToken]);

  // Load department points
  useEffect(() => {
    if (!mapboxToken) return;
    (async () => {
      try {
        const cities = ['BOSTON', 'SF'];
        const results = await Promise.all(
          cities.map(async (city) => {
            try {
              const res = await fetch(`/api/departments?city=${city}&department=all`);
              const json = await res.json();
              const items = json.items || [];
              return items
                .filter((i: any) => Array.isArray(i.coordinates) && i.coordinates.length === 2)
                .map((i: any) => ({ 
                  city: i.city as 'NYC'|'BOSTON'|'SF', 
                  department: i.department, 
                  address: i.address, 
                  coordinates: i.coordinates as [number, number] 
                }));
            } catch {
              return [];
            }
          })
        );
        setDeptPoints(results.flat());
      } catch (e) {
        console.error('Failed to load department points', e);
      }
    })();
  }, [mapboxToken]);

  // Add map sources and layers
  useEffect(() => {
    if (!map.current || !mapReady) return;
    const m = map.current;

    // Wait for style to load
    if (!m.isStyleLoaded()) {
      const onStyleLoad = () => {
        m.off('styledata', onStyleLoad);
        setTimeout(addMapLayers, 100);
      };
      m.on('styledata', onStyleLoad);
      return;
    }

    addMapLayers();

    function addMapLayers() {
      // Add 311 issue points
    if (m.getSource("cases")) {
        (m.getSource("cases") as mapboxgl.GeoJSONSource).setData(geojson as any);
    } else {
        m.addSource("cases", { type: "geojson", data: geojson as any });
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

        // Click handler for points
      m.on("click", "points", (e) => {
          const f = e.features?.[0] as any;
        if (!f) return;
          
          const reportId = f.properties?.id;
        if (reportId) {
            setLoadingPost(true);
            loadPostDetails(reportId, f.properties);
          }
        });

      m.on("mouseenter", "points", () => (m.getCanvas().style.cursor = "pointer"));
      m.on("mouseleave", "points", () => (m.getCanvas().style.cursor = ""));
    }

      // Add department points
      const getDepartmentColor = (category: string) => {
        switch (category) {
          case 'Public Safety': return '#ef4444';
          case 'Public Works & Transportation': return '#3b82f6';
          case 'Parks & Recreation': return '#22c55e';
          case 'Health & Human Services': return '#f59e0b';
          case 'Housing Buildings & Code': return '#8b5cf6';
          case 'Utilities (Water/Power)': return '#06b6d4';
          case 'Sanitation & Environment': return '#84cc16';
          case 'Animal Services': return '#ec4899';
          default: return '#6b7280';
        }
      };

      const deptFc = {
      type: 'FeatureCollection',
      features: deptPoints.map((p) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: p.coordinates },
          properties: { 
            city: p.city, 
            department: p.department, 
            address: p.address,
            color: getDepartmentColor(p.department)
          },
        })),
      };

    if (m.getSource('departments')) {
        (m.getSource('departments') as mapboxgl.GeoJSONSource).setData(deptFc as any);
    } else {
        m.addSource('departments', { type: 'geojson', data: deptFc as any });
      m.addLayer({
        id: 'departments-layer',
          type: 'circle',
        source: 'departments',
                paint: {
            'circle-color': ['get', 'color'],
                'circle-radius': 6,
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2,
            'circle-opacity': 0.8,
          },
        });
      }
    }
  }, [geojson, deptPoints, mapReady]);

  // Load post details
  const loadPostDetails = async (reportId: string, fallback?: any) => {
    try {
      const { data: report, error } = await supabase
        .from('report_ranked')
        .select('id, street_address, city, description, reported_time, images, upvotes, downvotes')
        .eq('id', reportId)
        .maybeSingle();

      if (error) throw error;

      const comRes = await fetch(`/api/comments?report_id=${encodeURIComponent(reportId)}`, { cache: 'no-store' });
      const comJson = await comRes.json();
      const flatComments = comJson.ok ? comJson.items : [];

      // Build comment tree
      const byId = new Map();
      const roots: any[] = [];
      
      for (const c of flatComments || []) {
        byId.set(c.id, {
          id: c.id,
          author: c.author_name || 'Anonymous',
          content: c.content,
          createdAt: c.created_at,
          children: [],
        });
      }
      
      for (const c of flatComments || []) {
        const node = byId.get(c.id);
        const parentId = c.parent_comment_id;
        if (parentId && byId.has(parentId)) {
          byId.get(parentId).children.push(node);
    } else {
          roots.push(node);
        }
      }

      const mapped: Post = {
        id: reportId,
        description: report?.description || fallback?.description || '',
        location: report?.street_address || fallback?.address || '',
        city: report?.city || fallback?.city || '',
        imageUrl: Array.isArray(report?.images) && report.images.length > 0 
          ? report.images[0] 
          : (Array.isArray(fallback?.images) && fallback.images.length > 0 ? fallback.images[0] : undefined),
        upvotes: report?.upvotes ?? 0,
        downvotes: report?.downvotes ?? 0,
        userVote: getUserVoteForPost(reportId),
        createdAt: report?.reported_time || fallback?.createdAt || new Date().toISOString(),
        comments: roots,
      };
      
      setSelectedPost(mapped);
    } catch (err) {
      console.error('Failed to load post details', err);
      setSelectedPost(null);
    } finally {
      setLoadingPost(false);
    }
  };

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

      {/* Simple header */}
      <div className="absolute top-4 left-4 map-overlay animate-slide-in">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <Navigation className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Gov View</h1>
            <p className="text-xs text-muted-foreground">311 Issues & Departments</p>
          </div>
        </div>

        {/* City buttons */}
        <div className="flex gap-2">
          <button 
            className="btn-glass px-3 py-1 text-xs" 
            onClick={() => applyCityPreset('BOSTON')}
          >
            Boston
          </button>
            <button
            className="btn-glass px-3 py-1 text-xs" 
            onClick={() => applyCityPreset('SF')}
          >
            San Francisco
              </button>
        </div>
      </div>

      {/* Post details */}
      <div className="absolute top-4 right-4 w-96 map-overlay animate-slide-in">
        <div className="text-center mb-3">
          <div className="w-12 h-12 bg-gradient-to-br from-primary to-map-accent rounded-full mx-auto mb-2 flex items-center justify-center">
            <MapPin className="w-6 h-6 text-white" />
          </div>
          <p className="text-xs text-muted-foreground">Issue Details</p>
        </div>
        
        {selectedPost ? (
          <PostDetailView post={selectedPost} />
        ) : loadingPost ? (
          <div className="text-center text-xs text-muted-foreground">Loading...</div>
        ) : (
          <div className="text-center text-xs text-muted-foreground">Click any point to view details</div>
        )}
      </div>

      {/* Bottom status */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
        <div className="glass rounded-full px-4 py-2 flex items-center gap-1 text-xs">
          <div className="w-2 h-2 bg-map-accent rounded-full animate-glow-pulse"></div>
          <span>{geojson.features.length} Issues</span>
        </div>
      </div>
    </div>
  );
}