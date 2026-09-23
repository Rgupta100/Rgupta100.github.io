import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { activeChapter, chapters, storyProgress } from './story';
import type { Sculpture } from './scene';

gsap.registerPlugin(ScrollTrigger);
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const desktop=matchMedia('(min-width: 1000px)');
const fine=matchMedia('(hover: hover) and (pointer: fine)');
const stage=document.querySelector<HTMLElement>('#scene-stage');
const canvas=document.querySelector<HTMLCanvasElement>('#scene-canvas');
const sections=chapters.map(id=>document.getElementById(id)!);
const toggle=document.querySelector<HTMLButtonElement>('#motion-toggle');
const explode=document.querySelector<HTMLButtonElement>('#model-explode');
const play=document.querySelector<HTMLButtonElement>('#model-play');
const modelControls=document.querySelector<HTMLElement>('#model-controls');
const drag=document.querySelector<HTMLElement>('#model-drag');
const thermal=document.querySelector<HTMLButtonElement>('#model-thermal');
const returnModel=document.querySelector<HTMLButtonElement>('#model-return');
let thermalOn=false;
let playing=false;
let manualPose:{value:number}|undefined;
let exploded=false;
let assemblyTween:gsap.core.Tween|undefined;
let userOff=false;
try{userOff=localStorage.getItem('portfolio-motion')==='off';}catch{}
let sculpture:Sculpture|undefined, loading=false, sceneFailed=false, generation=0, progress=0, chapter=-1;
let tops:number[]=[], scrollFrame=0;
let contactPulsed=false;
function showModelControls(show:boolean){if(modelControls)modelControls.hidden=!show||(desktop.matches&&scrollY>80);if(drag)drag.hidden=!show;}
function stopPlayback(){assemblyTween?.kill();playing=false;if(play)play.textContent='Play sequence';}
function focusModel(active:boolean){
  document.documentElement.classList.toggle('model-focused',active);
  document.querySelectorAll<HTMLElement>('.hero-copy,.hero-footer').forEach(el=>{el.inert=active;});
  requestAnimationFrame(()=>sculpture?.resize());
  if(returnModel)returnModel.hidden=!active;
  sculpture?.focus(active);
  if(!active){thermalOn=false;thermal?.setAttribute('aria-pressed','false');sculpture?.thermal(null);}
}
function returnToReading(){
  stopPlayback();manualPose=undefined;exploded=false;
  if(explode)explode.textContent='Scatter parts';
  focusModel(false);update();
}
returnModel?.addEventListener('click',returnToReading);
thermal?.addEventListener('click',()=>{
  thermalOn=thermal.getAttribute('aria-pressed')!=='true';thermal.setAttribute('aria-pressed',String(thermalOn));
  sculpture?.thermal(thermalOn);
});
document.querySelector('#model-scan')?.addEventListener('click',()=>sculpture?.pulse());
const enabled=()=>!reduced.matches&&!userOff;
function syncMotionLabel(){
  document.documentElement.dataset.motion=enabled()?'on':'off';
  if(toggle){toggle.disabled=reduced.matches;toggle.setAttribute('aria-pressed',String(!enabled()));toggle.textContent=reduced.matches?'Reduced motion':enabled()?'Motion on':'Motion off';toggle.setAttribute('aria-label',reduced.matches?'Motion disabled by system preference':enabled()?'Turn motion off':'Turn motion on');}
}
function update(){
  scrollFrame=0;
  progress=storyProgress(scrollY,tops,innerHeight);
  document.documentElement.classList.toggle('hero-departing',scrollY>80);
  if(modelControls&&sculpture)modelControls.hidden=desktop.matches&&scrollY>80;
  const active=activeChapter(scrollY,tops,innerHeight);
  document.documentElement.style.setProperty('--story-progress',String(progress/4));
  stage?.style.setProperty('--scene-shift',String(Math.min(1,progress)));
  if(active!==chapter){
    chapter=active; document.documentElement.dataset.chapter=chapters[active];
    document.querySelectorAll<HTMLAnchorElement>('[data-nav-chapter]').forEach(a=>{
      const selected=a.hash===`#${chapters[active]}`;
      if(selected)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');
    });
    const poster=stage?.querySelector('img');
    if(poster)poster.src=`/images/${desktop.matches?chapters[active]:'overview'}-desktop.webp`;
    const source=stage?.querySelector('source');
    if(source)source.srcset='/images/overview-mobile.webp';
  }
  sculpture?.seek(manualPose?.value??progress,progress);
  if(sculpture&&enabled()&&progress>=3.99&&!contactPulsed){contactPulsed=true;sculpture.pulse();}
}
function schedule(){if(!scrollFrame)scrollFrame=requestAnimationFrame(update);}
function measure(){tops=sections.map(s=>s.getBoundingClientRect().top+scrollY); update();sculpture?.resize();}
async function configure(){
  chapter=-1;update();
  syncMotionLabel();
  if(!enabled()||(!desktop.matches&&!fine.matches)){generation++; focusModel(false);sculpture?.dispose();sculpture=undefined;stage?.classList.remove('is-ready');showModelControls(false);if(explode)explode.textContent='Scatter parts';stopPlayback();manualPose=undefined;exploded=false;loading=false;update();return;}
  if(sculpture||loading||sceneFailed||!canvas)return;
  const token=++generation;loading=true;
  try{
    const {createSculpture}=await import('./scene');
    if(token!==generation)return;
    const instance=await createSculpture(canvas,()=>{sceneFailed=true;stage?.classList.remove('is-ready');showModelControls(false);stopPlayback();focusModel(false);sculpture?.dispose();sculpture=undefined;});
    if(token!==generation){instance.dispose();return;}
    sculpture=instance; update();
    showModelControls(true);
    requestAnimationFrame(()=>stage?.classList.add('is-ready'));
  }catch(error){sceneFailed=true;stage?.classList.remove('is-ready');console.warn('Interactive sculpture unavailable; rendered chapter images remain available.',error);}
  finally{if(token===generation)loading=false;}
}
toggle?.addEventListener('click',()=>{
  // An operating-system reduced-motion preference always takes precedence.
  if(reduced.matches){toggle.textContent='Reduced motion';return;}
  userOff=!userOff;try{localStorage.setItem('portfolio-motion',userOff?'off':'on');}catch{}
  if(userOff)media.revert();
  configure();
});
explode?.addEventListener('click',()=>{
  if(!sculpture||!enabled())return;
  stopPlayback();manualPose??={value:progress};exploded=!exploded;
  explode.textContent=exploded?'Reassemble':'Scatter parts';
  if(exploded)focusModel(true);
  assemblyTween=gsap.to(manualPose,{value:exploded?2:0,duration:4.8,ease:'power1.inOut',onUpdate:update,onComplete:()=>{if(!exploded)focusModel(false);}});
});
play?.addEventListener('click',()=>{
  if(!sculpture||!enabled())return;
  if(playing){stopPlayback();play.textContent='Replay sequence';return;}
  stopPlayback();playing=true;play.textContent='Stop sequence';exploded=false;if(explode)explode.textContent='Scatter parts';
  manualPose={value:0};thermalOn=false;thermal?.setAttribute('aria-pressed','false');focusModel(true);sculpture.thermal(null);update();
  assemblyTween=gsap.to(manualPose,{value:4,duration:18,ease:'none',onUpdate:update,onComplete:()=>{playing=false;play.textContent='Replay sequence';focusModel(false);}});
});
let dragPoint:{x:number;y:number;id:number}|undefined;
drag?.addEventListener('pointerdown',event=>{if(!sculpture||event.pointerType==='touch')return;dragPoint={x:event.clientX,y:event.clientY,id:event.pointerId};drag.setPointerCapture(event.pointerId);drag.classList.add('is-dragging');});
drag?.addEventListener('pointermove',event=>{if(!dragPoint)return;sculpture?.orbit((dragPoint.x-event.clientX)*.009,(event.clientY-dragPoint.y)*.006);dragPoint.x=event.clientX;dragPoint.y=event.clientY;});
const endDrag=()=>{dragPoint=undefined;drag?.classList.remove('is-dragging');};
drag?.addEventListener('pointerup',endDrag);drag?.addEventListener('pointercancel',endDrag);drag?.addEventListener('lostpointercapture',endDrag);
drag?.addEventListener('keydown',event=>{const deltas:Record<string,[number,number]>={ArrowLeft:[-.2,0],ArrowRight:[.2,0],ArrowUp:[0,.1],ArrowDown:[0,-.1]};if(deltas[event.key]){event.preventDefault();sculpture?.orbit(...deltas[event.key]);}});
reduced.addEventListener('change',configure);desktop.addEventListener('change',configure);fine.addEventListener('change',configure);
addEventListener('scroll',()=>{if(manualPose){returnToReading();}schedule();},{passive:true});addEventListener('resize',measure);
addEventListener('hashchange',()=>requestAnimationFrame(measure));addEventListener('pageshow',measure);
document.addEventListener('visibilitychange',()=>{if(document.hidden)assemblyTween?.pause();else{assemblyTween?.resume();measure();}});
document.fonts.ready.then(()=>{measure();ScrollTrigger.refresh();});
measure(); configure();

