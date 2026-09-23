import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function readGlb() {
  const bytes = readFileSync('public/models/pc-19.glb');
  assert.equal(bytes.toString('ascii', 0, 4), 'glTF');
  assert.equal(bytes.readUInt32LE(4), 2);
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  let document, binary;
  for (let offset = 12; offset < bytes.length;) {
    const length = bytes.readUInt32LE(offset), type = bytes.readUInt32LE(offset + 4);
    const chunk = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === 0x4e4f534a) document = JSON.parse(chunk.toString('utf8').trim());
    if (type === 0x004e4942) binary = chunk;
    offset += 8 + length;
  }
  assert.ok(document && binary, 'GLB contains JSON and binary chunks');
  return { document, binary, bytes };
}

function floatValues(document, binary, index) {
  const accessor = document.accessors[index];
  assert.equal(accessor.componentType, 5126, 'animation uses floating-point values');
  assert.equal(accessor.sparse, undefined, 'sampled Story animation uses explicit values');
  const view = document.bufferViews[accessor.bufferView];
  const width = {SCALAR: 1, VEC3: 3, VEC4: 4}[accessor.type];
  assert.ok(width, `supported animation value type ${accessor.type}`);
  const offset = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const stride = view.byteStride ?? width * 4;
  return Array.from({length: accessor.count}, (_, i) =>
    Array.from({length: width}, (_, j) => binary.readFloatLE(offset + i * stride + j * 4)));
}

test('PC export retains semantic assemblies, GPU construction layers and independent fan rotors', () => {
  const { document: d } = readGlb();
  const names = new Set(d.nodes.map(n => n.name));
  for (const name of ['pc_root','chassis','glass_side','glass_front','motherboard','cpu_block','gpu','ram_group','radiator','psu','cable_group',
    'gpu_shroud_group','gpu_heatsink_group','gpu_pcb_group','gpu_backplate_group']) {
    assert.ok(names.has(name), `missing semantic assembly: ${name}`);
  }
  assert.equal(d.animations.length, 1, 'one authored assembly clip');
  const story = d.animations[0];
  assert.equal(story.name, 'Story');
  const animated = new Set(story.channels.map(c => {
    assert.ok(Number.isInteger(c.target.node) && c.target.node >= 0 && c.target.node < d.nodes.length);
    return d.nodes[c.target.node].name;
  }));
  for (const name of ['glass_side','gpu','gpu_shroud_group','gpu_heatsink_group','gpu_backplate_group']) {
    assert.ok(animated.has(name), `actual Story channels required for ${name}`);
  }
  const rotors = d.nodes.filter(n => n.name?.startsWith('fan_rotor_'));
  assert.equal(rotors.length, 10, 'three front, three top, one rear and three GPU rotors');
  for (const rotor of rotors) {
    assert.ok(!animated.has(rotor.name), 'runtime fan rotation must not compete with Story');
    const axis = rotor.extras?.rotation_axis;
    assert.ok(Array.isArray(axis) && axis.length === 3 && axis.every(Number.isFinite), `${rotor.name}: explicit local rotation axis`);
    assert.ok(Math.abs(Math.hypot(...axis) - 1) < 1e-5, `${rotor.name}: unit axis`);
  }
  for (const node of d.nodes) {
    for (const child of node.children ?? []) assert.ok(Number.isInteger(child) && child >= 0 && child < d.nodes.length);
  }
});

test('PC Story returns every animated assembly to its starting pose and contains meaningful GPU separation', () => {
  const { document: d, binary } = readGlb();
  const story = d.animations[0];
  let separatedGpuLayers = 0;
  for (const channel of story.channels) {
    const node = d.nodes[channel.target.node];
    const sampler = story.samplers[channel.sampler];
    const times = floatValues(d, binary, sampler.input).flat();
    assert.ok(times.every((time, i) => Number.isFinite(time) && (i === 0 || time > times[i - 1])), `${node.name}: monotonic key times`);
    const values = floatValues(d, binary, sampler.output);
    const cubic = sampler.interpolation === 'CUBICSPLINE';
    const first = values[cubic ? 1 : 0], last = values[cubic ? values.length - 2 : values.length - 1];
    assert.ok(values.flat().every(Number.isFinite), `${node.name}: finite transforms`);
    if (channel.target.path === 'rotation') {
      const dot = first.reduce((sum, value, i) => sum + value * last[i], 0);
      assert.ok(Math.abs(Math.abs(dot) - 1) < 1e-4, `${node.name}: rotational closure`);
    } else {
      assert.ok(first.every((value, i) => Math.abs(value - last[i]) < 1e-5), `${node.name}: ${channel.target.path} closure`);
    }
    if (/^gpu_(shroud|heatsink|backplate)_group$/.test(node.name) && channel.target.path === 'translation') {
      const positions = cubic ? values.filter((_, i) => i % 3 === 1) : values;
      const travel = Math.max(...positions.map(position => Math.hypot(...position.map((value, i) => value - first[i]))));
      assert.ok(travel > .005, `${node.name}: visible separation in metres`);
      separatedGpuLayers++;
    }
  }
  assert.equal(separatedGpuLayers, 3, 'three distinct graphics-card layers separate');
});

test('PC material/export metadata supports RGB without publishing local workstation paths', () => {
  const { document: d } = readGlb();
  const lightingMaterials = d.materials.filter(material => material.name?.startsWith('led_'));
  assert.ok(lightingMaterials.length > 0, 'named lighting materials');
  assert.ok(lightingMaterials.some(material => material.emissiveFactor?.some(value => value > 0)), 'actual emissive lighting channels');
  const serialized = JSON.stringify(d);
  assert.ok(!/(?:[A-Za-z]:[\\/](?:Users|Program Files)|file:\/\/|\/home\/|\/Users\/)/i.test(serialized), 'portable model JSON metadata');
  for (const image of d.images ?? []) assert.ok(!image.uri || !/^(?:https?:|file:|[A-Za-z]:[\\/])/i.test(image.uri), 'textures packed or relative');
});

test('additional RGB channels illuminate actual long strip geometry', () => {
  const { document: d } = readGlb();
  for (const name of ['led_top_rail', 'led_gpu_edge']) {
    const materialIndex = d.materials.findIndex(material => material.name === name);
    assert.ok(materialIndex >= 0, `${name}: independent lighting channel`);
    assert.ok(d.materials[materialIndex].emissiveFactor.some(value => value > 0), `${name}: emissive surface`);
    const surfaces = d.meshes.flatMap(mesh => mesh.primitives).filter(primitive => primitive.material === materialIndex);
    assert.ok(surfaces.length > 0, `${name}: attached to exported physical geometry`);
    assert.ok(surfaces.some(primitive => {
      const positions = d.accessors[primitive.attributes.POSITION];
      return positions.count >= 8 && Math.max(...positions.max.map((value, i) => value - positions.min[i])) > .1;
    }), `${name}: visible strip length rather than a metadata-only light`);
  }
});
