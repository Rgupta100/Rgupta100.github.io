export const pcChapters = ['overview', 'experience', 'projects', 'skills', 'contact'] as const;
export type PCChapter = typeof pcChapters[number];
export const pcLandmarks = [0, .25, .5, .75, 1] as const;
export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export const smooth = (value: number) => { const t = clamp(value); return t * t * (3 - 2 * t); };

export type StoryMarker = { top: number; value: number };
/** Complete each assembly before its heading; spend up to 1.85 viewports
 * getting there, reusing the preceding reading section rather than pinning it. */
export function pcTransitionRange(previous: StoryMarker, next: StoryMarker, height: number) {
  const end = next.top - height * .13;
  const start = Math.min(end - 1, Math.max(previous.top + height * .12, next.top - height * 1.98));
  return {start, end};
}

/** Absolute document mapping: holds a completed pose throughout its reading region. */
export function pcStoryProgress(y: number, markers: readonly StoryMarker[], height: number): number {
  let value = 0;
  for (let i = 1; i < markers.length; i++) {
    const previous = markers[i - 1], next = markers[i];
    const {start, end} = pcTransitionRange(previous, next, height);
    if (y >= end) value = next.value;
    else if (y > start) return previous.value + (next.value - previous.value) * smooth((y - start) / (end - start));
    else break;
  }
  return clamp(value);
}

export function pcActiveChapter(y: number, tops: readonly number[], height: number): number {
  let active = 0;
  tops.forEach((top, index) => { if (top <= y + height * .32) active = index; });
  return active;
}

type Shot = { p: number; yaw: number; elevation: number; frameHeight: number; x: number; y: number; target: readonly [number, number, number] };
const shots: readonly Shot[] = [
  {p: 0, yaw: -.91, elevation: .12, frameHeight: .79, x: .62, y: .54, target: [0, .265, 0]},
  {p: .25, yaw: -1.05, elevation: .16, frameHeight: .78, x: .265, y: .55, target: [-.04, .27, 0]},
  {p: .5, yaw: -.75, elevation: .27, frameHeight: 1.12, x: .52, y: .61, target: [-.12, .29, .01]},
  {p: .6, yaw: -.97, elevation: .46, frameHeight: .95, x: .84, y: .48, target: [-.12, .29, .01]},
  {p: .75, yaw: -1.48, elevation: .08, frameHeight: .43, x: .79, y: .54, target: [-.02, .33, -.07]},
  {p: 1, yaw: -.91, elevation: .19, frameHeight: .78, x: .265, y: .57, target: [0, .265, 0]},
];

/** Camera and framing are derived from the same value as the asset clip. */
export function pcCameraPose(value: number, inspection = false, aspect = 1.6, narrow = aspect < .9) {
  const p = clamp(value);
  let index = 0;
  while (index < shots.length - 2 && p > shots[index + 1].p) index++;
  const a = shots[index], b = shots[index + 1], t = smooth((p - a.p) / (b.p - a.p));
  const lerp = (x: number, y: number) => x + (y - x) * t;
  const frameHeight = lerp(a.frameHeight, b.frameHeight);
  const portraitFit = aspect < .9 ? Math.max(1.15, .86 / aspect) : 1;
  const narrowHero = narrow && !inspection ? .82 : 1;
  return {
    yaw: lerp(a.yaw, b.yaw), elevation: lerp(a.elevation, b.elevation),
    frameHeight: frameHeight * portraitFit * narrowHero,
    x: inspection || narrow ? .5 : lerp(a.x, b.x),
    y: inspection || narrow ? .5 : lerp(a.y, b.y),
    target: [lerp(a.target[0], b.target[0]), lerp(a.target[1], b.target[1]), lerp(a.target[2], b.target[2])] as [number, number, number],
  };
}
