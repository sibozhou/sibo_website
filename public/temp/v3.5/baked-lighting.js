import * as THREE from 'three';
import { HDRLoader } from './vendor/HDRLoader.js';

// Cycles diffuse direct + indirect bake, stored as linear HDR irradiance / pi.
// Fixed night scene with dining partition removed; opening leaves remain interactive.
export async function loadBakedLighting(root) {
  const base=new URL('./lighting/',import.meta.url);
  const asset=name=>{const url=new URL(name,base);url.search=new URL(import.meta.url).search;return url;};
  const [manifest,buffer]=await Promise.all([
    fetch(asset('manifest.json')).then(r=>{if(!r.ok)throw Error('光照清单读取失败');return r.json();}),
    fetch(asset('uv.bin')).then(r=>{if(!r.ok)throw Error('光照坐标读取失败');return r.arrayBuffer();}),
  ]);
  const sources=[];root.traverse(o=>{if(o.isMesh)sources.push(o);});
  for(const spec of manifest.meshes) {
    const mesh=sources[spec.id];
    if(!mesh||mesh.geometry.attributes.position.count*(mesh.isInstancedMesh?mesh.count:1)!==spec.vertices||
      (mesh.geometry.index?.count??mesh.geometry.attributes.position.count)*(mesh.isInstancedMesh?mesh.count:1)!==spec.count)throw Error('模型与光照版本不匹配');
  }
  const loader=new HDRLoader(),textures=new Map();
  await Promise.all(manifest.groups.map(async g=>{
    const texture=await loader.loadAsync(asset(g.texture).href);
    texture.channel=1;textures.set(g.id,texture);
  }));
  const groups=new Map(manifest.groups.map(g=>[g.id,g])),materials=[];
  for(const spec of manifest.meshes) {
    const old=sources[spec.id],src=old.geometry,index=src.index,count=spec.count;
    const positions=new Float32Array(count*3),normals=new Float32Array(count*3),uv=new Float32Array(count*2);
    const matrix=new THREE.Matrix4(),normalMatrix=new THREE.Matrix3(),p=new THREE.Vector3(),n=new THREE.Vector3();
    let k=0;
    for(let instance=0;instance<(old.isInstancedMesh?old.count:1);instance++) {
      if(old.isInstancedMesh)old.getMatrixAt(instance,matrix);else matrix.identity();normalMatrix.getNormalMatrix(matrix);
      for(let j=0;j<(index?.count??src.attributes.position.count);j++,k++) {
        const i=index?index.getX(j):j;
        p.fromBufferAttribute(src.attributes.position,i).applyMatrix4(matrix);positions.set(p.toArray(),k*3);
        n.fromBufferAttribute(src.attributes.normal,i).applyMatrix3(normalMatrix).normalize();normals.set(n.toArray(),k*3);
        if(src.attributes.uv){uv[k*2]=src.attributes.uv.getX(i);uv[k*2+1]=src.attributes.uv.getY(i);}
      }
    }
    const group=groups.get(spec.group),geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.BufferAttribute(normals,3));geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));
    geometry.setAttribute('uv1',new THREE.BufferAttribute(new Float32Array(buffer,group.uvOffset+spec.start*8,spec.count*2),2));
    const material=old.material.clone();material.lightMap=textures.get(spec.group);material.lightMapIntensity=0;
    if(!old.isInstancedMesh){old.geometry=geometry;old.material=material;}
    else {
      const mesh=new THREE.Mesh(geometry,material);mesh.position.copy(old.position);mesh.quaternion.copy(old.quaternion);mesh.scale.copy(old.scale);
      mesh.visible=old.visible;mesh.castShadow=old.castShadow;mesh.receiveShadow=old.receiveShadow;mesh.userData=old.userData;mesh.renderOrder=old.renderOrder;
      const parent=old.parent,slot=parent.children.indexOf(old);parent.remove(old);parent.add(mesh);
      parent.children.splice(parent.children.indexOf(mesh),1);parent.children.splice(slot,0,mesh);
    }
    materials.push(material);
  }
  return {setStrength(value){for(const material of materials)material.lightMapIntensity=Math.PI*value;},meshes:materials.length};
}
