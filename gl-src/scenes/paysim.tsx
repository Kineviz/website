import React, { useRef, useEffect, useState } from 'react';
import { GraphCanvas, MarkerLayer, type RenderEngineApi } from '@kineviz/gl';

// Money-mule fraud detection on the PaySim mobile-money dataset (Kaggle).
// Faithful port of the @kineviz/gl scenario — only the data URL is changed to
// our locally-hosted copy. 100 reconstructed fraud cases: an attacker drains a
// victim account with a TRANSFER to a mule, then CASHes OUT the same amount in
// the same hour. The SAME_CASE edge is that reconstruction.

const ROLE_COLORS: Record<string, string> = {
  victim: '#4ea8ff', mule: '#ff9f0a', beneficiary: '#bf5af2', normal: '#5a6b7d',
};
const ROLE_NAMES: Record<string, string> = {
  victim: 'Victim', mule: 'Mule', beneficiary: 'Cash-out', normal: 'Normal',
};
const NEUTRAL_NODE = '#5a6b7d';
const NEUTRAL_EDGE = '#31435c';
const FLAGGED_COLOR = '#ffd60a';
const FRAUD_COLOR = '#ff453a';
const CASE_LINK_COLOR = '#8e6bbf';
const REPLAY_MS = 40000;   // one 30-day (744-step) feed loop
const FLIGHT_MS = 900;     // marker flight time per transaction

type N = { id: string; properties: { role: string; accountType: string; fraudTxCount: number } };
type E = {
  id: string; source: string; target: string; relationship: string;
  properties: {
    amount: number; step: number; isFraud: boolean; isFlaggedFraud: boolean;
    caseId: string | null; category: string; drained: boolean;
  };
};
type Phase = 'loading' | 'overview' | 'rules' | 'pattern' | 'chase' | 'feed';
type Stats = { accounts: number; txs: number; fraud: number; flagged: number; drained: number };

const PHASE_TEXT: Record<Phase, string> = {
  loading: 'Loading transaction graph…',
  overview: 'One month of mobile-money transactions. Every account looks the same — where is the fraud?',
  rules: 'The legacy rule (flag TRANSFER > 200k) fires on a handful of transactions. Everything else passes.',
  pattern: 'Graph pattern: account DRAINED in one hop (amount = old balance, new balance = 0). The fraud chains light up.',
  chase: 'Following the money on the biggest chains: victim → mule → cash-out, same amount, same hour.',
  feed: '30-day replay. Normal traffic follows a daily rhythm; fraud pulses red around the clock.',
};
const PHASE_BADGE: Record<Phase, { text: string; color: string }> = {
  loading: { text: 'LOADING', color: '#8899aa' },
  overview: { text: 'NOMINAL', color: '#2ea043' },
  rules: { text: 'RULE VIEW', color: '#b58a00' },
  pattern: { text: 'GRAPH VIEW', color: '#ff453a' },
  chase: { text: 'TRACING', color: '#ff9f0a' },
  feed: { text: 'LIVE FEED', color: '#2e7dd1' },
};

