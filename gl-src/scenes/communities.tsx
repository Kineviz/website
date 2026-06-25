import React, { useRef, useEffect, useState } from 'react';
import { GraphCanvas, type RenderEngineApi } from '@kineviz/gl';

// Louvain community detection on the Les Misérables co-occurrence network,
// recolored to the calm Kineviz palette (no garish primaries).
const PALETTE = ['#8b5cf6', '#2dd4bf', '#fbbf24', '#60a5fa', '#34d399', '#f472b6', '#a78bfa', '#22d3ee', '#facc15', '#fb923c'];

export default function Communities({ is3D = false }: { is3D?: boolean }) {
  const apiRef = useRef<RenderEngineApi>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      while (!apiRef.current && !cancelled) await new Promise((r) => setTimeout(r, 50));
      if (cancelled) return;
      const api = apiRef.current!;

      const { nodes, edges } = await fetch('assets/data/les-miserables.json').then((r) => r.json());
      if (cancelled) return;
      await api.nodes.add(nodes);
      await api.edges.add(edges);

      await api.algorithms.louvain({ writeTo: 'community' });

      const communityIds = Array.from(
        new Set(api.nodes.getAll().map((n: any) => String(n.properties.community ?? ''))),
      ).filter(Boolean);
      const colorMap = Object.fromEntries(communityIds.map((c, i) => [c, PALETTE[i % PALETTE.length]]));
      await api.style.colorNodesByProperty('community', { mode: 'ordinal', colorMap });

      // Let the force layout spread the network before fitting the camera,
      // then re-fit a couple times as it settles.
      for (const d of [1500, 1200, 1200]) {
        await new Promise((r) => setTimeout(r, d));
        if (cancelled) return;
        await api.camera.flyToAll({ duration: 600 });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div ref={setContainer} style={{ width: '100%', height: '100%' }}>
      {container && (
        <GraphCanvas container={container} apiRef={apiRef} theme="dark" is3D={is3D} nodeCloud edgeCloud forceLayout />
      )}
    </div>
  );
}
