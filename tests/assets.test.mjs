import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync,existsSync} from 'node:fs';

test('the actual GLB contains the five-chapter animation and stable moving groups',()=>{
  const bytes=readFileSync('public/models/portfolio.glb');
  assert.equal(bytes.toString('ascii',0,4),'glTF');
  assert.ok(bytes.length<3*1024*1024);
  const json=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)).trim());
  const names=new Set(json.nodes.map(n=>n.name));
  for(const name of ['outer_frame','middle_frame','inner_frame','core'])assert.ok(names.has(name),name);
  assert.equal(json.animations.length,1);
  assert.equal(json.animations[0].name,'Story');
  for(const channel of json.animations[0].channels){
    assert.ok(Number.isInteger(channel.target.node)&&channel.target.node>=0&&channel.target.node<json.nodes.length,'animation target must reference an exported node');
  }
  for(const node of json.nodes){
    for(const child of node.children??[])assert.ok(child>=0&&child<json.nodes.length,'child must reference an exported node');
  }
  const end=Math.max(...json.animations[0].samplers.map(s=>json.accessors[s.input].max[0]));
  assert.equal(end,8);
  const meshNodes=json.nodes.filter(n=>n.mesh!==undefined);
  const triangles=meshNodes.reduce((total,node)=>total+json.meshes[node.mesh].primitives.reduce((sum,p)=>sum+json.accessors[p.indices??p.attributes.POSITION].count/3,0),0);
  assert.ok(meshNodes.length<=70,'hero must stay within its mesh submission budget');
  assert.ok(triangles<45000,'hero must stay within its geometry budget');
});

test('every chapter has both fallback sizes and the hero stays within budget',()=>{
  for(const chapter of ['overview','experience','projects','skills','contact']){
    for(const size of ['desktop','mobile']){
      const p=`public/images/${chapter}-${size}.webp`;
      assert.ok(existsSync(p),p);
      assert.ok(statSync(p).size<250*1024,p);
    }
  }
});

test('source preserves destinations and a non-JavaScript reading path',()=>{
  const html=readFileSync('src/pages/index.astro','utf8');
  for(const id of ['main','experience','projects','skills','contact'])assert.ok(html.includes(`id="${id}"`));
  assert.ok(html.includes('<noscript>'));
  assert.ok(html.includes('A team project'));
  assert.ok(html.includes('Illustrative workflow'));
  assert.ok(existsSync('public/licenses/Manrope-OFL.txt'));
  assert.ok(existsSync('public/licenses/IBM-Plex-Mono-OFL.txt'));
});