export default function Paysim(_props: { is3D?: boolean }) {
  const apiRef = useRef<RenderEngineApi>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [stats, setStats] = useState<Stats | null>(null);
  const [caseInfo, setCaseInfo] = useState('');
  const [clock, setClock] = useState('');
  const [markers, setMarkers] = useState<any[]>([]);
  const dataRef = useRef<{ nodes: N[]; edges: E[] } | null>(null);
  const runRef = useRef(0);

  async function runScenario(api: RenderEngineApi) {
    const run = ++runRef.current;
    const alive = () => runRef.current === run;
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
    const { nodes, edges } = dataRef.current!;
    const allNodeIds = nodes.map(n => n.id);
    const allEdgeIds = edges.map(e => e.id);

    api.animations.stopAll();
    api.emphasis.stopAll();
    api.emphasis.clearDim();
    setMarkers([]); setCaseInfo(''); setClock('');
    await api.style.setNodeColors(allNodeIds.map(id => ({ id, color: NEUTRAL_NODE })));
    await api.style.setEdgeDashed(allEdgeIds, false);
    await Promise.all(allEdgeIds.map(id => api.style.setEdgeColor(id, NEUTRAL_EDGE)));
    api.style.setNodeHalo(allNodeIds, 0);
    await api.camera.flyToAll({ duration: 600 });

    setPhase('overview');
    await sleep(3000);
    if (!alive()) return;

    setPhase('rules');
    const flagged = edges.filter(e => e.properties.isFlaggedFraud);
    await Promise.all(flagged.map(e => api.style.setEdgeColor(e.id, FLAGGED_COLOR)));
    await Promise.all(flagged.map(e => api.style.setEdgeWidth(e.id, 3)));
    const flaggedAccts = Array.from(new Set(flagged.flatMap(e => [e.source, e.target])));
    api.style.setNodeHalo(flaggedAccts, 1.0);
    await api.style.setNodeColors(flaggedAccts.map(id => ({ id, color: FLAGGED_COLOR })));
    api.animations.nodeRipple(flaggedAccts, { loop: false, duration: 1800, color: [1, 0.84, 0.04], speed: 0.5 });
    await sleep(3600);
    if (!alive()) return;

    setPhase('pattern');
    const drained = edges.filter(e => e.properties.drained && e.properties.isFraud);
    const caseLinks = edges.filter(e => e.relationship === 'SAME_CASE');
    await Promise.all(drained.map(e => api.style.setEdgeColor(e.id, FRAUD_COLOR)));
    await Promise.all(caseLinks.map(e => api.style.setEdgeColor(e.id, CASE_LINK_COLOR)));
    await api.style.setEdgeDashed(caseLinks.map(e => e.id), true);
    await api.style.setNodeColors(nodes.map(n => ({
      id: n.id, color: ROLE_COLORS[n.properties.role] ?? NEUTRAL_NODE,
    })));
    api.style.setNodeHalo(allNodeIds, 0.4);
    await sleep(4000);
    if (!alive()) return;

    setPhase('chase');
    const byCase = new Map<string, E[]>();
    for (const e of edges) {
      if (e.properties.caseId) {
        const arr = byCase.get(e.properties.caseId) ?? [];
        arr.push(e); byCase.set(e.properties.caseId, arr);
      }
    }
    const chains = Array.from(byCase.values())
      .filter(c => c.length === 3)
      .sort((a, b) => b[0].properties.amount - a[0].properties.amount)
      .slice(0, 3);
    for (const chain of chains) {
      if (!alive()) return;
      const order: Record<string, number> = { TRANSFER: 0, SAME_CASE: 1, CASH_OUT: 2 };
      chain.sort((a, b) => order[a.relationship] - order[b.relationship]);
      const accts = [chain[0].source, chain[0].target, chain[2].source, chain[2].target];
      const amount = chain[0].properties.amount;
      setCaseInfo(`${chain[0].properties.caseId} — ${Math.round(amount).toLocaleString()} stolen at hour ${chain[0].properties.step}`);
      const focusId = api.emphasis.focusContext(accts, { contextOpacity: 0.12 });
      await api.camera.flyToNodes(accts, { duration: 700 });
      setMarkers(chain.map((e, i) => ({
        edgeId: e.id, key: `${e.properties.caseId}:${i}`, orientToPath: true,
        color: e.relationship === 'SAME_CASE' ? [0.72, 0.55, 0.95] : [1, 0.35, 0.27],
        size: 22, durationMs: 2100, phaseOffset: (2 - i) / 3,
      })));
      api.animations.nodeRipple([chain[2].target], { loop: false, duration: 1600, color: [0.75, 0.35, 0.95], speed: 0.5 });
      await sleep(3400);
      api.emphasis.stop(focusId);
    }
    if (!alive()) return;
    setMarkers([]); setCaseInfo('');

    setPhase('feed');
    api.emphasis.clearDim();
    await api.camera.flyToAll({ duration: 800 });

    const maxStep = Math.max(...edges.map(e => e.properties.step));
    const t0 = performance.now();
    let lastKeys = '';
    const lastRipple: Record<string, number> = {};
    const tick = setInterval(() => {
      if (!alive()) { clearInterval(tick); return; }
      const T = ((performance.now() - t0) % REPLAY_MS) / REPLAY_MS;
      const nowStep = T * maxStep;
      setClock(`Day ${Math.floor(nowStep / 24) + 1} · ${String(Math.floor(nowStep % 24)).padStart(2, '0')}:00`);
      const flightSteps = (FLIGHT_MS / REPLAY_MS) * maxStep;
      const live = edges
        .map(e => ({ e, p: (nowStep - e.properties.step + maxStep) % maxStep }))
        .filter(({ p }) => p < flightSteps);
      const now = performance.now();
      for (const { e, p } of live) {
        if (e.properties.isFraud && p > flightSteps * 0.8 && now - (lastRipple[e.target] || 0) > 500) {
          lastRipple[e.target] = now;
          api.animations.nodeRipple([e.target], { loop: false, duration: 700, color: [1, 0.3, 0.25], speed: 0.6, rings: 1 });
        }
      }
      const keys = live.map(l => l.e.id).sort().join(',');
      if (keys === lastKeys) return;
      lastKeys = keys;
      setMarkers(live.map(({ e, p }) => ({
        edgeId: e.id, key: e.id, orientToPath: true,
        color: e.properties.isFraud ? [1, 0.27, 0.23] : [0.45, 0.65, 0.85],
        size: e.properties.isFraud ? 17 : 9,
        durationMs: FLIGHT_MS, phaseOffset: p / flightSteps,
      })));
    }, 120);
  }

  useEffect(() => {
    let cancelled = false;
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
    (async () => {
      while (!apiRef.current && !cancelled) await sleep(50);
      if (cancelled) return;
      const api = apiRef.current!;

      const res = await fetch('assets/data/paysim-fraud.json');
      const { nodes, edges } = (await res.json()) as { nodes: N[]; edges: E[] };
      dataRef.current = { nodes, edges };

      await api.nodes.add(nodes as any);
      await api.edges.add(edges as any);
      await api.style.setEdgeScale(0.8);
      await api.style.setEdgeArrowVisible(false);
      await api.style.sizeNodesByProperty('amountIn', { minSize: 5, maxSize: 13, scale: 'log' });

      const fraud = edges.filter(e => e.properties.isFraud && e.relationship !== 'SAME_CASE').length;
      const flagged = edges.filter(e => e.properties.isFlaggedFraud).length;
      const drained = edges.filter(e => e.properties.drained && e.properties.isFraud).length;
      setStats({ accounts: nodes.length, txs: edges.length, fraud, flagged, drained });

      await sleep(1500);
      if (cancelled) return;
      await runScenario(api);
    })();
    return () => { cancelled = true; runRef.current++; };
  }, []);

  const badge = PHASE_BADGE[phase];
  return (
    <div ref={setContainer} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div style={{
        position: 'absolute', bottom: 10, left: 10, zIndex: 2, width: 300,
        background: 'rgba(13, 20, 30, 0.88)', border: '1px solid rgba(120,160,200,0.25)',
        borderRadius: 8, padding: '10px 12px', color: '#cfdbe8',
        font: '12px/1.45 system-ui, sans-serif', backdropFilter: 'blur(4px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <strong style={{ fontSize: 13, color: '#fff', flex: 1 }}>Mobile-money fraud (PaySim)</strong>
          <span style={{
            background: badge.color, color: '#fff', borderRadius: 4,
            padding: '1px 6px', fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
          }}>{badge.text}</span>
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
          {Object.keys(ROLE_NAMES).map(r => (
            <span key={r} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: ROLE_COLORS[r] }} />
              <span style={{ color: '#9fb3c8' }}>{ROLE_NAMES[r]}</span>
            </span>
          ))}
        </div>
        <div style={{ color: '#b8c8d8', minHeight: 42 }}>{PHASE_TEXT[phase]}</div>
        {caseInfo && <div style={{ marginTop: 6, color: '#ffb3ad' }}>{caseInfo}</div>}
        {stats && (phase === 'rules' || phase === 'pattern' || phase === 'feed') && (
          <div style={{ marginTop: 8, borderTop: '1px solid rgba(120,160,200,0.2)', paddingTop: 8,
            display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px 10px' }}>
            <span>Fraud transactions</span>
            <strong style={{ color: FRAUD_COLOR, textAlign: 'right' }}>{stats.fraud}</strong>
            <span>Caught by &gt;200k rule</span>
            <strong style={{ color: FLAGGED_COLOR, textAlign: 'right' }}>
              {stats.flagged} ({Math.round((stats.flagged / stats.fraud) * 100)}%)</strong>
            <span>Caught by drain pattern</span>
            <strong style={{ color: '#7ee787', textAlign: 'right' }}>
              {stats.drained} ({Math.round((stats.drained / stats.fraud) * 100)}%)</strong>
            {clock && (<><span>Replay clock</span>
              <strong style={{ color: '#9fc7ff', textAlign: 'right' }}>{clock}</strong></>)}
          </div>
        )}
        {phase === 'feed' && (
          <button
            onClick={() => { const api = apiRef.current; if (api) void runScenario(api); }}
            style={{
              marginTop: 8, background: '#1d3a5f', color: '#cfe3ff', border: '1px solid #3a6ea5',
              borderRadius: 5, padding: '4px 12px', cursor: 'pointer', font: '12px system-ui',
            }}
          >↻ Replay investigation</button>
        )}
      </div>
      {container && (
        <GraphCanvas container={container} apiRef={apiRef} theme="dark" is3D={false} nodeCloud edgeCloud forceLayout>
          <MarkerLayer markers={markers} />
        </GraphCanvas>
      )}
    </div>
  );
}
