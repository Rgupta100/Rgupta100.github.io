import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { pcActiveChapter, pcChapters, pcStoryProgress, type StoryMarker } from './pc-story';
import type { PCLighting, PCScene, PCSceneState } from './pc-scene';
import { installCircuitEffects } from './pc-circuit-effects';
import { installProjectPanels } from './pc-project-panels';

gsap.registerPlugin(ScrollTrigger);
const root = document.documentElement;
const stage = document.querySelector<HTMLElement>('#pc-stage')!;
const canvas = document.querySelector<HTMLCanvasElement>('#pc-canvas')!;
const main = document.querySelector<HTMLElement>('#main')!;
const controls = document.querySelector<HTMLElement>('#pc-controls')!;
const explore = document.querySelector<HTMLDetailsElement>('#pc-explore')!;
const view = document.querySelector<HTMLSelectElement>('#pc-view')!;
const play = document.querySelector<HTMLButtonElement>('#pc-play')!;
const fans = document.querySelector<HTMLButtonElement>('#pc-fans')!;
const lighting = document.querySelector<HTMLSelectElement>('#pc-lighting')!;
const glass = document.querySelector<HTMLInputElement>('#pc-glass')!;
const returnButton = document.querySelector<HTMLButtonElement>('#pc-return')!;
const motionButton = document.querySelector<HTMLButtonElement>('#pc-motion')!;
const status = document.querySelector<HTMLElement>('#pc-control-status')!;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const desktop = matchMedia('(min-width: 1000px)');
const fine = matchMedia('(hover: hover) and (pointer: fine)');
const sections = pcChapters.map(id => document.getElementById(id)!);
const markerElements = [...document.querySelectorAll<HTMLElement>('[data-story]')];
const state: PCSceneState = {progress: 0, inspection: false, lighting: 'rgb', fanOverride: true, glassClarity: 1};
let userOff = false;
try { userOff = localStorage.getItem('portfolio-motion') === 'off'; } catch { /* Storage is optional. */ }
let scene: PCScene | undefined;
let generation = 0, loading = false, failed = false, scheduled = 0, previousChapter = -1;
let markers: StoryMarker[] = [], tops: number[] = [], scrollProgress = 0, stageVisible = true;
let sequence: gsap.core.Tween | undefined;
let catchup: gsap.core.Tween | undefined;
let playing = false;
const motionEnabled = () => !userOff && !reduced.matches;

function showGraphics(ready: boolean) {
  // Loading or disabling 3D adds/removes the opening travel. Keep a restored
  // chapter at the same reading position across that one layout change.
  const chapter = sections.find(section => section.id === location.hash.slice(1));
  const before = chapter?.getBoundingClientRect().top;
  const anchored = chapter && chapter.id !== 'overview' && before !== undefined && Math.abs(before - 108) < 140;
  stage.classList.toggle('is-ready', ready);
  root.dataset.pcGraphics = ready ? 'ready' : 'fallback';
  if (anchored) scrollBy({top: chapter.getBoundingClientRect().top - before, behavior: 'instant'});
  requestAnimationFrame(measure);
}

