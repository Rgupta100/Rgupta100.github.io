export const chapters = ['overview', 'experience', 'projects', 'skills', 'contact'] as const;
export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export const smooth = (value: number) => { const x = clamp(value); return x * x * (3 - 2 * x); };

/** Transition on approach to a chapter, then hold its pose during reading. */
export function storyProgress(scrollY: number, tops: readonly number[], viewport: number): number {
  let progress = 0;
  for (let i = 1; i < tops.length; i++) {
    const start = Math.max(tops[i-1] + viewport * .4, tops[i] - viewport * 1.1);
    const end = tops[i] - viewport * .16;
    if (scrollY >= end) progress = i;
    else if (scrollY > start) { progress = i - 1 + smooth((scrollY - start) / (end - start)); break; }
    else break;
  }
  return clamp(progress, 0, Math.max(0, tops.length - 1));
}

export function activeChapter(scrollY: number, tops: readonly number[], viewport: number): number {
  let index = 0;
  tops.forEach((top, i) => { if (top <= scrollY + viewport * .38) index = i; });
  return index;
}