const menu=document.querySelector<HTMLButtonElement>('#menu-toggle');
const nav=document.querySelector<HTMLElement>('#main-nav');
function closeMenu(){menu?.setAttribute('aria-expanded','false');nav?.classList.remove('is-open');}
menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));nav?.classList.toggle('is-open',open);});
nav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(document.documentElement.classList.contains('model-focused')){returnToReading();explode?.focus({preventScroll:true});}else if(menu?.getAttribute('aria-expanded')==='true'){closeMenu();menu.focus();}}});

document.querySelector<HTMLButtonElement>('#copy-email')?.addEventListener('click',async()=>{
  const status=document.querySelector<HTMLElement>('#copy-status');
  try{await navigator.clipboard.writeText('r237gupt@uwaterloo.ca');if(status)status.textContent='Email address copied.';}
  catch{if(status)status.textContent='Copy unavailable. Select the email address or use the email link.';}
});
document.querySelectorAll<HTMLElement>('[data-diagram]').forEach(diagram=>{
  const buttons=diagram.querySelectorAll<HTMLButtonElement>('button[data-step]');
  const panels=diagram.querySelectorAll<HTMLElement>('[data-step-panel]');
  diagram.classList.add('is-enhanced');
  const select=(index:string)=>{diagram.dataset.activeStep=index;buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.step===index)));panels.forEach(p=>{p.hidden=p.dataset.stepPanel!==index;});};
  buttons.forEach(b=>b.addEventListener('click',()=>select(b.dataset.step!)));select('0');
});
const media=gsap.matchMedia();
media.add('(prefers-reduced-motion: no-preference)',()=>{
  if(userOff)return;
  document.querySelectorAll<HTMLElement>('[data-reveal]').forEach(el=>{
    gsap.fromTo(el,{y:16,clipPath:'inset(0 0 12% 0)'},{y:0,clipPath:'inset(0 0 0% 0)',duration:.8,ease:'expo.out',scrollTrigger:{trigger:el,start:'top 92%',once:true}});
  });
});

