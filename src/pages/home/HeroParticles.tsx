import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * HeroParticles — Three.js neural particle field (home.md §1): 120–180
 * nodes, lines between nodes < 140px apart, slow drift, cursor repel radius
 * 160px, lines brighten within 200px of the cursor. Pauses when the tab is
 * hidden or the hero is scrolled past (home.md page notes).
 *
 * R3F orthographic camera ⇒ world units = CSS pixels, origin at center.
 * Lazy-loaded + Suspense'd by the Hero; this is the only always-on canvas
 * animation on the page (design.md §9).
 */

// density scales with viewport area (design: 120–180 nodes on desktop;
// fewer on small screens so text stays readable)
const NODE_COUNT = Math.max(
  55,
  Math.min(170, Math.round((window.innerWidth * window.innerHeight) / 9000)),
);
const LINK_DIST = window.innerWidth < 640 ? 110 : 140;
const REPEL_RADIUS = 160;
const BRIGHT_RADIUS = 200;

const CYAN = new THREE.Color('#22D3EE');
const VIOLET = new THREE.Color('#A78BFA');

interface SimData {
  base: Float32Array;
  phase: Float32Array;
  speed: Float32Array;
  disp: Float32Array;
  colors: Float32Array;
  linePos: Float32Array;
  lineCol: Float32Array;
  cur: Float32Array;
}

