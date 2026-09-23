/** A two-second spatial wave: near lights crest first, distant lights follow. */
export function pcRippleEnvelope(age: number, distance: number): number {
  if (!Number.isFinite(age) || age < 0 || age >= 2) return 0;
  const arrival = .3 + Math.max(0, Math.min(1, distance)) * 1.3;
  const phase = Math.abs(age - arrival) / .3;
  return phase >= 1 ? 0 : (1 + Math.cos(Math.PI * phase)) / 2;
}
