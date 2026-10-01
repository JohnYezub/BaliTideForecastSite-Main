import surfData from './surf_spots.json';
import beachData from './beaches.json';

/**
 * Source of truth is the iOS app's bundled JSON, copied verbatim into src/data.
 *
 * Deliberately NOT published: perfectTideRange / goodTideRange / poorTideRange.
 * The recommended tide window is a paid feature of the app, so it stays in the
 * app. Everything else here is static reference data.
 */

interface WindRange {
  start: number;
  end: number;
}

interface RawSpot {
  name: string;
  type: string;
  level?: string;
  season?: string;
  latitude: number;
  longitude: number;
  onshoreWindRanges: WindRange[];
  offshoreWindRanges: WindRange[];
  waveRange?: { min: number; max: number };
}

export interface Spot {
  slug: string;
  name: string;
  area: string;
  /** True when the place appears in surf_spots.json. */
  isSurfSpot: boolean;
  /** True when the place appears in beaches.json. */
  isBeach: boolean;
  type: string;
  level?: string;
  season?: string;
  latitude: number;
  longitude: number;
  offshore: string;
  onshore: string;
  /** Source data lists overlapping onshore/offshore arcs for this spot. */
  windConflict: boolean;
  waveRange?: { min: number; max: number };
}

export const slugify = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[&']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** "Uluwatu Beach" and "Uluwatu" are the same place for URL purposes. */
const canonicalKey = (name: string): string =>
  slugify(name)
    .replace(/-beach$/, '')
    .replace(/-white-sand$/, '')
    .replace(/-padangbai$/, '');

/**
 * beaches.json and surf_spots.json name the same regions differently. Fold them
 * together so a place lands in one section, not two near-duplicates.
 */
const AREA_ALIASES: Record<string, string> = {
  'Kuta & Seminyak': 'Kuta',
  'Sanur & Nusa Dua': 'East Bali',
};

const normaliseArea = (name: string): string => AREA_ALIASES[name] ?? name;

const AREA_ORDER = ['Bukit Peninsula', 'Kuta', 'Canggu', 'West Bali', 'East Bali', 'North Bali', 'Nusa Lembongan'];

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

const toCompass = (deg: number): string => COMPASS[Math.round((deg % 360) / 22.5) % 16];

/**
 * The source data mixes two conventions for arcs crossing north: some wrap in a
 * single range (`270 -> 90`), others are pre-split (`345-360` plus `0-105`).
 * Normalise both, rejoin the 360/0 seam, and emit one "from X to Y" label.
 */
const describeWind = (ranges: WindRange[]): [number, number] | null => {
  if (!ranges?.length) return null;

  const segments: [number, number][] = [];
  for (const r of ranges) {
    if (r.start > r.end) segments.push([r.start, 360], [0, r.end]);
    else segments.push([r.start, r.end]);
  }
  segments.sort((a, b) => a[0] - b[0]);

  const merged: [number, number][] = [];
  for (const seg of segments) {
    const last = merged[merged.length - 1];
    if (last && seg[0] <= last[1] + 1) last[1] = Math.max(last[1], seg[1]);
    else merged.push([...seg]);
  }

  // A segment touching 0 and another touching 360 are one arc across north.
  if (merged.length > 1 && merged[0][0] <= 0 && merged[merged.length - 1][1] >= 360) {
    const head = merged.shift()!;
    const tail = merged.pop()!;
    merged.push([tail[0], head[1] + 360]);
  }

  return merged[0];
};

const windLabel = (arc: [number, number] | null): string => {
  if (!arc) return '';
  const a = toCompass(arc[0]);
  const b = toCompass(arc[1]);
  return a === b ? a : `${a}–${b}`;
};

/** Normalised arcs overlap -> the source data contradicts itself for that spot. */
const arcsOverlap = (x: [number, number] | null, y: [number, number] | null): boolean => {
  if (!x || !y) return false;
  const spans = (arc: [number, number]) => {
    const [s, e] = arc;
    return e > 360 ? [[s, 360] as const, [0, e - 360] as const] : [[s, e] as const];
  };
  for (const [as, ae] of spans(x)) {
    for (const [bs, be] of spans(y)) {
      if (Math.min(ae, be) - Math.max(as, bs) > 10) return true;
    }
  }
  return false;
};

const TYPE_LABEL: Record<string, string> = {
  reef: 'Reef break',
  beach: 'Beach break',
  point: 'Point break',
  'beach & reef': 'Beach and reef break',
  'river mouth': 'River mouth',
  'reef & river mouth': 'Reef and river mouth',
};

const SEASON_LABEL: Record<string, string> = {
  dry: 'Dry season (roughly April–October)',
  wet: 'Wet season (roughly November–March)',
  all: 'All year',
};

/** Reads naturally after "It works best ..." / "... a reef break <in X>". */
export const areaPhrase = (area: string) => {
  const suffix = /bali|lembongan/i.test(area) ? '' : ', Bali';
  return /peninsula/i.test(area) ? `on the ${area}${suffix}` : `in ${area}${suffix}`;
};

export const areaLabel = (area: string) => (/bali/i.test(area) ? area : `${area}, Bali`);

export const seasonSentence = (s?: string) => {
  if (!s) return '';
  if (s === 'all') return ' It works year-round.';
  const label = SEASON_LABEL[s] ?? s;
  // Lower-case only the leading word — month names must keep their capitals.
  return ` It works best in the ${label.charAt(0).toLowerCase()}${label.slice(1)}.`;
};

export const typeLabel = (t: string) => TYPE_LABEL[t] ?? t;
export const seasonLabel = (s?: string) => (s ? (SEASON_LABEL[s] ?? s) : undefined);
export const levelLabel = (l?: string) =>
  l && l !== 'all' ? l.charAt(0).toUpperCase() + l.slice(1) : l === 'all' ? 'All levels' : undefined;

const wind = (raw: RawSpot) => {
  const off = describeWind(raw.offshoreWindRanges);
  const on = describeWind(raw.onshoreWindRanges);
  return { offshore: windLabel(off), onshore: windLabel(on), windConflict: arcsOverlap(off, on) };
};

function build(): Spot[] {
  const byKey = new Map<string, Spot>();

  for (const area of surfData.areas) {
    for (const raw of area.spots as RawSpot[]) {
      const key = canonicalKey(raw.name);
      byKey.set(key, {
        slug: key,
        name: raw.name,
        area: normaliseArea(area.name),
        isSurfSpot: true,
        isBeach: false,
        type: raw.type,
        level: raw.level,
        season: raw.season,
        latitude: raw.latitude,
        longitude: raw.longitude,
        ...wind(raw),
        waveRange: raw.waveRange,
      });
    }
  }

  for (const area of beachData.areas) {
    for (const raw of area.spots as RawSpot[]) {
      const key = canonicalKey(raw.name);
      const existing = byKey.get(key);
      if (existing) {
        existing.isBeach = true;
        continue;
      }
      byKey.set(key, {
        slug: key,
        name: raw.name,
        area: normaliseArea(area.name),
        isSurfSpot: false,
        isBeach: true,
        type: raw.type,
        latitude: raw.latitude,
        longitude: raw.longitude,
        ...wind(raw),
      });
    }
  }

  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export const spots = build();

export const areas = [...new Set(spots.map((s) => s.area))]
  .sort((a, b) => {
    const ia = AREA_ORDER.indexOf(a);
    const ib = AREA_ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  })
  .map((name) => ({
    name,
    slug: slugify(name),
    spots: spots.filter((s) => s.area === name),
  }));

/** "A, B and C" for prose that must stay in sync with the data. */
export const areaNames = () => {
  const names = areas.map((a) => a.name);
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
};

export const SURF_SPOT_COUNT = surfData.areas.reduce((n, a) => n + a.spots.length, 0);
export const BEACH_COUNT = beachData.areas.reduce((n, a) => n + a.spots.length, 0);