function createSimData(): SimData {
  const w = 1920;
  const h = 1080;
  const base = new Float32Array(NODE_COUNT * 3);
  const phase = new Float32Array(NODE_COUNT);
  const speed = new Float32Array(NODE_COUNT);
  const disp = new Float32Array(NODE_COUNT * 2);
  for (let i = 0; i < NODE_COUNT; i++) {
    base[i * 3] = (Math.random() - 0.5) * w;
    base[i * 3 + 1] = (Math.random() - 0.5) * h;
    base[i * 3 + 2] = 0;
    phase[i] = Math.random() * Math.PI * 2;
    speed[i] = 0.35 + Math.random() * 0.5;
  }
  const colors = new Float32Array(NODE_COUNT * 3);
  const tmp = new THREE.Color();
  for (let i = 0; i < NODE_COUNT; i++) {
    const t = base[i * 3] / w + 0.5;
    tmp.copy(CYAN).lerp(VIOLET, THREE.MathUtils.clamp(t, 0, 1));
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  const maxSegs = (NODE_COUNT * (NODE_COUNT - 1)) / 2;
  return {
    base,
    phase,
    speed,
    disp,
    colors,
    linePos: new Float32Array(maxSegs * 6),
    lineCol: new Float32Array(maxSegs * 6),
    cur: new Float32Array(NODE_COUNT * 3),
  };
}

// Module-level initialization avoids setState-in-effect and impure hook issues.
const INITIAL_SIM = createSimData();
const INITIAL_PG = new THREE.BufferGeometry();
INITIAL_PG.setAttribute('position', new THREE.BufferAttribute(INITIAL_SIM.cur, 3));
INITIAL_PG.setAttribute('color', new THREE.BufferAttribute(INITIAL_SIM.colors, 3));
const INITIAL_LG = new THREE.BufferGeometry();
INITIAL_LG.setAttribute('position', new THREE.BufferAttribute(INITIAL_SIM.linePos, 3));
INITIAL_LG.setAttribute('color', new THREE.BufferAttribute(INITIAL_SIM.lineCol, 3));

function ParticleField({ runningRef }: { runningRef: React.RefObject<boolean> }) {
  const viewport = useThree((s) => s.viewport);
  const pointer = useThree((s) => s.pointer);

  const pointsRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  const simRef = useRef<SimData>(INITIAL_SIM);

  const [geometries] = useState({ pg: INITIAL_PG, lg: INITIAL_LG });

  useEffect(() => {
    return () => {
      geometries.pg.dispose();
      geometries.lg.dispose();
    };
  }, [geometries]);

  useFrame(({ clock }) => {
    if (!runningRef.current) return;
    const sim = simRef.current;
    const geom = geometries;

    const t = clock.getElapsedTime();
    const { base, phase, speed, disp, cur, linePos, lineCol } = sim;
    const w = viewport.width;
    const h = viewport.height;
    const mx = (pointer.x * w) / 2;
    const my = (pointer.y * h) / 2;

    // update node positions: base + sine drift + repel displacement
    for (let i = 0; i < NODE_COUNT; i++) {
      let x = base[i * 3] + Math.sin(t * speed[i] + phase[i]) * 14;
      let y = base[i * 3 + 1] + Math.cos(t * speed[i] * 0.8 + phase[i] * 1.3) * 12;
      // wrap into viewport
      x = THREE.MathUtils.euclideanModulo(x + w / 2, w) - w / 2;
      y = THREE.MathUtils.euclideanModulo(y + h / 2, h) - h / 2;

      // cursor repel (never modify base — displacement with lerp decay)
      const dx = x + disp[i * 2] - mx;
      const dy = y + disp[i * 2 + 1] - my;
      const d = Math.hypot(dx, dy);
      if (d < REPEL_RADIUS && d > 0.001) {
        const f = ((REPEL_RADIUS - d) / REPEL_RADIUS) * 3.2;
        disp[i * 2] += (dx / d) * f;
        disp[i * 2 + 1] += (dy / d) * f;
      }
      disp[i * 2] *= 0.95;
      disp[i * 2 + 1] *= 0.95;

      cur[i * 3] = x + disp[i * 2];
      cur[i * 3 + 1] = y + disp[i * 2 + 1];
      cur[i * 3 + 2] = 0;
    }

    // rebuild line segments between near nodes
    let seg = 0;
    const tmp = new THREE.Color();
    for (let i = 0; i < NODE_COUNT; i++) {
      const xi = cur[i * 3];
      const yi = cur[i * 3 + 1];
      for (let j = i + 1; j < NODE_COUNT; j++) {
        const xj = cur[j * 3];
        const yj = cur[j * 3 + 1];
        const ddx = xi - xj;
        const ddy = yi - yj;
        const dist = Math.sqrt(ddx * ddx + ddy * ddy);
        if (dist < LINK_DIST) {
          const o = seg * 6;
          linePos[o] = xi;
          linePos[o + 1] = yi;
          linePos[o + 2] = 0;
          linePos[o + 3] = xj;
          linePos[o + 4] = yj;
          linePos[o + 5] = 0;
          // brightness: proximity + cursor proximity boost
          let bright = 0.12 + 0.24 * (1 - dist / LINK_DIST);
          const cmx = (xi + xj) / 2 - mx;
          const cmy = (yi + yj) / 2 - my;
          const cd = Math.sqrt(cmx * cmx + cmy * cmy);
          if (cd < BRIGHT_RADIUS) bright += 0.45 * (1 - cd / BRIGHT_RADIUS);
          const tt = (xi + w / 2) / w;
          tmp.copy(CYAN).lerp(VIOLET, THREE.MathUtils.clamp(tt, 0, 1)).multiplyScalar(bright);
          lineCol[o] = tmp.r;
          lineCol[o + 1] = tmp.g;
          lineCol[o + 2] = tmp.b;
          lineCol[o + 3] = tmp.r;
          lineCol[o + 4] = tmp.g;
          lineCol[o + 5] = tmp.b;
          seg++;
        }
      }
    }
    geom.lg.setDrawRange(0, seg * 2);
    (geom.pg.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (geom.lg.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (geom.lg.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
  });

  return (
    <>
      <points ref={pointsRef} geometry={geometries.pg}>
        <pointsMaterial size={3} vertexColors transparent opacity={0.75} sizeAttenuation={false} depthWrite={false} />
      </points>
      <lineSegments ref={linesRef} geometry={geometries.lg}>
        <lineBasicMaterial vertexColors transparent blending={THREE.AdditiveBlending} depthWrite={false} />
      </lineSegments>
    </>
  );
}

export default function HeroParticles({ heroRef }: { heroRef: React.RefObject<HTMLElement | null> }) {
  const runningRef = useRef(true);

  useEffect(() => {
    const onVis = () => {
      runningRef.current = document.visibilityState === 'visible';
    };
    document.addEventListener('visibilitychange', onVis);
    const el = heroRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        runningRef.current = entries[0].isIntersecting && document.visibilityState === 'visible';
      },
      { threshold: 0.05 },
    );
    if (el) io.observe(el);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      io.disconnect();
    };
  }, [heroRef]);

  return (
    <Canvas
      orthographic
      camera={{ position: [0, 0, 10], zoom: 1, near: 0.1, far: 100 }}
      dpr={[1, 1.5]}
      gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    >
      <ParticleField runningRef={runningRef} />
    </Canvas>
  );
}