// One lightweight 2D trace; no pointer capture and no continuously running loop.
const trace=document.createElement('canvas');trace.id='cursor-trace';trace.setAttribute('aria-hidden','true');document.body.append(trace);
const ctx=trace.getContext('2d');
type Dot={x:number;y:number;t:number};type Ring=Dot;
let points:Dot[]=[],rings:Ring[]=[],traceFrame=0,lastPoint=0;
function sizeTrace(){trace.width=innerWidth;trace.height=innerHeight;}sizeTrace();addEventListener('resize',sizeTrace);
function traceDraw(now:number){
  traceFrame=0;if(!ctx)return;ctx.clearRect(0,0,trace.width,trace.height);
  if(!enabled()||!fine.matches||document.hidden){points=[];rings=[];return;}
  points=points.filter(p=>now-p.t<850);rings=rings.filter(p=>now-p.t<800);
  ctx.lineWidth=1;
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i];ctx.strokeStyle=`rgba(214,165,105,${.22*(1-(now-b.t)/850)})`;
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  }
  rings.forEach(r=>{const age=(now-r.t)/800;ctx.strokeStyle=`rgba(214,165,105,${.45*(1-age)})`;ctx.beginPath();ctx.arc(r.x,r.y,3+age*23,0,Math.PI*2);ctx.stroke();ctx.fillStyle=ctx.strokeStyle;ctx.fillRect(r.x-2,r.y-2,4,4);});
  if(points.length||rings.length)traceFrame=requestAnimationFrame(traceDraw);
}
function startTrace(){if(!traceFrame)traceFrame=requestAnimationFrame(traceDraw);}
document.addEventListener('pointermove',e=>{
  if(!enabled()||!fine.matches)return;
  const target=e.target instanceof Element?e.target:null;
  if(target?.closest('a,button,p,h1,h2,h3,li,dd,dt'))return;
  const now=performance.now();if(now-lastPoint>24){points.push({x:e.clientX,y:e.clientY,t:now});lastPoint=now;startTrace();}
  if(chapter===0&&e.clientX>innerWidth*.48)sculpture?.point((e.clientX/innerWidth-.5)*2,(.5-e.clientY/innerHeight)*2);
},{passive:true});
document.addEventListener('pointerdown',e=>{
  if(!enabled()||!fine.matches||(e.target instanceof Element&&e.target.closest('a,button,input,summary')))return;
  rings.push({x:e.clientX,y:e.clientY,t:performance.now()});startTrace();
  if(chapter===0&&e.clientX>innerWidth*.48)sculpture?.pulse();
},{passive:true});



