import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { clamp, pcCameraPose, smooth } from './pc-story';
import { loadPCAsset } from './pc-asset';
import { pcRippleEnvelope } from './pc-ripple';

export type PCLighting = 'rgb' | 'studio' | 'off';
export type PCSceneState = { progress: number; inspection: boolean; lighting: PCLighting; fanOverride: boolean | null; glassClarity: number };
export type PCScene = {
  setState(state: PCSceneState): void;
  resize(): void;
  setVisible(visible: boolean): void;
  burst(): void;
  sendPackets(): void;
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

  let state: PCSceneState = {progress: 0, inspection: false, lighting: 'rgb', fanOverride: null, glassClarity: 1};
  let model: THREE.Group | undefined;
  let mixer: THREE.AnimationMixer | undefined, action: THREE.AnimationAction | undefined;
  let duration = 16, frame = 0, disposed = false, visible = true, last = 0, elapsed = 0, frames = 0;
  let lightTimer: ReturnType<typeof setTimeout> | undefined;
  let fanSpeed = 0, fanPhase = 0, poseDirty = true, width = 1, height = 1;
  let peakDrawCalls = 0, peakTriangles = 0, renderTotalMs = 0, renderPeakMs = 0;
  const rotors: {object: THREE.Object3D; axis: THREE.Vector3; base: THREE.Quaternion; speed: number}[] = [];
  const leds: {material: THREE.MeshStandardMaterial; color: THREE.Color; emissive: THREE.Color; intensity: number; cpu: boolean}[] = [];
  const glassMaterials: THREE.MeshPhysicalMaterial[] = [];
  let glassAmount = 1;
  const packetClock = {value: -1};
  let packetStarted = -Infinity;
  let packetCount = 0;
  const rotorRotation = new THREE.Quaternion();
  const target = new THREE.Vector3();
  const inspectionBounds = new THREE.Box3(), inspectionCenter = new THREE.Vector3();
  const inspectionCorner = new THREE.Vector3();
  const shade = new THREE.Color();
  const cycleShade = new THREE.Color();
  const rippleShade = new THREE.Color();
  const ledMeshes = new Map<THREE.Material, THREE.Mesh[]>();
  const rippleDistances = new Map<THREE.Material, number>();
  const rippleBounds = new THREE.Box3(), rippleCenter = new THREE.Vector3(), rippleSample = new THREE.Vector3();
  let rippleStarted = -Infinity, rippleCount = 0, ripplePart = '';
  let press: {x: number; y: number; scroll: number} | undefined;
  const blockedTarget = (target: EventTarget | null) => target instanceof Element && !!target.closest('a,button,select,summary,input,textarea,dialog,#pc-controls');
  function pointerDown(event: PointerEvent) {
    press = event.isPrimary && event.button === 0 && !blockedTarget(event.target)
      ? {x: event.clientX, y: event.clientY, scroll: window.scrollY} : undefined;
  }
  function componentClick(event: MouseEvent) {
    const start = press; press = undefined;
    if (!start || !event.isTrusted || event.button !== 0 || !visible || document.hidden || disposed || poseDirty
      || state.lighting !== 'rgb' || blockedTarget(event.target)
      || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 7 || Math.abs(window.scrollY - start.scroll) > 4) return;
    const rect = canvas.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return;
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    camera.updateMatrixWorld(); model?.updateMatrixWorld(true);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(hoverMeshes, false)[0];
    const part = hit && meshParts.get(hit.object); if (!part) return;
    let farthest = .1;
    rippleDistances.clear();
    for (const {material} of leds) {
      const meshes = ledMeshes.get(material) ?? [];
      if (!meshes.length) continue;
      rippleCenter.set(0, 0, 0);
      for (const mesh of meshes) {
        rippleBounds.setFromObject(mesh).getCenter(rippleSample); rippleCenter.add(rippleSample);
      }
      rippleCenter.divideScalar(meshes.length);
      const distance = rippleCenter.distanceTo(hit.point);
      rippleDistances.set(material, distance); farthest = Math.max(farthest, distance);
    }
    for (const [material, distance] of rippleDistances) rippleDistances.set(material, distance / farthest);
    rippleStarted = elapsed; rippleCount++; ripplePart = part.name; request();
  }
  type HoverPart = {name: string; label: string; object: THREE.Object3D; wrapper: THREE.Group; center: THREE.Vector3; amount: number};
  const partLabel = document.createElement('span');
  partLabel.id = 'pc-part-label'; partLabel.setAttribute('aria-hidden', 'true'); partLabel.hidden = true;
  document.body.append(partLabel);
  const hoverParts: HoverPart[] = [];
  const hoverMeshes: THREE.Mesh[] = [];
  const meshParts = new Map<THREE.Object3D, HoverPart>();
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  const hoverBounds = new THREE.Box3();
  let hoveredPart: HoverPart | undefined;
  function clearHover() { hoveredPart = undefined; partLabel.hidden = true; request(); }
  function resetHoverPose() {
    hoveredPart = undefined; partLabel.hidden = true;
    for (const part of hoverParts) {
      part.amount = 0; part.wrapper.scale.setScalar(1); part.wrapper.position.set(0, 0, 0);
    }
  }
  function updateHoverCenters() {
    if (!model) return;
    model.updateMatrixWorld(true);
    for (const part of hoverParts) {
      hoverBounds.setFromObject(part.object).getCenter(part.center);
      part.wrapper.parent!.worldToLocal(part.center);
    }
  }
  const boardPoint = new THREE.Vector3();
  // Bounds come from the authored components before export batching (Blender Y/Z).
  const boardRegions: [number, number, number, number, string][] = [
    [.066,.351,.020,.020,'Processor (CPU) · Executes instructions and processes data'],
    [.066,.351,.039,.041,'CPU socket · Holds the processor and its electrical contacts'],
    [-.015,.354,.023,.077,'DIMM slots · Connections for the memory modules'],
    [-.058,.347,.009,.039,'24-pin ATX connector · Main motherboard power'],
    [.173,.362,.020,.082,'Rear I/O · External peripheral connections'],
    [.074,.429,.065,.019,'VRM heatsink · Cools the power-delivery circuitry'],
    [.137,.350,.010,.060,'VRM heatsink · Cools the power-delivery circuitry'],
    [.055,.405,.050,.009,'VRM chokes · Smooth the processor power supply'],
    [.055,.386,.050,.013,'Power MOSFETs · Switch power for the processor'],
    [.112,.338,.008,.034,'VRM chokes · Smooth the processor power supply'],
    [.051,.258,.051,.009,'PCIe x16 slot · High-bandwidth expansion connection'],
    [.081,.186,.052,.012,'M.2 heatsink · Dissipates heat from solid-state storage'],
    [.081,.242,.052,.012,'M.2 heatsink · Dissipates heat from solid-state storage'],
    [-.046,.192,.014,.021,'SATA connectors · Connections for storage drives'],
    [.063,.172,.052,.006,'PCIe expansion slot · Connects add-in cards'],
    [.063,.197,.052,.006,'PCIe expansion slot · Connects add-in cards'],
    [.063,.225,.052,.006,'PCIe expansion slot · Connects add-in cards'],
  ];
  const capacitors = [[.123,.421],[.111,.421],[.098,.421],[.123,.275],[.111,.275],[-.043,.269],[-.042,.251],[.083,.296],[.095,.296],[.107,.296],[.128,.377],[.128,.390],[.128,.403]];
  const controllers = [[.020,.229,.020,.0165],[.107,.227,.0125,.009],[-.036,.203,.0075,.0085],[.142,.195,.0085,.009],[.006,.291,.011,.009],[.084,.274,.0135,.0105],[.119,.239,.013,.0145],[-.030,.220,.0085,.0095]];
  function motherboardLabel(board: THREE.Object3D, point: THREE.Vector3) {
    boardPoint.copy(point); board.worldToLocal(boardPoint);
    const y = .061 - boardPoint.z, z = .301 + boardPoint.y;
    if (capacitors.some(([cy,cz]) => Math.hypot(y-cy,z-cz) < .0045)) return 'Capacitor · Stabilizes voltage and filters electrical noise';
    for (const [cy,cz,wy,hz,label] of boardRegions) if (Math.abs(y-cy) < wy && Math.abs(z-cz) < hz) return label;
    if (controllers.some(([cy,cz,wy,hz]) => Math.abs(y-cy) < wy && Math.abs(z-cz) < hz)) return 'Controller IC · Manages board functions and signals';
    if ([-.048,.070,.172].some(cy => [.160,.295,.442].some(cz => Math.hypot(y-cy,z-cz) < .004))) return 'Mounting screw · Secures the motherboard to its standoff';
    if (z < .202 && y > -.052 && y < .038) return 'Surface-mount resistors · Small components that regulate current';
    return 'Motherboard PCB · Copper traces connect the components';
  }
  function pointerMove(event: PointerEvent) {
    // Embedded browsers can report coarse/no-hover media despite receiving real mouse events.
    if (!['mouse', 'pen'].includes(event.pointerType) || !visible || document.hidden || disposed || poseDirty
      || (event.target instanceof Element && event.target.closest('a,button,select,summary,dialog,#pc-controls'))) { clearHover(); return; }
    const rect = canvas.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) { clearHover(); return; }
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    camera.updateMatrixWorld(); model?.updateMatrixWorld(true);
    raycaster.setFromCamera(pointer, camera);
    // Only opaque hardware participates: glass never hides the components behind it.
    const hit = raycaster.intersectObjects(hoverMeshes, false)[0];
    const next = hit ? meshParts.get(hit.object) : undefined;
    if (next !== hoveredPart) { hoveredPart = next; request(); }
    partLabel.hidden = !next;
    if (next) {
      partLabel.textContent = next.name === 'motherboard' && hit ? motherboardLabel(next.object, hit.point) : next.label;
      partLabel.style.left = `${Math.max(12, Math.min(event.clientX + 18, innerWidth - partLabel.offsetWidth - 12))}px`;
      partLabel.style.top = `${Math.max(12, Math.min(event.clientY + 18, innerHeight - partLabel.offsetHeight - 12))}px`;
    }
  }
  function animateHover(dt: number) {
    let moving = false;
    for (const part of hoverParts) {
      const goal = part === hoveredPart && !(part.name === 'motherboard' && state.progress > .65 && state.progress < .85) ? 1 : 0;
      part.amount += (goal - part.amount) * (1 - Math.exp(-dt * 12));
      if (Math.abs(goal - part.amount) < .001) part.amount = goal;
      const scale = 1 + .08 * part.amount;
      part.wrapper.scale.setScalar(scale);
      part.wrapper.position.copy(part.center).multiplyScalar(1 - scale);
      moving ||= part.amount !== goal;
    }
    return moving;
  }

  function request() {
    if (lightTimer !== undefined) { clearTimeout(lightTimer); lightTimer = undefined; }
    if (!frame && !disposed && visible && !document.hidden) frame = requestAnimationFrame(draw); }
  function resize() {
    width = Math.max(1, canvas.clientWidth); height = Math.max(1, canvas.clientHeight);
    renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
    renderer.getDrawingBufferSize(floorUniforms.uStudioResolution.value);
    floorUniforms.uStudioBounded.value = matchMedia('(max-width: 999px)').matches ? 1 : 0;
    resetHoverPose(); poseDirty = true; request();
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
    updateHoverCenters();
    poseDirty = false;
  }
  function applyLighting() {
    // A full-spectrum clock runs independently of scroll and fan controls.
    const lightColor = (offset: number) => cycleShade.setHSL((elapsed / 18 + offset) % 1, 1, .5);
    leds.forEach(({material, color, emissive, intensity, cpu}, index) => {
      if (state.lighting === 'off') {
        material.color.copy(color); material.emissiveIntensity = 0;
      } else if (state.lighting === 'studio' || cpu) {
        material.color.copy(color); material.emissive.copy(emissive); material.emissiveIntensity = intensity;
      } else {
        const offset = material.name === 'led_top_rail' ? 1 / 3 : material.name === 'led_gpu_edge' ? 2 / 3 : index * .09;
        shade.copy(lightColor(offset));
        material.color.copy(shade).multiplyScalar(.24);
        material.emissive.copy(shade); material.emissiveIntensity = intensity * 1.4;
      }
      if (state.lighting === 'rgb') {
        const pulse = pcRippleEnvelope(elapsed - rippleStarted, rippleDistances.get(material) ?? 1);
        if (pulse > 0) {
          rippleShade.setHSL((elapsed / 18 + .16) % 1, 1, .5);
          material.emissive.lerp(rippleShade, pulse * .65);
          material.emissiveIntensity *= 1 + .8 * pulse;
        }
      }
    });
  }
  function draw(now: number) {
    frame = 0;
    if (disposed || !visible || document.hidden) { last = 0; return; }
    const clockDelta = last ? Math.min(.15, (now - last) / 1000) : 1 / 60;
    const dt = Math.min(.05, clockDelta);
    last = now; elapsed += clockDelta;
    if (poseDirty) applyPose();
    const requested = state.fanOverride ?? true;
    fanSpeed += ((requested ? 1 : 0) - fanSpeed) * (1 - Math.exp(-dt * (requested ? 1.9 : 1.5)));
    if (fanSpeed < .001) fanSpeed = 0;
    fanPhase += dt * fanSpeed;
    applyLighting();
    const packetAge = elapsed - packetStarted;
    packetClock.value = state.lighting !== 'off' && packetAge < 3.6 ? packetAge : -1;
    canvas.dataset.packetBursts = String(packetCount);
    canvas.dataset.packetsActive = String(packetClock.value >= 0);
    for (const rotor of rotors) {
      rotorRotation.setFromAxisAngle(rotor.axis, fanPhase * rotor.speed);
      rotor.object.quaternion.copy(rotor.base).multiply(rotorRotation);
    }
    const hoverMoving = animateHover(dt);
    const glassGoal = clamp(state.glassClarity);
    glassAmount += (glassGoal - glassAmount) * (1 - Math.exp(-dt * 12));
    if (Math.abs(glassGoal - glassAmount) < .001) glassAmount = glassGoal;
    const glassMoving = glassAmount !== glassGoal;
    for (const material of glassMaterials) {
      material.roughness = .04 + (1 - glassAmount) * .76;
      material.transmission = .98;
      material.opacity = 1 - .94 * glassAmount ** 3;
    }
    if (hoverMoving) renderer.shadowMap.needsUpdate = true;
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
      canvas.dataset.glassClarity = state.glassClarity.toFixed(2);
      canvas.dataset.glassOpacity = glassMaterials.map(material => `${material.name}:${material.roughness.toFixed(4)}`).join(',');
      canvas.dataset.rippleProgress = Number.isFinite(rippleStarted) ? clamp((elapsed - rippleStarted) / 2).toFixed(3) : '0';
      canvas.dataset.rippleCount = String(rippleCount);
      canvas.dataset.ripplePart = ripplePart;
      canvas.dataset.hoveredPart = hoveredPart?.name ?? '';
      canvas.dataset.hoverAmount = Math.max(0, ...hoverParts.map(part => part.amount)).toFixed(3);
      canvas.dataset.dpr = String(renderer.getPixelRatio());
    }
    canvas.dataset.rendered = 'true';
    if (frames === 1) canvas.dispatchEvent(new CustomEvent('pc-rendered'));
    if (requested || fanSpeed > 0 || hoverMoving || glassMoving || packetClock.value >= 0 || (state.lighting === 'rgb' && elapsed - rippleStarted < 2)) request();
    else if (state.lighting === 'rgb') {
      // Color alone needs twelve samples/second, not a continuously busy RAF.
      lightTimer = setTimeout(() => { lightTimer = undefined; request(); }, 1000 / 12);
    } else last = 0;
  }
  const visibility = () => { press = undefined; rippleStarted = -Infinity; resetHoverPose(); last = 0; if (document.hidden) { cancelAnimationFrame(frame); frame = 0; clearTimeout(lightTimer); lightTimer = undefined; } else request(); };
  const lost = (event: Event) => { event.preventDefault(); onFailure(new Error('WebGL context lost')); };
  canvas.addEventListener('webglcontextlost', lost);
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('pointermove', pointerMove, {passive: true});
  window.addEventListener('pointerdown', pointerDown, {passive: true});
  window.addEventListener('click', componentClick);
  document.documentElement.addEventListener('pointerleave', clearHover);
  window.addEventListener('blur', clearHover);
  window.addEventListener('scroll', clearHover, {passive: true});

  function dispose() {
    if (disposed) return;
    partLabel.remove();
    disposed = true; cancelAnimationFrame(frame); clearTimeout(lightTimer); lightTimer = undefined;
    canvas.removeEventListener('webglcontextlost', lost); document.removeEventListener('visibilitychange', visibility);
    window.removeEventListener('pointermove', pointerMove);
    window.removeEventListener('pointerdown', pointerDown);
    window.removeEventListener('click', componentClick);
    document.documentElement.removeEventListener('pointerleave', clearHover);
    window.removeEventListener('blur', clearHover);
    window.removeEventListener('scroll', clearHover);
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
    model.traverse(object => {
      if (object instanceof THREE.Camera || object instanceof THREE.Light) object.visible = false;
      if (object.name.startsWith('fan_rotor_')) {
        const axis = Array.isArray(object.userData.rotation_axis) ? object.userData.rotation_axis : [0, 1, 0];
        rotors.push({object, axis: new THREE.Vector3().fromArray(axis).normalize(), base: object.quaternion.clone(), speed: Number(object.userData.angular_speed_rad_s) || 10});
      }
      if (!(object instanceof THREE.Mesh)) return;
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
          case 'led_top_rail':
          case 'led_gpu_edge':
            material.emissiveIntensity = 1.6; break;
          case 'led_cpu':
            material.color.set('#554127'); material.emissive.set('#ffb84f'); material.emissiveIntensity = .95; break;
        }
        if (material.name.startsWith('led_')) leds.push({material, color: material.color.clone(), emissive: material.emissive.clone(), intensity: material.emissiveIntensity, cpu: /cpu|status/.test(material.name)});
      }
    });
    // Transmission with roughness gives the slider actual frosted refraction.
    const glazing = new Map<THREE.Material, THREE.MeshPhysicalMaterial>();
    model.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      const convert = (source: THREE.Material) => {
        if (source.name !== 'smoked_glass') return source;
        if (!glazing.has(source)) {
          const material = new THREE.MeshPhysicalMaterial({color: '#e2e6e5', roughness: .04,
            metalness: 0, transmission: .98, thickness: .012, ior: 1.45,
            transparent: true, opacity: 1, depthWrite: false, side: THREE.DoubleSide});
          material.name = source.name; glazing.set(source, material); glassMaterials.push(material);
        }
        return glazing.get(source)!;
      };
      object.material = Array.isArray(object.material) ? object.material.map(convert) : convert(object.material);
    });
    // Follow the four authored 45-degree bus corridors in the PCB texture.
    // Clone only the board material, so GPU/memory soldermask stays untouched.
    const board = model.getObjectByName('mainboard_pcb');
    if (board instanceof THREE.Mesh && board.material instanceof THREE.MeshStandardMaterial) {
      const material = board.material.clone();
      board.material = material;
      material.onBeforeCompile = shader => {
        shader.uniforms.uPacketAge = packetClock;
        shader.fragmentShader = 'uniform float uPacketAge;\n' + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `
          #include <emissivemap_fragment>
          #ifdef USE_MAP
          if (uPacketAge >= 0.0) {
            vec2 pixel = vec2(vMapUv.x, 1.0 - vMapUv.y) * 2048.0;
            float energy = 0.0;
            for (int bank = 0; bank < 4; bank++) {
              for (int lane = 0; lane < 3; lane++) {
                float x0 = 160.0 + float(bank) * 440.0 + float(lane * 7) * 7.0;
                float y0 = 190.0 + float(bank) * 330.0;
                float travel = (uPacketAge - float(bank) * 0.16 - float(lane) * 0.12) / 2.6;
                float x = pixel.x - x0;
                float route = y0 + min(x, 100.0);
                float line = 1.0 - smoothstep(1.5, 4.0, abs(pixel.y - route));
                float head = 1.0 - smoothstep(3.0, 24.0, abs(x - travel * 370.0));
                float gate = step(0.0, travel) * step(travel, 1.0) * step(0.0, x) * step(x, 370.0);
                energy += line * head * gate;
              }
            }
            totalEmissiveRadiance += vec3(1.0, 0.58, 0.18) * energy * 4.0;
          }
          #endif
        `);
      };
      material.customProgramCacheKey = () => 'motherboard-data-packets-v1';
    }
    // Identity wrappers leave authored node transforms and Story bindings intact.
    // GPU layers are separate targets in the exploded pose; no target wraps another.
    const semanticParts = /^(cpu_block|radiator|motherboard|ram_group|psu|gpu_(backplate|heatsink|pcb|shroud)_group|fan_housing_(front_\d|top_\d|rear))$/;
    const assemblies: THREE.Object3D[] = [];
    model.traverse(object => { if (semanticParts.test(object.name)) assemblies.push(object); });
    for (const object of assemblies) {
      const parent = object.parent!;
      const wrapper = new THREE.Group(); wrapper.name = `hover_${object.name}`;
      parent.add(wrapper); wrapper.add(object);
      const labels: Record<string, string> = {
        cpu_block: 'CPU cooling block', radiator: 'Cooling radiator', motherboard: 'Motherboard',
        ram_group: 'Memory modules', psu: 'Power supply', gpu_backplate_group: 'GPU backplate',
        gpu_heatsink_group: 'GPU heatsink', gpu_pcb_group: 'GPU circuit board', gpu_shroud_group: 'GPU fans & shroud',
      };
      const label = labels[object.name] ?? (object.name.includes('front') ? 'Front cooling fan' : object.name.includes('top') ? 'Top cooling fan' : 'Rear cooling fan');
      const part: HoverPart = {name: object.name, label, object, wrapper, center: new THREE.Vector3(), amount: 0};
      hoverParts.push(part);
      object.traverse(child => {
        if (!(child instanceof THREE.Mesh)) return;
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        if (materials.every(material => material.transparent && /glass|glazing/i.test(material.name))) return;
        meshParts.set(child, part);
      });
    }
    model.traverse(child => {
      if (!(child instanceof THREE.Mesh)) return;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) if (material.name.startsWith('led_')) {
        const meshes = ledMeshes.get(material) ?? []; meshes.push(child); ledMeshes.set(material, meshes);
      }
      // Solid casework still occludes hidden hardware; only glass is transparent to picking.
      if (!materials.every(material => material.transparent && /glass|glazing/i.test(material.name))) hoverMeshes.push(child);
    });
    scene.add(model);
    mixer = new THREE.AnimationMixer(model); mixer.timeScale = 1;
    action = mixer.clipAction(clip); action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true; action.play();
    resize();
  } catch (error) { dispose(); throw error; }
  return {
    setState(next) { if (next.lighting !== 'rgb') rippleStarted = -Infinity; if (next.progress !== state.progress || next.inspection !== state.inspection || next.lighting !== state.lighting) { resetHoverPose(); poseDirty = true; } state = {...next}; request(); },
    resize,
    setVisible(next) { if (!next) { press = undefined; rippleStarted = -Infinity; resetHoverPose(); } visible = next; last = 0; if (!visible) { cancelAnimationFrame(frame); frame = 0; clearTimeout(lightTimer); lightTimer = undefined; } else request(); },
    burst() { request(); },
    sendPackets() {
      if (!visible || document.hidden || disposed || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      packetStarted = elapsed; packetCount++; request();
    },
    dispose,
  };
}

