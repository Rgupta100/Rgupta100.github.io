/** Short-lived circuit traces beneath the computer and reading layers. */
export function installCircuitEffects() {
  const canvas = document.createElement('canvas');
  canvas.id = 'pc-circuit-effects'; canvas.setAttribute('aria-hidden', 'true');
  const context = canvas.getContext('2d');
  if (!context) return;
  document.body.append(canvas);
  const ctx = context;
  type Point = {x: number; y: number};
  type Trace = {points: Point[]; born: number};
  const traces: Trace[] = [], pulses: Trace[] = [];
  let previous: Point | undefined, frame = 0, width = 1, height = 1;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const enabled = () => !document.hidden && !reduced.matches && document.documentElement.dataset.pcMotion === 'on';
  const protectedTarget = (target: EventTarget | null) => target instanceof Element && !!target.closest('a,button,input,select,textarea,summary,label,h1,h2,h3,h4,p,li,dt,dd,#pc-controls');
  function clear() {
    traces.length = pulses.length = 0; previous = undefined; press = undefined;
    cancelAnimationFrame(frame); frame = 0;
    ctx.clearRect(0, 0, width, height);
    canvas.dataset.traces = canvas.dataset.pulses = '0';
  }
  function resize() {
    width = innerWidth; height = innerHeight;
    const ratio = Math.min(devicePixelRatio, 1.5);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0); clear();
  }
  function request() { if (!frame && enabled()) frame = requestAnimationFrame(draw); }
  function draw(now: number) {
    frame = 0;
    if (!enabled()) { clear(); return; }
    ctx.clearRect(0, 0, width, height);
    for (const [items, life, color] of [[traces, 1100, '57,219,232'], [pulses, 1600, '217,172,112']] as const) {
      while (items.length && now - items[0].born > life) items.shift();
      for (const trace of items) {
        const age = (now - trace.born) / life;
        if (age < 0) continue;
        ctx.strokeStyle = `rgba(${color},${(1 - age) ** 2 * (items === traces ? .85 : .62)})`;
        ctx.lineWidth = 1.5;
        ctx.lineJoin = 'round'; ctx.beginPath();
        ctx.moveTo(trace.points[0].x, trace.points[0].y);
        const reveal = items === pulses ? Math.min(1, age * 5) : 1;
        const count = (trace.points.length - 1) * reveal;
        for (let i = 1; i < trace.points.length; i++) {
          const t = Math.min(1, Math.max(0, count - i + 1));
          const a = trace.points[i - 1], b = trace.points[i];
          ctx.lineTo(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
          if (t < 1) break;
        }
        ctx.stroke();
      }
    }
    canvas.dataset.traces = String(traces.length); canvas.dataset.pulses = String(pulses.length);
    if (traces.length || pulses.length) request();
  }
  window.addEventListener('pointermove', event => {
    if (!enabled() || !['mouse', 'pen'].includes(event.pointerType) || protectedTarget(event.target)) { previous = undefined; return; }
    const point = {x: event.clientX, y: event.clientY};
    if (previous) {
      const distance = Math.hypot(point.x - previous.x, point.y - previous.y);
      if (distance < 9) return;
      if (distance < 160) {
        const bend = Math.abs(point.x - previous.x) > Math.abs(point.y - previous.y)
          ? {x: point.x, y: previous.y} : {x: previous.x, y: point.y};
        traces.push({points: [previous, bend, point], born: performance.now()});
        if (traces.length > 48) traces.shift();
        request();
      }
    }
    previous = point;
  }, {passive: true});
  let press: Point | undefined;
  window.addEventListener('pointerdown', event => { press = event.isPrimary && event.button === 0 ? {x: event.clientX, y: event.clientY} : undefined; }, {passive: true});
  window.addEventListener('pointerup', event => {
    const start = press; press = undefined;
    if (!enabled() || !start || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8 || protectedTarget(event.target)) return;
    const origin = {x: event.clientX, y: event.clientY}, born = performance.now();
    for (let branch = 0; branch < 6; branch++) {
      const angle = branch * Math.PI / 3;
      const length = 40 + branch % 3 * 13;
      const first = {x: origin.x + Math.cos(angle) * length, y: origin.y + Math.sin(angle) * length};
      const turn = angle + (branch % 2 ? 1 : -1) * Math.PI / 4;
      const second = {x: first.x + Math.cos(turn) * 35, y: first.y + Math.sin(turn) * 35};
      const end = {x: second.x + Math.cos(angle) * 24, y: second.y + Math.sin(angle) * 24};
      pulses.push({points: [origin, first, second, end], born});
      pulses.push({points: [first, {x: first.x + Math.cos(turn - Math.PI / 2) * 19, y: first.y + Math.sin(turn - Math.PI / 2) * 19}], born: born + 90});
    }
    if (pulses.length > 36) pulses.splice(0, pulses.length - 36);
    request();
  }, {passive: true});
  window.addEventListener('pointercancel', () => { press = undefined; previous = undefined; });
  document.documentElement.addEventListener('pointerleave', () => { previous = undefined; });
  window.addEventListener('scroll', clear, {passive: true});
  window.addEventListener('blur', clear);
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', clear);
  reduced.addEventListener('change', clear);
  new MutationObserver(() => { if (!enabled()) clear(); }).observe(document.documentElement, {attributes: true, attributeFilter: ['data-pc-motion']});
  resize();
}
