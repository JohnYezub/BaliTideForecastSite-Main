// Build-time geometry for decorative tide curves. Import in .astro frontmatter only — ships 0 KB to the client.
// The curve is an illustration (two highs, two lows per day), NOT real tide data.

export type Pt = [number, number];

export function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Semidiurnal tide: M2-like (12.42 h) + diurnal inequality (24.84 h). Returns -1..1-ish. */
export const tide = (h: number) =>
  0.72 * Math.cos((2 * Math.PI * (h - 3)) / 12.42) + 0.28 * Math.cos((2 * Math.PI * (h - 10)) / 24.84);

/** Samples 24 h into n+1 points inside a w×h box. mid/amp in box units. */
export function samples(w: number, mid: number, amp: number, n = 48): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => [(i / n) * w, mid - amp * tide((i * 24) / n)] as Pt);
}

const r = (v: number) => Math.round(v * 10) / 10;

/** Catmull-Rom → cubic Bézier path through the points. */
export function smoothPath(p: Pt[]): string {
  let d = `M${r(p[0][0])} ${r(p[0][1])}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] ?? p2;
    d += ` C${r(p1[0] + (p2[0] - p0[0]) / 6)} ${r(p1[1] + (p2[1] - p0[1]) / 6)} ${r(p2[0] - (p3[0] - p1[0]) / 6)} ${r(p2[1] - (p3[1] - p1[1]) / 6)} ${r(p2[0])} ${r(p2[1])}`;
  }
  return d;
}

/** Closed water area under the curve, offset down by `drop`. */
export function waterPath(p: Pt[], w: number, h: number, drop = 38): string {
  return `${smoothPath(p.map(([x, y]) => [x, y + drop] as Pt))} L${w} ${h} L0 ${h} Z`;
}

/** Cumulative length fraction (0..1) at each sample → `data-bt-dist` for the Bali-time marker. */
export function distFractions(p: Pt[]): number[] {
  const acc = [0];
  for (let i = 1; i < p.length; i++) acc.push(acc[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
  const total = acc[acc.length - 1];
  return acc.map((v) => Math.round((v / total) * 10000) / 10000);
}

/** Example (hero, viewBox 0 0 1440 560):
 *  const pts = samples(1440, 330, 105);
 *  const curve = smoothPath(pts), water = waterPath(pts, 1440, 560), dist = distFractions(pts);
 *  const defaultNow = dist[30] * 100; // 15:00 fallback when JS is off
 */
