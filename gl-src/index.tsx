import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import CyberGlobe from './scenes/cyber';
import Flights from './scenes/flights';
import Communities from './scenes/communities';
import Emphasis from './scenes/emphasis';
import Paysim from './scenes/paysim';

// Scene registry — maps data-scene values to React components.
const SCENES: Record<string, React.ComponentType<any>> = {
  cyber: CyberGlobe,
  flights: Flights,
  communities: Communities,
  emphasis: Emphasis,
  paysim: Paysim,
};

type Mounted = { root: Root; el: HTMLElement };
const mounted = new WeakMap<HTMLElement, Mounted>();

function mount(el: HTMLElement) {
  if (mounted.has(el)) return;
  const name = el.dataset.scene || 'network';
  const Scene = SCENES[name] || Network;
  const is3D = el.dataset.flat === '1' ? false : true;
  const root = createRoot(el);
  root.render(<Scene is3D={is3D} />);
  mounted.set(el, { root, el });
  el.classList.add('is-ready');
}

function unmount(el: HTMLElement) {
  const m = mounted.get(el);
  if (!m) return;
  m.root.unmount();
  mounted.delete(el);
  el.classList.remove('is-ready');
}

function init() {
  const nodes = [...document.querySelectorAll<HTMLElement>('.gl-mount[data-scene]')];
  if (!nodes.length) return;

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        const el = e.target as HTMLElement;
        if (e.isIntersecting) mount(el);
        else unmount(el);
      });
    },
    { rootMargin: '400px 0px 400px 0px', threshold: 0 },
  );

  nodes.forEach((el) => {
    if (el.dataset.eager) mount(el);
    io.observe(el);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
