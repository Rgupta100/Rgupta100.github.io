"""Fresh source/export checks for the original lightweight orbital sculpture."""
import bpy,json,struct,math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'assets/blender';path=ROOT/'public/models/portfolio.glb'
with path.open('rb') as f:
    assert f.read(4)==b'glTF';f.read(8);length,kind=struct.unpack('<II',f.read(8));data=json.loads(f.read(length))
assert [a['name'] for a in data['animations']]==['Story']
assert all(0<=child<len(data['nodes']) for n in data['nodes'] for child in n.get('children',[]))
assert all(0<=c['target']['node']<len(data['nodes']) for a in data['animations'] for c in a['channels'])
assert not any('EXT_mesh_gpu_instancing' in n.get('extensions',{}) for n in data['nodes'])
assert not any('mesh' in data['nodes'][c['target']['node']] for a in data['animations'] for c in a['channels'])
duration=max(data['accessors'][s['input']]['max'][0] for a in data['animations'] for s in a['samplers']);assert abs(duration-8)<.001
assert path.stat().st_size<3_000_000
triangles=sum(data['accessors'][p['indices']]['count']//3 for m in data['meshes'] for p in m['primitives']);assert triangles<45_000
manifest=json.loads((OUT/'assembly-manifest.json').read_text());assert 12<=manifest['family_count']<=18 and manifest['mesh_objects']<70
poses=json.loads((OUT/'pose-bounds.json').read_text());assert poses['overview']==poses['contact'];assert 8<poses['projects']['size'][0]<10.5
bpy.ops.wm.open_mainfile(filepath=str(OUT/'portfolio.blend'))
required=['outer_frame','middle_frame','inner_frame','core'];assert all(n in bpy.data.objects for n in required)
assert sum(o.type=='MESH' for o in bpy.data.objects)==manifest['mesh_objects']
for frame in [0,24,48,72,96,120,144,168,192]:
    bpy.context.scene.frame_set(frame)
    assert all(math.isfinite(v) for o in bpy.data.objects for row in o.matrix_world for v in row)
scene=bpy.context.scene;scene.render.resolution_x=400;scene.render.resolution_y=400;scene.cycles.samples=12;scene.render.threads=4
for frame in [24,72,120,168]:
    scene.frame_set(frame);scene.camera.data.ortho_scale=10.8;scene.render.filepath=str(OUT/('transition-%03d.png'%frame));bpy.ops.render.render(write_still=True)
scene.frame_set(0);scene.camera.data.ortho_scale=5.8
for name,loc in [('front-evidence',(0,-10,1)),('rear-evidence',(0,10,1))]:
    scene.camera.location=loc;scene.camera.rotation_euler=(-scene.camera.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True)
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(path))
assert sum(o.type=='MESH' for o in bpy.data.objects)==manifest['mesh_objects']
assert all(n in bpy.data.objects for n in required)
report={'asset':'Original asymmetrical orbital sculpture','source_reopened':True,'fresh_glb_import':True,'clip':'Story','duration_seconds':duration,'bytes':path.stat().st_size,'mesh_objects':manifest['mesh_objects'],'triangles':triangles,'animated_subassemblies':manifest['family_count'],'mesh_animation_channels':0,'gpu_instance_batches':0,'groups':required,'pose_bounds':poses,'overview_contact_identical_bounds':True,'transform_samples':9,'limits':'Abstract artistic sculpture, not a functioning device. Transform sampling does not prove collision-free motion.'}
(OUT/'validation.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
