import React, { useRef, useEffect, useState } from 'react';
import { GraphCanvas, type RenderEngineApi } from '@kineviz/gl';

// Focus & context on the Les Misérables network: select the protagonist and dim
// everything outside his 1-hop neighborhood, then gently cascade attention
// outward on a loop. Ambient (no user interaction needed).
const PALETTE = ['#8b5cf6', '#2dd4bf', '#fbbf24', '#60a5fa', '#34d399', '#f472b6'];

export default function Emphasis({ is3D = false }: { is3D?: boolean }) {
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

      // color by the dataset's group for a calm, structured look
      const groups = Array.from(new Set(api.nodes.getAll().map((n: any) => String(n.properties.group ?? '0'))));
      const colorMap = Object.fromEntries(groups.map((g, i) => [g, PALETTE[i % PALETTE.length]]));
      await api.style.colorNodesByProperty('group', { mode: 'ordinal', colorMap });

      // Let the force layout settle, then fit the whole network.
      for (const d of [1500, 1200, 1200]) {
        await new Promise((r) => setTimeout(r, d));
        if (cancelled) return;
        await api.camera.flyToAll({ duration: 600 });
      }

      await api.selection.selectNodes(['valjean']);
      // Keep context nodes visible (calm), just de-emphasized.
      let focusId = api.emphasis.focusContext('valjean', { contextOpacity: 0.4 });

      // Slow ambient loop: cascade attention outward, then settle back to focus.
      const loop = async () => {
        while (!cancelled) {
          await new Promise((r) => setTimeout(r, 2600));
          if (cancelled) break;
          api.emphasis.stop(focusId);
          const cascadeId = api.emphasis.cascadeHighlight('valjean');
          await new Promise((r) => setTimeout(r, 2600));
          if (cancelled) break;
          api.emphasis.stop(cascadeId);
          focusId = api.emphasis.focusContext('valjean', { contextOpacity: 0.4 });
        }
      };
      loop();
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
