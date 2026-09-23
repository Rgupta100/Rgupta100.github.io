import * as THREE from 'three';

/** Illustrative false-color material study, not a measured temperature simulation. */
export function createSurfaceEffects() {
  const uniforms={uThermal:{value:0},uInspect:{value:0},uScan:{value:-8},uScanStrength:{value:0}};
  const installed=new Set<THREE.Material>();
  function install(material:THREE.Material){
    if(!(material instanceof THREE.MeshStandardMaterial)||installed.has(material))return;
    installed.add(material);
    material.onBeforeCompile=shader=>{
      Object.assign(shader.uniforms,uniforms);
      shader.vertexShader='varying vec3 vEffectPosition;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
        vec4 effectPosition=vec4(transformed,1.0);
        #ifdef USE_INSTANCING
          effectPosition=instanceMatrix*effectPosition;
        #endif
        vEffectPosition=(modelMatrix*effectPosition).xyz;`);
      shader.fragmentShader=`varying vec3 vEffectPosition;
        uniform float uThermal; uniform float uInspect; uniform float uScan; uniform float uScanStrength;
        vec3 heatPalette(float t){
          vec3 c=mix(vec3(.025,.012,.16),vec3(.008,.045,.62),smoothstep(.0,.28,t));
          c=mix(c,vec3(.55,.003,.035),smoothstep(.25,.55,t));
          c=mix(c,vec3(1.,.32,.025),smoothstep(.5,.78,t));
          return mix(c,vec3(1.,.94,.45),smoothstep(.76,1.,t));
        }
        `+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
        float heat=clamp(.48-vEffectPosition.y*.18+.13*sin(vEffectPosition.x*1.7+vEffectPosition.z*1.2),0.,1.);
        float rim=pow(1.-abs(dot(normal,normalize(vViewPosition))),2.);
        vec3 thermal=heatPalette(heat)*(.55+.45*max(0.,normal.y)) + rim*vec3(.025,.04,.07);
        float contour=1.-smoothstep(.025,.065,abs(fract(heat*12.)-.5));
        thermal*=1.-contour*.17;
        outgoingLight=mix(outgoingLight,thermal,uThermal);
        float scan=exp(-pow((vEffectPosition.y-uScan)*9.,2.))*uScanStrength;
        vec3 inspection=vec3(.008,.024,.034)+rim*vec3(.08,.5,.8);
        float bands=pow(.5+.5*sin(vEffectPosition.y*32.),18.);
        inspection+=bands*vec3(.008,.06,.09);
        outgoingLight=mix(outgoingLight,inspection,uInspect);
        outgoingLight+=scan*vec3(.12,.8,1.2);
        #include <opaque_fragment>`);
    };
    material.customProgramCacheKey=()=> 'portfolio-thermal-scan-v1';
    material.needsUpdate=true;
  }
  return {install,uniforms};
}
