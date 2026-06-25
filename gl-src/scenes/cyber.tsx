import React, { useRef, useEffect, useState, useMemo } from 'react';
import { GraphCanvas, MarkerLayer, TextLayer, type RenderEngineApi } from '@kineviz/gl';

// Cyber-threat globe — ported from the @kineviz/gl scenario, recolored to the
// calm Kineviz brand palette (purple / teal / gold / blue / green — no alarming
// reds). Country coords fetched at runtime; the attack stream is simulated but
// weighted by real-world origin/target statistics. Globe is the engine's offline
// 'vectorDark' vector earth (no network tiles).

const COUNTRIES_URL = 'https://raw.githubusercontent.com/google/dspl/master/samples/google/canonical/countries.csv';

const SOURCES: [string, number][] = [
  ['CN', 10], ['RU', 9], ['US', 7], ['BR', 5], ['IN', 5], ['IR', 4], ['KP', 3],
  ['VN', 3], ['UA', 3], ['ID', 3], ['TR', 2], ['RO', 2], ['NG', 2], ['NL', 2],
];
const TARGETS: [string, number][] = [
  ['US', 10], ['DE', 6], ['GB', 6], ['IN', 5], ['JP', 5], ['FR', 4], ['KR', 4],
  ['CA', 3], ['AU', 3], ['SG', 3], ['BR', 3], ['NL', 3], ['IT', 2], ['RU', 2], ['CN', 2],
];
// Calm brand hues — no reds. Each attack type maps to a soft, on-brand colour.
const TYPES: { name: string; color: [number, number, number]; w: number }[] = [
  { name: 'DDoS',       color: rgb('#8b5cf6'), w: 8 }, // purple
  { name: 'Malware',    color: rgb('#fbbf24'), w: 7 }, // gold
  { name: 'Phishing',   color: rgb('#2dd4bf'), w: 6 }, // teal
  { name: 'Botnet',     color: rgb('#60a5fa'), w: 5 }, // blue
  { name: 'Exploit',    color: rgb('#a78bfa'), w: 5 }, // light purple
  { name: 'BruteForce', color: rgb('#34d399'), w: 5 }, // green
  { name: 'Ransomware', color: rgb('#f472b6'), w: 4 }, // pink
];

const N_ATTACKS = 700;
const LOOP_MS   = 60000;

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pick<T>(entries: [T, number][], r: number): T {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let x = r * total;
  for (const [v, w] of entries) { if ((x -= w) <= 0) return v; }
  return entries[0][0];
}
function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

type Attack = {
  id: string; edgeId: string; departT: number; durFrac: number; durationMs: number;
  color: [number, number, number]; size: number;
};

