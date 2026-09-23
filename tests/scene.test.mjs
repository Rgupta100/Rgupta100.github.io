import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {batchHardware} from '../src/scripts/batch-hardware.ts';
import {cameraPose} from '../src/scripts/camera-path.ts';

test('hardware batching preserves the animated parent and local part transforms',()=>{
  const root=new THREE.Group(),parent=new THREE.Group();root.add(parent);parent.position.set(4,2,3);
  const geometry=new THREE.BoxGeometry(),material=new THREE.MeshStandardMaterial();
  for(let i=0;i<4;i++){const mesh=new THREE.Mesh(geometry,material);mesh.position.x=i;mesh.name='bolt'+i;parent.add(mesh);}
  assert.equal(batchHardware(root,new Set(['bolt3'])),2);
  assert.equal(parent.children.length,2);
  const batch=parent.children.find(o=>o.isInstancedMesh),matrix=new THREE.Matrix4();
  batch.getMatrixAt(2,matrix);assert.equal(matrix.elements[12],2);
  assert.ok(parent.children.some(o=>o.name==='bolt3'));assert.equal(batch.parent,parent);
  assert.deepEqual(parent.position.toArray(),[4,2,3]);
});
test('camera path changes viewing angle and pulls back for expansion, then returns home',()=>{
  const start=cameraPose(0),expanded=cameraPose(2),end=cameraPose(4);
  assert.ok(expanded.distance>start.distance);assert.ok(Math.abs(cameraPose(3).yaw-start.yaw)>.8);for(const key of Object.keys(start))assert.ok(Math.abs(end[key]-start[key])<1e-10);
  for(let i=0;i<=40;i++){const pose=cameraPose(i/10);assert.ok(Object.values(pose).every(Number.isFinite));assert.ok(pose.distance>=10);}
});