function stopSequence() {
  sequence?.kill(); sequence = undefined; playing = false; play.textContent = 'Play sequence';
}
function renderState() {
  scene?.setState(state);
  root.style.setProperty('--pc-progress', String(state.progress));
  if (import.meta.env.DEV) stage.dataset.story = state.progress.toFixed(5);
}
function setInspection(active: boolean) {
  catchup?.kill(); catchup = undefined;
  state.inspection = active; root.classList.toggle('pc-inspecting', active);
  main.inert = active; returnButton.hidden = !active;
  if (!active && !desktop.matches) explore.open = false;
  controls.hidden = !scene;
  requestAnimationFrame(() => { scene?.resize(); renderState(); });
}
function returnToReading() {
  stopSequence(); setInspection(false);
  state.progress = scrollProgress; renderState();
  status.textContent = 'Portfolio view restored.';
}
function syncPoster(active: number) {
  const id = pcChapters[desktop.matches ? active : 0];
  const poster = stage.querySelector<HTMLImageElement>('img')!;
  poster.src = `/images/pc-19/${id}-desktop.webp`;
  stage.querySelector<HTMLSourceElement>('source')!.srcset = '/images/pc-19/overview-mobile.webp';
}
function sync(immediate = true) {
  scheduled = 0;
  const next = pcStoryProgress(scrollY, markers, innerHeight);
  if (Math.abs(next - scrollProgress) > .00025) scene?.burst();
  scrollProgress = next;
  if (!state.inspection) {
    catchup?.kill(); catchup = undefined;
    if (!immediate && scene && motionEnabled() && stageVisible && Math.abs(next - state.progress) > .0001) {
      // Scroll travel supplies the slow choreography; this short catch-up only
      // removes wheel steps. Navigation/restoration always samples exactly.
      catchup = gsap.to(state, {progress: next, duration: .24, ease: 'power2.out',
        onUpdate: renderState, onComplete: () => { catchup = undefined; }});
    } else state.progress = next;
  }
  const active = pcActiveChapter(scrollY, tops, innerHeight);
  if (active !== previousChapter) {
    if (previousChapter >= 0 && motionEnabled()) scene?.sendPackets();
    previousChapter = active; root.dataset.pcChapter = pcChapters[active]; syncPoster(active);
    document.querySelectorAll<HTMLAnchorElement>('[data-nav-chapter]').forEach(link => {
      if (link.hash === `#${pcChapters[active]}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  if (scene && !state.inspection) {
    controls.hidden = desktop.matches ? scrollY > Math.max(150, innerHeight * .35) : !stageVisible;
  }
  renderState();
}
function schedule() { if (!scheduled) scheduled = requestAnimationFrame(() => sync(false)); }
function measure() {
  // Read every rectangle before changing state/styles.
  markers = markerElements.map(element => ({top: element.getBoundingClientRect().top + scrollY, value: Number(element.dataset.story)}));
  tops = sections.map(section => section.getBoundingClientRect().top + scrollY);
  sync(); scene?.resize();
}
function syncMotion() {
  root.dataset.pcMotion = motionEnabled() ? 'on' : 'off'; motionButton.hidden = false;
  motionButton.disabled = reduced.matches;
  motionButton.setAttribute('aria-pressed', String(!motionEnabled()));
  motionButton.textContent = reduced.matches ? 'Reduced motion' : motionEnabled() ? 'Motion on' : 'Motion off';
  motionButton.setAttribute('aria-label', reduced.matches ? 'Motion disabled by system preference' : motionEnabled() ? 'Turn motion off' : 'Turn motion on');
}
async function configure() {
  syncMotion(); previousChapter = -1; measure();
  if (!motionEnabled() || (!desktop.matches && !fine.matches)) {
    generation++; loading = false; stopSequence(); setInspection(false);
    scene?.dispose(); scene = undefined; showGraphics(false); controls.hidden = true;
    return;
  }
  if (scene) {
    if (!desktop.matches && explore.open) setInspection(true);
    return;
  }
  if (loading || failed) return;
  const token = ++generation; loading = true;
  delete canvas.dataset.rendered;
  try {
    const {createPCScene} = await import('./pc-scene');
    if (token !== generation) return;
    const instance = await createPCScene(canvas, error => {
      failed = true; stopSequence(); setInspection(false); scene?.dispose(); scene = undefined;
      showGraphics(false); controls.hidden = true;
      console.warn('The interactive computer is unavailable; the rendered images and portfolio remain accessible.', error);
    });
    if (token !== generation) { instance.dispose(); return; }
    scene = instance; scene.setVisible(stageVisible); sync(); scene.resize();
    // createPCScene queued its first frame; apply current restored state before reveal.
    requestAnimationFrame(() => {
      if (token === generation && canvas.dataset.rendered === 'true') showGraphics(true);
    });
  } catch (error) {
    failed = true; controls.hidden = true; showGraphics(false);
    console.warn('The interactive computer is unavailable; the rendered images and portfolio remain accessible.', error);
  } finally { if (token === generation) loading = false; }
}

canvas.addEventListener('pc-rendered', () => {
  if (scene && motionEnabled()) showGraphics(true);
});

explore.addEventListener('toggle', () => {
  if (desktop.matches || !scene) return;
  if (explore.open && !state.inspection) {
    setInspection(true); scene.burst(); renderState();
    status.textContent = 'Computer inspection. Close these controls or return to the portfolio to continue reading.';
  } else if (!explore.open && state.inspection) returnToReading();
});

view.addEventListener('change', () => {
  if (!scene || !motionEnabled()) return;
  stopSequence(); setInspection(true); state.progress = Number(view.value); scene.burst(); renderState();
  status.textContent = `${view.selectedOptions[0].text} view.`;
});
play.addEventListener('click', () => {
  if (!scene || !motionEnabled()) return;
  if (playing) { stopSequence(); play.textContent = 'Replay sequence'; status.textContent = 'Sequence stopped.'; return; }
  stopSequence(); setInspection(true); state.progress = 0; playing = true; play.textContent = 'Stop sequence';
  scene.burst(); renderState();
  sequence = gsap.to(state, {progress: 1, duration: 50, ease: 'none', onUpdate: () => { scene?.burst(); renderState(); }, onComplete: () => {
    playing = false; sequence = undefined; play.textContent = 'Replay sequence'; view.value = '1'; status.textContent = 'Sequence complete.';
  }});
});
fans.addEventListener('click', () => {
  state.fanOverride = state.fanOverride === true ? false : true;
  fans.textContent = state.fanOverride ? 'Pause fans' : 'Resume fans';
  renderState(); status.textContent = state.fanOverride ? 'Fans running while the computer is visible.' : 'Fans slowing to a stop.';
});
lighting.addEventListener('change', () => { state.lighting = lighting.value as PCLighting; renderState(); });
glass.addEventListener('input', () => {
  state.glassClarity = .2 + .8 * Number(glass.value) / 100;
  document.querySelector('#pc-glass-value')!.textContent = `${glass.value}% clear`;
  glass.setAttribute('aria-valuetext', `${glass.value} percent clear`);
  renderState();
});
returnButton.addEventListener('click', () => { returnToReading(); explore.querySelector('summary')?.focus({preventScroll: true}); });
motionButton.addEventListener('click', () => {
  if (reduced.matches) return;
  userOff = !userOff; try { localStorage.setItem('portfolio-motion', userOff ? 'off' : 'on'); } catch { /* Storage is optional. */ }
  failed = false; configure();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && state.inspection) { returnToReading(); explore.querySelector('summary')?.focus({preventScroll: true}); }
});
document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach(link => link.addEventListener('click', () => {
  if (state.inspection) returnToReading();
  explore.open = false;
  requestAnimationFrame(measure);
}));
addEventListener('scroll', () => { if (state.inspection) returnToReading(); schedule(); }, {passive: true});
addEventListener('resize', () => { measure(); });
addEventListener('hashchange', () => { if (state.inspection) returnToReading(); requestAnimationFrame(measure); });
addEventListener('popstate', () => { if (state.inspection) returnToReading(); requestAnimationFrame(measure); });
addEventListener('pageshow', () => { requestAnimationFrame(measure); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { sequence?.pause(); catchup?.kill(); catchup = undefined; }
  else { measure(); if (state.inspection && playing) sequence?.resume(); }
});
const observer = new IntersectionObserver(entries => {
  stageVisible = entries[0].isIntersecting || state.inspection;
  scene?.setVisible(stageVisible); sync();
}, {threshold: 0});
observer.observe(stage);
const resizeObserver = new ResizeObserver(() => { measure(); ScrollTrigger.refresh(); });
resizeObserver.observe(main);
reduced.addEventListener('change', configure); desktop.addEventListener('change', configure); fine.addEventListener('change', configure);
document.fonts.ready.then(() => { measure(); ScrollTrigger.refresh(); });

document.querySelector<HTMLButtonElement>('#copy-email')?.addEventListener('click', async () => {
  const copyStatus = document.querySelector<HTMLElement>('#copy-status')!;
  const email = document.querySelector<HTMLButtonElement>('#copy-email')!.dataset.email!;
  try { await navigator.clipboard.writeText(email); copyStatus.textContent = 'Email address copied.'; }
  catch { copyStatus.textContent = 'Copy unavailable. Select the email address or use the email link.'; }
});
document.querySelectorAll<HTMLElement>('[data-diagram]').forEach(diagram => {
  const buttons = diagram.querySelectorAll<HTMLButtonElement>('button[data-step]');
  const panels = diagram.querySelectorAll<HTMLElement>('[data-step-panel]');
  const select = (index: string) => {
    diagram.dataset.activeStep = index;
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.step === index)));
    panels.forEach(panel => { panel.hidden = panel.dataset.stepPanel !== index; });
  };
  buttons.forEach(button => button.addEventListener('click', () => select(button.dataset.step!))); select('0');
});

installCircuitEffects();
installProjectPanels();
measure(); configure();
