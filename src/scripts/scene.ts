import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { clamp } from './story';
import { cameraPose } from './camera-path';
import { batchHardware } from './batch-hardware';

export type Sculpture = { seek:(chapter:number,layout?:number)=>void; point:(x:number,y:number)=>void; orbit:(x:number,y:number)=>void; pulse:()=>void; focus:(active:boolean)=>void; resize:()=>void; dispose:()=>void };

export async function createSculpture(canvas:HTMLCanvasElement,onFailure:()=>void):Promise<Sculpture>{
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});
  renderer.setClearColor(0x101112,0);renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
  renderer.shadowMap.enabled=false;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(34,1,.1,80);
  const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment(),env=pmrem.fromScene(room,.035);
  scene.environment=env.texture;scene.environmentIntensity=.55;room.dispose();pmrem.dispose();
  const key=new THREE.DirectionalLight(0xfff2df,2.8);key.position.set(-4,7,6);key.castShadow=false;
  scene.add(key);
  const edge=new THREE.DirectionalLight(0xdceaff,2.6);edge.position.set(4,2,-4);scene.add(edge);
  const sweep=new THREE.PointLight(0xffc98c,8,16,2);scene.add(sweep);
  scene.add(new THREE.HemisphereLight(0xf3eee4,0x17191e,.15));
  const pivot=new THREE.Group();scene.add(pivot);
  let model:THREE.Group|undefined,mixer:THREE.AnimationMixer|undefined,duration=8;
  let frame=0,dead=false,target=0,current=0,layout=0,currentLayout=0,pointerX=0,pointerY=0,yaw=0,pitch=0,viewYaw=0,viewPitch=0;
  let pulseStart=-Infinity,last=0,born=performance.now(),w=1,h=1;
  const families:THREE.Object3D[]=[];
  const authoredPositions=new Map<THREE.Object3D,THREE.Vector3>();
  const familyPosition=new THREE.Vector3();
  let focusTarget=0,focusLevel=0;
  const emissive:{material:THREE.MeshStandardMaterial;intensity:number}[]=[];
  function resize(){w=Math.max(1,canvas.clientWidth);h=Math.max(1,canvas.clientHeight);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);request();}
  function request(){if(!frame&&!dead&&!document.hidden)frame=requestAnimationFrame(draw);}
  function draw(now:number){
    frame=0;if(dead||document.hidden)return;
    const narrow=innerWidth<1000;
    if(narrow){const b=canvas.getBoundingClientRect();if(b.bottom<0||b.top>innerHeight)return;}
    const dt=Math.min(.05,(now-(last||now-16))/1000);last=now;
    const blend=1-Math.exp(-dt*3.5);
    focusLevel+=(focusTarget-focusLevel)*blend;
    current+=(target-current)*blend;currentLayout+=(layout-currentLayout)*blend;
    viewYaw+=(yaw+pointerX*.12-viewYaw)*blend;viewPitch+=(pitch+pointerY*.08-viewPitch)*blend;
    const intro=clamp((now-born)/4200),reveal=1-Math.pow(1-intro,3),shot=cameraPose(current);
    const introAmount=current<.05?1-reveal:0;
    const scatterWeight=Math.max(0,1-Math.abs(current-2));
    const fit=narrow?THREE.MathUtils.lerp(Math.max(1,1.12/camera.aspect),1.35,focusLevel):1;
    const az=shot.yaw+viewYaw-introAmount*.32,el=clamp(shot.pitch+viewPitch,-.2,1.05),distance=shot.distance*(1+scatterWeight*(fit-1))+introAmount*.8;
    camera.position.set(Math.sin(az)*Math.cos(el)*distance,Math.sin(el)*distance,Math.cos(az)*Math.cos(el)*distance);
    camera.lookAt(0,-.12,0);
    const shift=clamp(currentLayout);
    const screenX=0;
    camera.setViewOffset(w,h,-screenX*w,0,w,h);
    pivot.scale.setScalar(narrow?1:THREE.MathUtils.lerp(THREE.MathUtils.lerp(1,.60-scatterWeight*.05,shift),1,focusLevel));
    for(const family of families)family.position.copy(authoredPositions.get(family)!);
    if(mixer)mixer.setTime(Math.min(duration-.00001,current/4*duration));
    for(const family of families)authoredPositions.get(family)!.copy(family.position);
    // Recompose family positions for portrait inspection; never stretch the geometry.
    if(narrow&&focusLevel>.001&&scatterWeight>0){
      pivot.updateMatrixWorld(true);
      const portrait=scatterWeight*focusLevel;
      for(const family of families){
        family.getWorldPosition(familyPosition);
        familyPosition.x*=1-portrait*.68;
        familyPosition.y*=1+portrait*.16;
        family.parent!.worldToLocal(familyPosition);
        family.position.copy(familyPosition);
      }
    }
    const expanded=Math.sin(clamp(current/4)*Math.PI);
    sweep.position.set(Math.cos(current*1.8+1)*4,1.7,Math.sin(current*1.8+1)*4);
    key.intensity=2.5+expanded*.6;edge.intensity=2.4+expanded*.8;
    const age=(now-pulseStart)/1000,signal=age>=0&&age<1.25?Math.sin(age/1.25*Math.PI)*2.8:0;
    emissive.forEach(({material,intensity})=>{material.emissiveIntensity=intensity+signal+expanded*.5;});
    renderer.render(scene,camera);
    canvas.dataset.drawCalls=String(renderer.info.render.calls);
    canvas.dataset.pose=current.toFixed(3);
    canvas.dataset.triangles=String(renderer.info.render.triangles);
    if(intro<1||signal>0||Math.abs(focusTarget-focusLevel)>.001||Math.abs(target-current)>.0001||Math.abs(layout-currentLayout)>.0001||Math.abs(yaw+pointerX*.12-viewYaw)>.0001||Math.abs(pitch+pointerY*.08-viewPitch)>.0001)request();
  }
  const lost=(event:Event)=>{event.preventDefault();onFailure();};canvas.addEventListener('webglcontextlost',lost);
  try{
    const gltf=await new GLTFLoader().loadAsync('/models/portfolio.glb?v=orbital-v2');model=gltf.scene;
    batchHardware(model,new Set(gltf.animations.flatMap(clip=>clip.tracks.map(track=>track.name.split('.')[0]))));
    const seen=new Set<THREE.Material>();
    model.traverse(object=>{
      if(object.name.startsWith('assembly_')){families.push(object);authoredPositions.set(object,object.position.clone());}
      if(object instanceof THREE.Mesh){
        object.frustumCulled=true;object.receiveShadow=false;
        object.castShadow=false;
        (Array.isArray(object.material)?object.material:[object.material]).forEach(material=>{
          if(material instanceof THREE.MeshStandardMaterial&&material.emissive.getHex()!==0&&!seen.has(material)){seen.add(material);emissive.push({material,intensity:material.emissiveIntensity});}
        });
      }
      if(object instanceof THREE.Camera||object instanceof THREE.Light)object.visible=false;
    });pivot.add(model);
    const clip=gltf.animations.find(a=>a.name==='Story');
    if(!clip)throw new Error('Missing Blender Story animation');
    duration=clip.duration;mixer=new THREE.AnimationMixer(model);const action=mixer.clipAction(clip);action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();
    born=performance.now();resize();
  }catch(error){renderer.dispose();env.dispose();throw error;}
  return{
    seek(value,placement=value){target=clamp(value,0,4);layout=placement;request();},
    point(x,y){pointerX=x;pointerY=y;request();},
    orbit(x,y){yaw+=x;pitch=clamp(pitch+y,-.4,.5);request();},
    pulse(){pulseStart=performance.now();request();},
    focus(active){focusTarget=Number(active);request();},resize,
    dispose(){dead=true;cancelAnimationFrame(frame);canvas.removeEventListener('webglcontextlost',lost);mixer?.stopAllAction();
      const textures=new Set<THREE.Texture>();model?.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{Object.values(m).forEach(v=>{if(v instanceof THREE.Texture)textures.add(v);});m.dispose();});}});
      textures.forEach(t=>t.dispose());env.dispose();renderer.dispose();
    },
  };
}


