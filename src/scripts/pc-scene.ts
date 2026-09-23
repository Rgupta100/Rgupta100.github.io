import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { clamp, pcCameraPose, smooth } from './pc-story';
import { loadPCAsset } from './pc-asset';

export type PCLighting = 'rgb' | 'studio' | 'off';
export type PCSceneState = { progress: number; inspection: boolean; lighting: PCLighting; fanOverride: boolean | null };
export type PCScene = {
  setState(state: PCSceneState): void;
  resize(): void;
  setVisible(visible: boolean): void;
  burst(): void;
  dispose(): void;
};

export async function createPCScene(canvas: HTMLCanvasElement, onFailure: (error?: unknown) => void): Promise<PCScene> {
  const diagnostic = import.meta.env.DEV || import.meta.env.MODE === 'diagnostic';
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
  renderer.setClearColor(0x101112, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, .01, 12);
  const environmentSource = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(environmentSource, .025);
  scene.environment = environment.texture;
  scene.environmentIntensity = .46;
  environmentSource.dispose(); pmrem.dispose();
  const key = new THREE.DirectionalLight(0xfff1dc, 2.6);
  key.position.set(-1.4, 2.0, 1.1);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, {left: -1.2, right: 1.2, top: 1.4, bottom: -1.0, near: .1, far: 6});
  key.shadow.bias = -.00015; key.shadow.normalBias = .001;
  scene.add(key);
  const edge = new THREE.DirectionalLight(0xdce5ed, 2.4);
  edge.position.set(.8, .8, -.9); scene.add(edge);
  const fill = new THREE.DirectionalLight(0xf6f2eb, .95);
  fill.position.set(-.8, .15, -.3); scene.add(fill);
  scene.add(new THREE.HemisphereLight(0xe9e6df, 0x31312e, .34));
  const floorMaterial = new THREE.MeshStandardMaterial({color: '#24211e', roughness: .94, metalness: .025, envMapIntensity: .18, transparent: true, depthWrite: false});
  const floorUniforms = {
    uStudioResolution: {value: new THREE.Vector2(1, 1)},
    uProtectedSides: {value: new THREE.Vector2(0, 0)},
    uStudioVisibility: {value: 1},
    uStudioBounded: {value: 0},
  };
  // Keep the textured contact floor at the bottom of the composition, with
  // soft falloff into the reading fields instead of a visible plane perimeter.
  floorMaterial.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, floorUniforms);
    shader.vertexShader = `varying vec2 vStudioPosition;\n${shader.vertexShader}`
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvStudioPosition = position.xy;');
    shader.fragmentShader = `varying vec2 vStudioPosition;\nuniform vec2 uStudioResolution;\nuniform vec2 uProtectedSides;\nuniform float uStudioVisibility;\nuniform float uStudioBounded;\n${shader.fragmentShader}`
      .replace('#include <alphatest_fragment>', `#include <alphatest_fragment>
        vec2 studioScreen = gl_FragCoord.xy / uStudioResolution;
        float studioFalloff = pow(1.0 - smoothstep(0.08, 0.32, studioScreen.y), 2.0);
        studioFalloff *= mix(1.0, smoothstep(0.0, 0.20, studioScreen.y), uStudioBounded);
        studioFalloff *= mix(1.0, smoothstep(0.52, 0.69, studioScreen.x), uProtectedSides.x);
        studioFalloff *= mix(1.0, 1.0 - smoothstep(0.32, 0.49, studioScreen.x), uProtectedSides.y);
        studioFalloff *= 1.0 - smoothstep(1.1, 2.8, length(vStudioPosition * vec2(0.8, 1.0)));
        diffuseColor.a *= studioFalloff * uStudioVisibility;
      `);
  };
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), floorMaterial);
  floor.rotation.x = -Math.PI / 2; floor.position.y = -.001; floor.receiveShadow = true; scene.add(floor);
  floor.renderOrder = -1;
  const groundLight = new THREE.SpotLight(0xe1c09b, .5, 3, Math.PI / 3, 1, 2);
  groundLight.position.set(-.6, .9, .35); groundLight.target.position.set(-.25, 0, .1);
  scene.add(groundLight, groundLight.target);

  let state: PCSceneState = {progress: 0, inspection: false, lighting: 'rgb', fanOverride: null};
  let model: THREE.Group | undefined;
  let mixer: THREE.AnimationMixer | undefined, action: THREE.AnimationAction | undefined;
  let duration = 16, frame = 0, disposed = false, visible = true, last = 0, elapsed = 0, frames = 0;
  let fanBurstRemaining = 14, fanSpeed = 0, fanPhase = 0, poseDirty = true, width = 1, height = 1;
  let peakDrawCalls = 0, peakTriangles = 0, renderTotalMs = 0, renderPeakMs = 0;
  const rotors: {object: THREE.Object3D; axis: THREE.Vector3; base: THREE.Quaternion; speed: number}[] = [];
  const leds: {material: THREE.MeshStandardMaterial; color: THREE.Color; emissive: THREE.Color; intensity: number; cpu: boolean}[] = [];
  const rotorRotation = new THREE.Quaternion();
  const target = new THREE.Vector3();
  const inspectionBounds = new THREE.Box3(), inspectionCenter = new THREE.Vector3();
  const inspectionCorner = new THREE.Vector3();
  const shade = new THREE.Color();
  const cycleShade = new THREE.Color();
  const studio = new THREE.Color('#fff1dd'), cyan = new THREE.Color('#08b8dd'), violet = new THREE.Color('#863cde');

  function request() { if (!frame && !disposed && visible && !document.hidden) frame = requestAnimationFrame(draw); }
  function resize() {
    width = Math.max(1, canvas.clientWidth); height = Math.max(1, canvas.clientHeight);
    renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
    renderer.getDrawingBufferSize(floorUniforms.uStudioResolution.value);
    floorUniforms.uStudioBounded.value = matchMedia('(max-width: 999px)').matches ? 1 : 0;
    poseDirty = true; request();
  }
  function applyPose() {
    if (action && mixer) {
      action.enabled = true; action.paused = false;
      mixer.setTime(clamp(state.progress) * duration);
    }
    const shot = pcCameraPose(state.progress, state.inspection, width / height, matchMedia('(max-width: 999px)').matches);
    target.fromArray(shot.target);
    const tanVertical = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    let distance = shot.frameHeight / (2 * tanVertical);
    if (state.inspection && width / height < 1.15 && model) {
      // The parked pane extends behind the case: portrait inspection must fit
      // its projected width as well as the GPU, while preserving the macro view.
      const p = state.progress;
      const fitWeight = clamp(smooth((p - .08) / .12) * (1 - smooth((p - .62) / .1))
        + smooth((p - .8) / .06) * (1 - smooth((p - .965) / .035)));
      if (fitWeight > 0) {
        model.updateMatrixWorld(true); inspectionBounds.setFromObject(model);
        inspectionBounds.getCenter(inspectionCenter); target.lerp(inspectionCenter, fitWeight);
        const sy = Math.sin(shot.yaw), cy = Math.cos(shot.yaw);
        const se = Math.sin(shot.elevation), ce = Math.cos(shot.elevation);
        const tanHorizontal = tanVertical * width / height;
        let fitDistance = distance;
        for (let i = 0; i < 8; i++) {
          inspectionCorner.set(i & 1 ? inspectionBounds.max.x : inspectionBounds.min.x,
            i & 2 ? inspectionBounds.max.y : inspectionBounds.min.y,
            i & 4 ? inspectionBounds.max.z : inspectionBounds.min.z).sub(target);
          const horizontal = cy * inspectionCorner.x - sy * inspectionCorner.z;
          const depthHorizontal = sy * inspectionCorner.x + cy * inspectionCorner.z;
          const vertical = ce * inspectionCorner.y - se * depthHorizontal;
          const towardCamera = se * inspectionCorner.y + ce * depthHorizontal;
          fitDistance = Math.max(fitDistance, towardCamera + Math.abs(horizontal) * 1.1 / tanHorizontal,
            towardCamera + Math.abs(vertical) * 1.1 / tanVertical);
        }
        distance += (fitDistance - distance) * fitWeight;
      }
    }
    camera.position.set(
      target.x + Math.sin(shot.yaw) * Math.cos(shot.elevation) * distance,
      target.y + Math.sin(shot.elevation) * distance,
      target.z + Math.cos(shot.yaw) * Math.cos(shot.elevation) * distance,
    );
    camera.lookAt(target);
    camera.setViewOffset(width, height, (.5 - shot.x) * width, (.5 - shot.y) * height, width, height);
    camera.updateProjectionMatrix();
    key.intensity = 2.6 + .2 * Math.sin(state.progress * Math.PI);
    const p = state.progress;
    floorUniforms.uProtectedSides.value.set(
      smooth((p - .5) / .1) * (1 - smooth((p - .68) / .07)),
      clamp(smooth((p - .08) / .12) * (1 - smooth((p - .28) / .14)) + smooth((p - .86) / .14)),
    );
    floorUniforms.uStudioVisibility.value = 1 - smooth((p - .64) / .08) * (1 - smooth((p - .78) / .10));
    renderer.shadowMap.needsUpdate = true;
    poseDirty = false;
  }
  function applyLighting() {
    shade.copy(studio).lerp(cyan, smooth((state.progress - .1) / .18));
    shade.lerp(violet, smooth((state.progress - .32) / .18));
    shade.lerp(studio, smooth((state.progress - .58) / .34));
    // A coordinated eighteen-second color journey accompanies fan activity.
    // Spatial Story owns the assemblies; this bounded light treatment has no transforms.
    const phase = (elapsed % 18) / 18;
    if (phase < 1 / 3) cycleShade.copy(studio).lerp(cyan, smooth(phase * 3));
    else if (phase < 2 / 3) cycleShade.copy(cyan).lerp(violet, smooth((phase - 1 / 3) * 3));
    else cycleShade.copy(violet).lerp(studio, smooth((phase - 2 / 3) * 3));
    const activeColor = fanSpeed * (1 - smooth((state.progress - .87) / .13));
    shade.lerp(cycleShade, activeColor * .8);
    leds.forEach(({material, color, emissive, intensity, cpu}) => {
      if (state.lighting === 'off') {
        material.color.copy(color); material.emissiveIntensity = 0;
      } else if (state.lighting === 'studio' || cpu) {
        material.color.copy(color); material.emissive.copy(emissive); material.emissiveIntensity = intensity;
      } else {
        material.color.copy(shade).multiplyScalar(material.name === 'led_case_diffuse' ? .09 : .24);
        material.emissive.copy(shade); material.emissiveIntensity = intensity;
      }
    });
  }
  function draw(now: number) {
    frame = 0;
    if (disposed || !visible || document.hidden) { last = 0; return; }
    const dt = last ? Math.min(.05, (now - last) / 1000) : 1 / 60;
    last = now; elapsed += dt;
    if (poseDirty) applyPose();
    const requested = state.fanOverride ?? fanBurstRemaining > 0;
    fanBurstRemaining = Math.max(0, fanBurstRemaining - dt);
    fanSpeed += ((requested ? 1 : 0) - fanSpeed) * (1 - Math.exp(-dt * (requested ? 1.9 : 1.5)));
    if (fanSpeed < .001) fanSpeed = 0;
    fanPhase += dt * fanSpeed;
    applyLighting();
    for (const rotor of rotors) {
      rotorRotation.setFromAxisAngle(rotor.axis, fanPhase * rotor.speed);
      rotor.object.quaternion.copy(rotor.base).multiply(rotorRotation);
    }
    const renderStart = diagnostic ? performance.now() : 0;
    try { renderer.render(scene, camera); }
    catch (error) { onFailure(error); return; }
    frames++;
    if (diagnostic) {
      const renderMs = performance.now() - renderStart;
      renderTotalMs += renderMs; renderPeakMs = Math.max(renderPeakMs, renderMs);
      peakDrawCalls = Math.max(peakDrawCalls, renderer.info.render.calls);
      peakTriangles = Math.max(peakTriangles, renderer.info.render.triangles);
      canvas.dataset.progress = state.progress.toFixed(5);
      canvas.dataset.drawCalls = String(renderer.info.render.calls);
      canvas.dataset.triangles = String(renderer.info.render.triangles);
      canvas.dataset.peakDrawCalls = String(peakDrawCalls);
      canvas.dataset.peakTriangles = String(peakTriangles);
      // CPU wall time around renderer.render, including submission; not GPU time.
      canvas.dataset.renderDurationMs = renderMs.toFixed(3);
      canvas.dataset.renderMeanMs = (renderTotalMs / frames).toFixed(3);
      canvas.dataset.renderPeakMs = renderPeakMs.toFixed(3);
      canvas.dataset.frames = String(frames);
      canvas.dataset.fanSpeed = fanSpeed.toFixed(3);
      canvas.dataset.fanPhase = fanPhase.toFixed(4);
      canvas.dataset.rotors = String(rotors.length);
      canvas.dataset.ledMaterials = String(leds.length);
      canvas.dataset.elapsed = elapsed.toFixed(2);
      canvas.dataset.lighting = state.lighting;
      canvas.dataset.ledColors = leds.map(({material}) => `${material.name}:${material.emissive.getHexString()}:${material.emissiveIntensity.toFixed(2)}`).join(',');
      canvas.dataset.dpr = String(renderer.getPixelRatio());
    }
    canvas.dataset.rendered = 'true';
    if (frames === 1) canvas.dispatchEvent(new CustomEvent('pc-rendered'));
    if (requested || fanSpeed > 0) request();
    else last = 0;
  }
  const visibility = () => { last = 0; if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else request(); };
  const lost = (event: Event) => { event.preventDefault(); onFailure(new Error('WebGL context lost')); };
  canvas.addEventListener('webglcontextlost', lost);
  document.addEventListener('visibilitychange', visibility);

  function dispose() {
    if (disposed) return;
    disposed = true; cancelAnimationFrame(frame);
    canvas.removeEventListener('webglcontextlost', lost); document.removeEventListener('visibilitychange', visibility);
    mixer?.stopAllAction(); if (model) mixer?.uncacheRoot(model);
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
    scene.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        materials.add(material);
        for (const item of Object.values(material)) if (item instanceof THREE.Texture) textures.add(item);
      }
    });
    geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());
    textures.forEach(texture => { texture.dispose(); if (typeof ImageBitmap !== 'undefined' && texture.image instanceof ImageBitmap) texture.image.close(); });
    environment.dispose(); key.shadow.dispose(); renderer.dispose();
  }
  // A missing optional texture leaves the rough charcoal floor and live model usable.
  // A late texture completion after disposal must never revive the scene.
  void new THREE.TextureLoader().loadAsync('/images/pc-19/studio-surface.webp').then(texture => {
    if (disposed) { texture.dispose(); return; }
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(10, 10);
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    const relief = texture.clone(); relief.colorSpace = THREE.NoColorSpace;
    // The source tile already carries its warm tint (mean linear luminance .117).
    // A neutral multiplier preserves that warmth without tinting it brown twice.
    floorMaterial.color.set('#57534e'); floorMaterial.map = texture;
    floorMaterial.bumpMap = relief; floorMaterial.bumpScale = .006;
    floorMaterial.needsUpdate = true; if (model) request();
  }).catch(() => { /* The untextured material remains a safe optional-asset fallback. */ });
  try {
    const asset = await loadPCAsset();
    const gltf = await new GLTFLoader().parseAsync(asset.bytes, '/models/');
    if (diagnostic) {
      canvas.dataset.assetSource = asset.source;
      canvas.dataset.assetResponseBytes = String(asset.responseBytes);
      canvas.dataset.assetDecodedBytes = String(asset.bytes.byteLength);
      canvas.dataset.assetContentLength = String(asset.declaredBytes ?? 'unknown');
    }
    model = gltf.scene;
    if (!model.getObjectByName('pc_root')) throw new Error('PC asset is missing pc_root');
    const clip = gltf.animations.find(candidate => candidate.name === 'Story');
    if (!clip) throw new Error('PC asset is missing Story');
    duration = clip.duration;
    const seen = new Set<THREE.Material>();
    let caseFanDiffuse: THREE.MeshStandardMaterial | undefined;
    model.traverse(object => {
      if (object instanceof THREE.Camera || object instanceof THREE.Light) object.visible = false;
      if (object.name.startsWith('fan_rotor_')) {
        const axis = Array.isArray(object.userData.rotation_axis) ? object.userData.rotation_axis : [0, 1, 0];
        rotors.push({object, axis: new THREE.Vector3().fromArray(axis).normalize(), base: object.quaternion.clone(), speed: Number(object.userData.angular_speed_rad_s) || 10});
      }
      if (!(object instanceof THREE.Mesh)) return;
      let assembly: THREE.Object3D | null = object.parent;
      while (assembly && !assembly.name.startsWith('fan_rotor_')) assembly = assembly.parent;
      const caseRotor = assembly && !assembly.name.startsWith('fan_rotor_gpu_');
      if (caseRotor) {
        const diffuseFan = (material: THREE.Material) => {
          if (!(material instanceof THREE.MeshStandardMaterial) || material.name !== 'fan_polymer') return material;
          if (!caseFanDiffuse) {
            caseFanDiffuse = material.clone(); caseFanDiffuse.name = 'led_case_diffuse';
            caseFanDiffuse.color.set('#5d6870'); caseFanDiffuse.metalness = 0;
            caseFanDiffuse.roughness = .62; caseFanDiffuse.envMapIntensity = .3;
            caseFanDiffuse.emissive.set('#e6edf1'); caseFanDiffuse.emissiveIntensity = .12;
          }
          return caseFanDiffuse;
        };
        object.material = Array.isArray(object.material) ? object.material.map(diffuseFan) : diffuseFan(object.material);
      }
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      const transparentGlazing = materials.every(material => material.transparent && /glass|glazing/i.test(material.name));
      // glTF batches retain their material semantics even when mesh names change.
      // Opaque rails keep casting; clear panes cannot cast solid shadow rectangles.
      object.castShadow = !transparentGlazing; object.receiveShadow = true;
      for (const material of materials) {
        if (!(material instanceof THREE.MeshStandardMaterial) || seen.has(material)) continue;
        seen.add(material);
        switch (material.name) {
          case 'painted_black_steel':
            material.color.set('#101215'); material.metalness = .25; material.roughness = .52; material.envMapIntensity = .28; break;
          case 'anodized_graphite':
            material.color.set('#171a1d'); material.roughness = .32; material.envMapIntensity = .62; break;
          case 'rubber_and_cable':
            material.color.set('#101214'); material.roughness = .64; material.envMapIntensity = .3; break;
          case 'fan_polymer':
            material.color.set('#131719'); material.metalness = .04; material.roughness = .57; material.envMapIntensity = .28; break;
          case 'machined_edge':
            material.roughness = .3; material.envMapIntensity = .75; break;
          case 'pcb_soldermask':
            material.roughness = .56; material.envMapIntensity = .8; break;
          case 'led_case':
            material.emissive.set('#e6edf1'); material.emissiveIntensity = 1.35; break;
          case 'led_cpu':
            material.color.set('#554127'); material.emissive.set('#ffb84f'); material.emissiveIntensity = .95; break;
        }
        if (material.name.startsWith('led_')) leds.push({material, color: material.color.clone(), emissive: material.emissive.clone(), intensity: material.emissiveIntensity, cpu: /cpu|status/.test(material.name)});
      }
    });
    scene.add(model);
    mixer = new THREE.AnimationMixer(model); mixer.timeScale = 1;
    action = mixer.clipAction(clip); action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true; action.play();
    resize();
  } catch (error) { dispose(); throw error; }
  return {
    setState(next) { if (next.progress !== state.progress || next.inspection !== state.inspection || next.lighting !== state.lighting) poseDirty = true; state = {...next}; request(); },
    resize,
    setVisible(next) { visible = next; last = 0; if (!visible) { cancelAnimationFrame(frame); frame = 0; } else request(); },
    burst() { fanBurstRemaining = 9; request(); },
    dispose,
  };
}

