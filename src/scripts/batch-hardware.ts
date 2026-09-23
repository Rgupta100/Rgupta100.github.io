import * as THREE from 'three';

/** Batch only identical static siblings. Animated parents and their local transforms survive. */
export function batchHardware(root:THREE.Object3D, animatedNames:ReadonlySet<string>) {
  const parents:THREE.Object3D[]=[];root.traverse(object=>parents.push(object));
  let removedDraws=0;
  for(const parent of parents){
    const batches=new Map<string,THREE.Mesh[]>();
    for(const child of parent.children){
      if(!(child instanceof THREE.Mesh)||child instanceof THREE.SkinnedMesh||child instanceof THREE.InstancedMesh||child.children.length||Array.isArray(child.material)||animatedNames.has(child.name)||child.morphTargetInfluences)continue;
      const key=child.geometry.uuid+child.material.uuid;
      const members=batches.get(key)??[];members.push(child);batches.set(key,members);
    }
    for(const members of batches.values()){
      if(members.length<3)continue;
      const first=members[0],batch=new THREE.InstancedMesh(first.geometry,first.material,members.length);
      batch.name=first.name+' batched hardware';
      members.forEach((mesh,index)=>{mesh.updateMatrix();batch.setMatrixAt(index,mesh.matrix);parent.remove(mesh);});
      batch.instanceMatrix.needsUpdate=true;batch.computeBoundingSphere();parent.add(batch);removedDraws+=members.length-1;
    }
  }
  return removedDraws;
}