export default function CyberGlobe(_props: { is3D?: boolean }) {
  const apiRef = useRef<RenderEngineApi>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [attacks, setAttacks] = useState<Attack[]>([]);
  const [markers, setMarkers] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      while (!apiRef.current && !cancelled) await new Promise(r => setTimeout(r, 50));
      if (cancelled) return;
      const api = apiRef.current!;

      let csv: string;
      try { csv = await fetch(COUNTRIES_URL).then(r => r.text()); }
      catch { return; }
      if (cancelled) return;

      const loc: Record<string, { lat: number; lng: number; name: string }> = {};
      for (const line of csv.split('\n').slice(1)) {
        const m = line.match(/^([A-Z]{2}),([-\d.]+),([-\d.]+),(.*)$/);
        if (m) loc[m[1]] = { lat: +m[2], lng: +m[3], name: m[4].replace(/^"|"$/g, '') };
      }
      const sources = SOURCES.filter(([c]) => loc[c]);
      const targets = TARGETS.filter(([c]) => loc[c]);

      const rnd = mulberry32(0xC0FFEE);
      const used = new Set<string>(), recv: Record<string, number> = {}, sent: Record<string, number> = {};
      const corridorCount: Record<string, number> = {};
      const events: Attack[] = [];
      for (let i = 0; i < N_ATTACKS; i++) {
        const s = pick(sources, rnd());
        let t = pick(targets, rnd()); let guard = 0;
        while (t === s && guard++ < 5) t = pick(targets, rnd());
        if (t === s) continue;
        const ty = pick(TYPES.map(x => [x, x.w] as [typeof x, number]), rnd());
        const severity = rnd() < 0.6 ? 1 : rnd() < 0.85 ? 2 : 3;
        const km = haversineKm(loc[s], loc[t]);
        const durFrac = Math.min(0.09, Math.max(0.03, km / 20000 * 0.09));
        const corridor = `${s}>${t}`;
        used.add(s); used.add(t);
        recv[t] = (recv[t] || 0) + 1; sent[s] = (sent[s] || 0) + 1;
        corridorCount[corridor] = (corridorCount[corridor] || 0) + 1;
        events.push({
          id: `atk${i}`, edgeId: corridor, departT: rnd(), durFrac, durationMs: durFrac * LOOP_MS,
          color: ty.color, size: severity === 1 ? 13 : severity === 2 ? 19 : 27,
        });
      }
      const corridors = Array.from(new Set(events.map(e => e.edgeId)));

      await api.nodes.add(Array.from(used).map(c => ({
        id: c, category: 'Country',
        properties: {
          name: loc[c].name, lat: loc[c].lat, lng: loc[c].lng,
          targeted: recv[c] || 0, activity: (recv[c] || 0) + (sent[c] || 0),
        },
      })));
      await api.edges.add(corridors.map(id => {
        const [s, t] = id.split('>');
        return { id, source: s, target: t, relationship: 'ATTACK', properties: {} };
      }));

      await api.style.setEdgeScale(0.5);
      await api.style.setEdgeArrowVisible(false);

      // Calm corridor heat ramp: cool indigo → periwinkle → teal (no red/orange).
      const heat = (t: number) => {
        const stops: [number, number, number][] = [[49, 46, 129], [99, 102, 241], [45, 212, 191]];
        const x = t * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(x)), f = x - i;
        const c = stops[i].map((v, k) => Math.round(v + (stops[i + 1][k] - v) * f));
        return `#${c.map(v => v.toString(16).padStart(2, '0')).join('')}`;
      };
      const counts = corridors.map(id => corridorCount[id]);
      const minC = Math.min(...counts), maxC = Math.max(...counts);
      await Promise.all(corridors.map(id => {
        const t = (corridorCount[id] - minC) / Math.max(1, maxC - minC);
        return Promise.all([
          api.style.setEdgeWidth(id, 0.5 + t * 5),
          api.style.setEdgeColor(id, heat(t)),
        ]);
      }));
      api.style.setNodeHalo(Array.from(used), 0.85);
      await api.style.sizeNodesByProperty('activity', { minSize: 3, maxSize: 11, scale: 'log' });
      // Calm node shading: cool blue → soft purple (instead of blue → red).
      await api.style.colorNodesByProperty('targeted', { mode: 'sequential', colorFrom: '#3b82f6', colorTo: '#a78bfa' });

      if (!cancelled) setAttacks(events);
    })();
    return () => { cancelled = true; };
  }, []);

  // Rolling feed of in-flight projectiles.
  useEffect(() => {
    if (!attacks.length) return;
    const t0 = performance.now();
    const byId = new Map(attacks.map(a => [a.id, a]));
    let prevLive = new Set<string>();
    const lastRipple: Record<string, number> = {};
    let lastKeys = '';
    const id = setInterval(() => {
      const T = ((performance.now() - t0) % LOOP_MS) / LOOP_MS;
      const live = attacks.map(a => ({ a, p: ((T - a.departT) % 1 + 1) % 1 })).filter(({ a, p }) => p < a.durFrac);
      const liveIds = new Set(live.map(l => l.a.id));

      const api = apiRef.current;
      if (api) {
        const now = performance.now();
        for (const pid of prevLive) {
          if (liveIds.has(pid)) continue;
          const tgt = byId.get(pid)?.edgeId.split('>')[1];
          if (tgt && now - (lastRipple[tgt] || 0) > 300) {
            lastRipple[tgt] = now;
            // calm teal impact ripple (was orange)
            api.animations.nodeRipple([tgt], { loop: false, duration: 850, color: [0.18, 0.83, 0.75], speed: 0.6, rings: 2 });
          }
        }
      }
      prevLive = liveIds;

      const keys = [...liveIds].sort().join(',');
      if (keys === lastKeys) return;
      lastKeys = keys;
      setMarkers(live.map(({ a, p }) => ({
        edgeId: a.edgeId, key: a.id,
        shape: 'comet' as const,
        trailLength: 0.3,
        color: a.color, size: a.size, durationMs: a.durationMs,
        phaseOffset: p / a.durFrac,
      })));
    }, 120);
    return () => clearInterval(id);
  }, [attacks]);

  // Frame, then slow ambient spin.
  useEffect(() => {
    if (!attacks.length) return;
    let n = 0;
    const id = setInterval(() => {
      const api = apiRef.current;
      if (api) {
        const cameraZ = api.camera.getViewState()?.cameraZ ?? 6;
        api.camera.setViewState({ position: [0, 0, -7.5], cameraZ, rotation: { x: 0.5, y: 0.2, z: 0 } });
      }
      if (++n >= 4) {
        clearInterval(id);
        apiRef.current?.camera.setAutoRotate(true, 0.0005);
      }
    }, 250);
    return () => { clearInterval(id); apiRef.current?.camera.setAutoRotate(false); };
  }, [attacks]);

  const mapConfig = useMemo(() => ({ tileProvider: 'vectorDark', autoFit: false, maxLevel: 4 } as const), []);

  return (
    <div ref={setContainer} style={{ width: '100%', height: '100%', position: 'relative' }}>
      {container && (
        <GraphCanvas container={container} apiRef={apiRef} theme="dark" is3D nodeCloud edgeCloud map={mapConfig as any}>
          <TextLayer property="name" position="bottom" scale={4} />
          {attacks.length > 0 && <MarkerLayer markers={markers} />}
        </GraphCanvas>
      )}
    </div>
  );
}
