import React, { useRef, useState, useEffect } from 'react';
import { GraphCanvas, createForceLayout, type RenderEngineApi } from '@kineviz/gl';

// Calm brand palette (no alarming reds) — purple / teal / gold / blue / green / pink.
const PALETTE = ['#8b5cf6', '#2dd4bf', '#fbbf24', '#60a5fa', '#34d399', '#f472b6'];

/** A small, well-spaced community network — the calm default scene. */
export default function Network({ is3D = true }: { is3D?: boolean }) {
  const apiRef = useRef<RenderEngineApi>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      while (!apiRef.current && !cancelled) await new Promise((r) => setTimeout(r, 40));
      if (cancelled) return;
      const api = apiRef.current!;

      // 6 communities of 7 nodes, lightly cross-linked.
      const nodes: { id: string; category: string; properties: Record<string, unknown> }[] = [];
      const edges: { id: string; source: string; target: string; relationship: string; properties: Record<string, unknown> }[] = [];
      const groups = PALETTE.length;
      const per = 7;
      let e = 0;
      for (let g = 0; g < groups; g++) {
        const hub = `g${g}_0`;
        for (let i = 0; i < per; i++) {
          const id = `g${g}_${i}`;
          nodes.push({ id, category: `C${g}`, properties: { name: id } });
          if (i > 0) edges.push({ id: `e${e++}`, source: hub, target: id, relationship: 'LINK', properties: {} });
        }
        // ring within community
        for (let i = 1; i < per; i++) {
          edges.push({ id: `e${e++}`, source: `g${g}_${i}`, target: `g${g}_${((i % (per - 1)) + 1)}`, relationship: 'LINK', properties: {} });
        }
        // bridge to next community
        if (g > 0) edges.push({ id: `e${e++}`, source: `g${g}_0`, target: `g${g - 1}_0`, relationship: 'BRIDGE', properties: {} });
      }

      await api.nodes.add(nodes);
      await api.edges.add(edges);

      // color by community, size hubs a touch larger
      for (let g = 0; g < groups; g++) {
        api.style?.setNodeColor?.(`C${g}`, PALETTE[g]);
      }

      const layout = createForceLayout({ dimensions: is3D ? 3 : 2 });
      await api.layout.run(layout);
      await api.camera.flyToAll();
      api.camera.autoRotate?.(is3D ? 0.25 : 0);
    })();
    return () => { cancelled = true; };
  }, [is3D]);

  return (
    <div ref={setContainer} style={{ width: '100%', height: '100%' }}>
      {container && (
        <GraphCanvas
          container={container}
          apiRef={apiRef}
          theme="dark"
          is3D={is3D}
          nodeCloud
          edgeCloud
        />
      )}
    </div>
  );
}
