"use client";

import { useEffect, useState } from "react";

type ApiResult = { count?: number; items?: any[]; error?: string };

export default function TestApisPage() {
  const [sf, setSf] = useState<ApiResult | null>(null);
  const [bos, setBos] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [sfRes, bosRes] = await Promise.all([
          fetch("/api/311/sf?limit=10", { cache: "no-store" }),
          fetch("/api/311/boston?status=open&limit=10", { cache: "no-store" }),
        ]);
        const [sfData, bosData] = await Promise.all([sfRes.json(), bosRes.json()]);
        setSf(sfData);
        setBos(bosData);
      } catch (e: any) {
        setSf({ error: String(e) });
        setBos({ error: String(e) });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">311 API Test</h1>
      {loading ? <p className="text-sm opacity-70">Loading…</p> : null}

      <section className="border rounded p-4">
        <h2 className="font-semibold mb-2">SF /api/311/sf</h2>
        {sf?.error ? (
          <pre className="text-red-500 text-xs whitespace-pre-wrap">{sf.error}</pre>
        ) : (
          <>
            <p className="text-sm mb-2">Count: {sf?.count ?? 0}</p>
            <pre className="text-xs bg-secondary p-2 rounded overflow-auto max-h-64">
              {JSON.stringify(sf?.items?.slice(0, 3), null, 2)}
            </pre>
          </>
        )}
      </section>

      <section className="border rounded p-4">
        <h2 className="font-semibold mb-2">Boston /api/311/boston</h2>
        {bos?.error ? (
          <pre className="text-red-500 text-xs whitespace-pre-wrap">{bos.error}</pre>
        ) : (
          <>
            <p className="text-sm mb-2">Count: {bos?.count ?? 0}</p>
            <pre className="text-xs bg-secondary p-2 rounded overflow-auto max-h-64">
              {JSON.stringify(bos?.items?.slice(0, 3), null, 2)}
            </pre>
          </>
        )}
      </section>
    </div>
  );
}


