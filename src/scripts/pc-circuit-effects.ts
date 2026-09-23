/** Retained click impressions, and cursor-responsive background particles. */
export function installCircuitEffects() {
  const canvas = document.createElement('canvas');
  canvas.id = 'pc-circuit-effects'; canvas.setAttribute('aria-hidden', 'true');
  const context = canvas.getContext('2d');
  const settled = document.createElement('canvas');
  const settledContext = settled.getContext('2d');
  if (!context || !settledContext) return;
  document.body.append(canvas);
  const ctx = context, ink = settledContext;
  type Point = {x: number; y: number};
  type Trace = {points: Point[]; born: number};
  type Pulse = {branches: Trace[]; born: number};
  const pulses: Pulse[] = [];
  const particles = Array.from({length: 45}, (_, i) => ({
    x: ((i * .61803398875 + .08) % 1), y: ((i * .41421356237 + .11) % 1), ox: 0, oy: 0,
  }));
  let pointer: Point | undefined;
  let press: (Point & {id: number}) | undefined;
  let frame = 0, width = 1, height = 1, totalPatterns = 0, lastDraw = 0;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const enabled = () => !document.hidden && !reduced.matches && document.documentElement.dataset.pcMotion === 'on';
  const protectedTarget = (target: EventTarget | null) => target instanceof Element && !!target.closest('a,button,input,select,textarea,summary,label,h1,h2,h3,h4,p,li,dt,dd,#pc-controls,.pc-project-panel,[role="dialog"],dialog');
  function path(target: CanvasRenderingContext2D, points: Point[], reveal = 1) {
    target.beginPath(); target.moveTo(points[0].x, points[0].y);
    const count = (points.length - 1) * reveal;
    for (let i = 1; i < points.length; i++) {
      const t = Math.min(1, Math.max(0, count - i + 1));
      const a = points[i - 1], b = points[i];
      target.lineTo(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
      if (t < 1) break;
    }
    target.stroke();
  }
  function bake(pulse: Pulse) {
    // A fixed-size raster retains every click without retaining growing path arrays.
    ink.strokeStyle = 'rgba(217,172,112,.25)'; ink.lineWidth = 1.15; ink.lineJoin = 'round';
    for (const branch of pulse.branches) path(ink, branch.points);
  }
  function clearTransient() {
    for (const pulse of pulses) bake(pulse);
    pulses.length = 0; pointer = undefined; press = undefined;
    particles.forEach(particle => { particle.ox = particle.oy = 0; });
    cancelAnimationFrame(frame); frame = 0; lastDraw = 0;
    ctx.clearRect(0, 0, width, height);
    canvas.dataset.traces = canvas.dataset.pulses = canvas.dataset.activeParticles = '0';
    request();
  }
  function resize() {
    // Finish in-flight impressions before resizing, then rescale the accumulated layer.
    for (const pulse of pulses) bake(pulse);
    pulses.length = 0;
    const copy = document.createElement('canvas');
    copy.width = settled.width; copy.height = settled.height;
    copy.getContext('2d')?.drawImage(settled, 0, 0);
    width = Math.max(1, innerWidth); height = Math.max(1, innerHeight);
    const ratio = Math.min(devicePixelRatio || 1, 1.5, 2048 / Math.max(width, height));
    canvas.width = settled.width = Math.round(width * ratio);
    canvas.height = settled.height = Math.round(height * ratio);
    ink.drawImage(copy, 0, 0, settled.width, settled.height);
    copy.width = copy.height = 1;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ink.setTransform(ratio, 0, 0, ratio, 0, 0);
    clearTransient();
  }
  function request() { if (!frame && enabled()) frame = requestAnimationFrame(draw); }
  function draw(now: number) {
    frame = 0;
    if (!enabled()) { clearTransient(); return; }
    const dt = Math.min(50, lastDraw ? now - lastDraw : 16.7); lastDraw = now;
    while (pulses.length && now - pulses[0].born >= 1400) bake(pulses.shift()!);
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(settled, 0, 0, width, height);
    let moving = 0;
    ctx.fillStyle = 'rgba(161,200,206,.33)';
    for (const particle of particles) {
      const x = particle.x * width, y = particle.y * height;
      const dx = pointer ? x - pointer.x : 0, dy = pointer ? y - pointer.y : 0;
      const distance = Math.hypot(dx, dy);
      const strength = pointer ? Math.max(0, 1 - distance / 140) ** 2 * 34 : 0;
      const tx = distance > 0 ? dx / distance * strength : 0, ty = distance > 0 ? dy / distance * strength : 0;
      const ease = 1 - Math.exp(-dt / 115);
      particle.ox += (tx - particle.ox) * ease; particle.oy += (ty - particle.oy) * ease;
      if (Math.abs(tx - particle.ox) + Math.abs(ty - particle.oy) > .08) moving++;
      else { particle.ox = tx; particle.oy = ty; }
      ctx.beginPath(); ctx.arc(x + particle.ox, y + particle.oy, 1.15, 0, Math.PI * 2); ctx.fill();
    }
    ctx.lineWidth = 1.5; ctx.lineJoin = 'round';
    for (const pulse of pulses) {
      const age = Math.max(0, (now - pulse.born) / 1400);
      ctx.strokeStyle = `rgba(217,172,112,${.25 + (1 - age) ** 2 * .55})`;
      for (const branch of pulse.branches) {
        if (now < branch.born) continue;
        path(ctx, branch.points, Math.min(1, (now - branch.born) / 300));
      }
    }
    canvas.dataset.traces = '0'; canvas.dataset.pulses = String(pulses.length);
    canvas.dataset.patterns = String(totalPatterns); canvas.dataset.particles = String(particles.length);
    canvas.dataset.activeParticles = String(moving);
    if (pulses.length || moving) request();
  }
  window.addEventListener('pointermove', event => {
    if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 8) press = undefined;
    if (!enabled() || !['mouse', 'pen'].includes(event.pointerType) || protectedTarget(event.target)) {
      pointer = undefined; request(); return;
    }
    pointer = {x: event.clientX, y: event.clientY};
    request();
  }, {passive: true});
  window.addEventListener('pointerdown', event => {
    press = enabled() && event.isPrimary && event.button === 0 && !protectedTarget(event.target)
      ? {x: event.clientX, y: event.clientY, id: event.pointerId} : undefined;
  }, {passive: true});
  window.addEventListener('pointerup', event => {
    const start = press; press = undefined;
    if (!enabled() || !start || start.id !== event.pointerId || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8 || protectedTarget(event.target)) return;
    const origin = {x: event.clientX, y: event.clientY}, born = performance.now();
    const pulse: Pulse = {branches: [], born};
    for (let branch = 0; branch < 6; branch++) {
      const angle = branch * Math.PI / 3, length = 40 + branch % 3 * 13;
      const first = {x: origin.x + Math.cos(angle) * length, y: origin.y + Math.sin(angle) * length};
      const turn = angle + (branch % 2 ? 1 : -1) * Math.PI / 4;
      const second = {x: first.x + Math.cos(turn) * 35, y: first.y + Math.sin(turn) * 35};
      const end = {x: second.x + Math.cos(angle) * 24, y: second.y + Math.sin(angle) * 24};
      pulse.branches.push({points: [origin, first, second, end], born});
      pulse.branches.push({points: [first, {x: first.x + Math.cos(turn - Math.PI / 2) * 19, y: first.y + Math.sin(turn - Math.PI / 2) * 19}], born: born + 90});
    }
    // Active animation has a cap; the oldest complete pattern is retained before eviction.
    if (pulses.length >= 8) bake(pulses.shift()!);
    pulses.push(pulse); totalPatterns++; request();
  }, {passive: true});
  window.addEventListener('pointercancel', () => { press = undefined; pointer = undefined; request(); });
  document.documentElement.addEventListener('pointerleave', () => { pointer = undefined; request(); });
  window.addEventListener('scroll', clearTransient, {passive: true});
  window.addEventListener('blur', clearTransient);
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', clearTransient);
  reduced.addEventListener('change', clearTransient);
  new MutationObserver(clearTransient).observe(document.documentElement, {attributes: true, attributeFilter: ['data-pc-motion']});
  resize();
}
