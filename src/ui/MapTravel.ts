import type { MapPoint } from '../types/mapRegions';

export interface BoatTravelOptions {
  boat: HTMLElement;
  path: MapPoint[];
  /** Inclusive end index along path */
  endIndex: number;
  durationMs?: number;
}

/**
 * Animate a boat element along a % polyline inside a positioned parent.
 */
export function animateBoatAlongPath(opts: BoatTravelOptions): Promise<void> {
  const { boat, path, endIndex } = opts;
  const durationMs = opts.durationMs ?? 1200;
  const cappedEnd = Math.max(0, Math.min(endIndex, path.length - 1));
  const segment = path.slice(0, cappedEnd + 1);
  if (segment.length === 0) {
    return Promise.resolve();
  }

  const samples = densifyPath(segment, Math.max(12, cappedEnd * 8));
  boat.classList.add('map-boat--traveling');
  placeBoat(boat, samples[0]!);

  const start = performance.now();
  return new Promise((resolve) => {
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) * (1 - t);
      const idx = Math.min(samples.length - 1, Math.floor(eased * (samples.length - 1)));
      const nextIdx = Math.min(samples.length - 1, idx + 1);
      const localT = samples.length === 1 ? 1 : eased * (samples.length - 1) - idx;
      const a = samples[idx]!;
      const b = samples[nextIdx]!;
      const x = a[0] + (b[0] - a[0]) * localT;
      const y = a[1] + (b[1] - a[1]) * localT;
      const angle = Math.atan2(b[1] - a[1], b[0] - a[0]) * (180 / Math.PI);
      placeBoat(boat, [x, y], angle);
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        boat.classList.remove('map-boat--traveling');
        resolve();
      }
    };
    requestAnimationFrame(tick);
  });
}

function placeBoat(boat: HTMLElement, point: MapPoint, angleDeg = 0): void {
  boat.style.left = `${point[0]}%`;
  boat.style.top = `${point[1]}%`;
  boat.style.transform = `translate(-50%, -50%) rotate(${angleDeg}deg)`;
}

function densifyPath(path: MapPoint[], targetPoints: number): MapPoint[] {
  if (path.length <= 1) {
    return path.slice();
  }
  const lengths: number[] = [0];
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const dx = path[i]![0] - path[i - 1]![0];
    const dy = path[i]![1] - path[i - 1]![1];
    total += Math.hypot(dx, dy);
    lengths.push(total);
  }
  if (total <= 0) {
    return path.slice();
  }

  const out: MapPoint[] = [];
  for (let s = 0; s < targetPoints; s++) {
    const dist = (s / (targetPoints - 1)) * total;
    let i = 1;
    while (i < lengths.length && lengths[i]! < dist) {
      i += 1;
    }
    const i0 = Math.max(0, i - 1);
    const i1 = Math.min(path.length - 1, i);
    const segLen = lengths[i1]! - lengths[i0]!;
    const u = segLen <= 0 ? 0 : (dist - lengths[i0]!) / segLen;
    const a = path[i0]!;
    const b = path[i1]!;
    out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]);
  }
  return out;
}
