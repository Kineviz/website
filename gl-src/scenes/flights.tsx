import React, { useRef, useEffect, useState, useMemo } from 'react';
import { GraphCanvas, MarkerLayer, type RenderEngineApi } from '@kineviz/gl';

// Real global flight network on the calm offline 'vectorDark' globe. Airports +
// routes fetched at runtime from OpenFlights; planes fly a simulated 24h
// schedule as soft comet markers. Recolored to the calm Kineviz palette.

const AIRPORTS_URL = 'https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat';
const ROUTES_URL   = 'https://raw.githubusercontent.com/jpatokal/openflights/master/data/routes.dat';

const TOP_AIRPORTS = 55;
const MAX_ROUTES   = 200;
const DAY_MS       = 250000;
const CRUISE_KMH   = 850;

// Material Icons "flight" glyph for the plane markers (font hosted locally).
const ICON_FONTS = [{ name: 'mi', url: 'assets/fonts/material-icons.woff2', fontFamily: 'MaterialIconsFlights', glyphMap: { plane: 0xe539 } }];

// Calm airline palette — soft, on-brand hues only (no reds/oranges).
const AIRLINE_HUES = ['#8b5cf6', '#2dd4bf', '#60a5fa', '#a78bfa', '#34d399', '#22d3ee', '#818cf8', '#5eead4'];

type LngLat = { lat: number; lng: number };
type Airport = LngLat & { iata: string; name: string };
type Flight = { id: string; departT: number; durFrac: number; durationMs: number; color: [number, number, number]; size: number };

function hexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
function airlineHex(code: string): string {
  let h = 0;
  for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) >>> 0;
  return AIRLINE_HUES[h % AIRLINE_HUES.length];
}
function sizeForEquipment(eq: string): number {
  const c = (eq || '').toUpperCase();
  if (/^(33|34|35|38|74|76|77|78)/.test(c)) return 42; // widebody
  if (/^(31|32|73|7[5M])/.test(c)) return 28;          // narrowbody
  return 20;                                           // regional
}
function splitCsv(line: string): string[] {
  const out: string[] = []; let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') q = !q;
    else if (c === ',' && !q) { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}
function haversineKm(a: LngLat, b: LngLat): number {
  const R = 6371, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

export default function Flights(_props: { is3D?: boolean }) {
  const apiRef = useRef<RenderEngineApi>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [markers, setMarkers] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      while (!apiRef.current && !cancelled) await new Promise(r => setTimeout(r, 50));
      if (cancelled) return;
      const api = apiRef.current!;

      let aTxt: string, rTxt: string;
      try { [aTxt, rTxt] = await Promise.all([fetch(AIRPORTS_URL).then(r => r.text()), fetch(ROUTES_URL).then(r => r.text())]); }
      catch { return; }
      if (cancelled) return;

      const airports: Record<string, Airport> = {};
      for (const line of aTxt.split('\n')) {
        const f = splitCsv(line);
        const iata = f[4], lat = parseFloat(f[6]), lng = parseFloat(f[7]);
        if (iata && iata !== '\\N' && iata.length === 3 && isFinite(lat) && isFinite(lng)) airports[iata] = { iata, name: f[1], lat, lng };
      }
      type Route = { s: string; d: string; airline: string; equip: string };
      const degree: Record<string, number> = {};
      const pairs = new Map<string, Route>();
      for (const line of rTxt.split('\n')) {
        const f = line.split(',');
        const s = f[2], d = f[4];
        if (!airports[s] || !airports[d] || s === d) continue;
        degree[s] = (degree[s] || 0) + 1; degree[d] = (degree[d] || 0) + 1;
        const key = s < d ? `${s}|${d}` : `${d}|${s}`;
        if (!pairs.has(key)) pairs.set(key, { s, d, airline: f[0], equip: (f[8] || '').trim().split(' ')[0] });
      }
      const topSet = new Set(Object.keys(degree).sort((a, b) => degree[b] - degree[a]).slice(0, TOP_AIRPORTS));
      const amongHubs = Array.from(pairs.values())
        .filter(r => topSet.has(r.s) && topSet.has(r.d))
        .map(r => ({ ...r, km: haversineKm(airports[r.s], airports[r.d]) }))
        .sort((a, b) => b.km - a.km);
      const stride = Math.max(1, Math.floor(amongHubs.length / MAX_ROUTES));
      const kept = amongHubs.filter((_, i) => i % stride === 0).slice(0, MAX_ROUTES);

      const usedIata = new Set<string>(); const traffic: Record<string, number> = {};
      kept.forEach(({ s, d }) => { usedIata.add(s); usedIata.add(d); traffic[s] = (traffic[s] || 0) + 1; traffic[d] = (traffic[d] || 0) + 1; });

      await api.nodes.add(Array.from(usedIata).map(iata => ({
        id: iata, category: 'Airport',
        properties: { name: airports[iata].name, lat: airports[iata].lat, lng: airports[iata].lng, traffic: traffic[iata] },
      })));
      await api.edges.add(kept.map(r => ({ id: `${r.s}-${r.d}`, source: r.s, target: r.d, relationship: 'ROUTE', properties: { airline: r.airline } })));

      await api.style.setDefaultNodeSize(0.8);
      await api.style.setEdgeScale(0.35);
      await api.style.setEdgeArrowVisible(false);
      api.style.setNodeHalo(Array.from(usedIata), 0.7);
      // calm busyness ramp: cool blue → teal
      await api.style.colorNodesByProperty('traffic', { mode: 'sequential', colorFrom: '#3b82f6', colorTo: '#2dd4bf' });
      const airlineColorMap: Record<string, string> = {};
      for (const r of kept) airlineColorMap[r.airline] = airlineHex(r.airline);
      await api.style.colorEdgesByProperty('airline', { mode: 'ordinal', colorMap: airlineColorMap } as any);

      const built: Flight[] = kept.map((r, i) => {
        const departT = (i * 0.61803398875) % 1;
        const km = haversineKm(airports[r.s], airports[r.d]);
        const durFrac = Math.min(0.6, Math.max(0.05, (km / CRUISE_KMH) / 24));
        return { id: `${r.s}-${r.d}`, departT, durFrac, durationMs: durFrac * DAY_MS, color: hexRgb(airlineHex(r.airline)), size: sizeForEquipment(r.equip) };
      });
      if (!cancelled) setFlights(built);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!flights.length) return;
    const t0 = performance.now();
    let lastKeys = '';
    const id = setInterval(() => {
      const T = ((performance.now() - t0) % DAY_MS) / DAY_MS;
      const airborne = flights.map(f => ({ f, p: ((T - f.departT) % 1 + 1) % 1 })).filter(({ f, p }) => p < f.durFrac);
      const keys = airborne.map(a => a.f.id).sort().join(',');
      if (keys === lastKeys) return;
      lastKeys = keys;
      setMarkers(airborne.map(({ f, p }) => ({
        edgeId: f.id, key: f.id,
        icon: 'plane', orientToPath: true, iconAngleOffset: -Math.PI / 2,
        color: f.color, size: f.size, durationMs: f.durationMs, phaseOffset: p / f.durFrac,
      })));
    }, 250);
    return () => clearInterval(id);
  }, [flights]);

  useEffect(() => {
    if (!flights.length) return;
    let n = 0;
    const id = setInterval(() => {
      const api = apiRef.current;
      if (api) {
        const cameraZ = api.camera.getViewState()?.cameraZ ?? 6;
        api.camera.setViewState({ position: [0, 0, -7.5], cameraZ, rotation: { x: 0.5, y: 0.4, z: 0 } });
      }
      if (++n >= 4) { clearInterval(id); apiRef.current?.camera.setAutoRotate(true, 0.0005); }
    }, 250);
    return () => { clearInterval(id); apiRef.current?.camera.setAutoRotate(false); };
  }, [flights]);

  // Satellite imagery globe (real terrain, blue oceans) — as in the source.
  const mapConfig = useMemo(() => ({ tileProvider: 'googleSatellite', autoFit: false } as const), []);

  return (
    <div ref={setContainer} style={{ width: '100%', height: '100%', position: 'relative' }}>
      {container && (
        <GraphCanvas container={container} apiRef={apiRef} theme="dark" is3D nodeCloud edgeCloud map={mapConfig as any} iconFonts={ICON_FONTS as any}>
          {flights.length > 0 && <MarkerLayer markers={markers} />}
        </GraphCanvas>
      )}
    </div>
  );
}
