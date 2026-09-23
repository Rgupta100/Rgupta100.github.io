"""Fresh Blender source reopen and GLB import checks. Run inside Blender."""
import bpy,json,struct,math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
path=ROOT/'public/models/portfolio.glb'
with path.open('rb') as f:
    assert f.read(4)==b'glTF'
    f.read(8); length,kind=struct.unpack('<II',f.read(8)); data=json.loads(f.read(length))
assert [a['name'] for a in data['animations']]==['Story']
assert any(m['name']=='Satin gold thermal plates' for m in data['materials'])
assert any(m['name']=='Machined nickel' for m in data['materials'])
instance_batches=sum('EXT_mesh_gpu_instancing' in n.get('extensions',{}) for n in data['nodes'])
assert instance_batches==0, 'Instancing exporter produces invalid animation node references in Blender 5.2.1'
assert all(0<=child<len(data['nodes']) for n in data['nodes'] for child in n.get('children',[]))
assert all(0<=channel['target']['node']<len(data['nodes']) for animation in data['animations'] for channel in animation['channels'])
assert path.stat().st_size<3_000_000
duration=max(data['accessors'][s['input']]['max'][0] for a in data['animations'] for s in a['samplers'])
assert abs(duration-8)<.001,duration
pose_bounds=json.loads((ROOT/'assets/blender/pose-bounds.json').read_text())
assert pose_bounds['overview']==pose_bounds['contact']
assert 12<pose_bounds['projects']['size'][0]<14.5
assert 6<pose_bounds['projects']['size'][1]<7.5
assert pose_bounds['projects']['size'][2]<5.5
assert pose_bounds['skills']['size'][0]<pose_bounds['projects']['size'][0]*.8
manifest=json.loads((ROOT/'assets/blender/assembly-manifest.json').read_text())
assert manifest['family_count']==38 and manifest['assembled_transform_max_error']<1e-5
animated_node_names={data['nodes'][c['target']['node']]['name'] for a in data['animations'] for c in a['channels']}
assert sum(n.startswith('assembly_') for n in animated_node_names)==38
assert not any('mesh' in data['nodes'][c['target']['node']] for a in data['animations'] for c in a['channels'])
required=['outer_frame','middle_frame','inner_frame','core']
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'assets/blender/portfolio.blend'))
assert all(n in bpy.data.objects for n in required)
source_meshes=sum(o.type=='MESH' for o in bpy.data.objects)
assert sum(o.name.startswith('Thermal plate') for o in bpy.data.objects)==5
assert manifest['original_coax_lines']==128
assert source_meshes==manifest['mesh_objects']
bpy.context.scene.frame_set(96);bpy.context.view_layer.update()
plate_x=[bpy.data.objects['assembly_plate_%d'%i].matrix_world.translation.x for i in range(5)]
assert max(plate_x)-min(plate_x)>6
assert len({round(bpy.data.objects['assembly_plate_%d'%i].rotation_euler.x,2) for i in range(5)})>=4
for frame in [0,24,48,72,96,120,144,168,192]:
    bpy.context.scene.frame_set(frame)
    assert all(math.isfinite(v) for n in required for row in bpy.data.objects[n].matrix_world for v in row)
scene=bpy.context.scene
for stamp in [p.identifier for p in scene.render.bl_rna.properties if p.identifier.startswith('use_stamp')]:
    setattr(scene.render,stamp,False)
scene.render.resolution_x=400; scene.render.resolution_y=400; scene.cycles.samples=12
scene.render.threads_mode='FIXED'; scene.render.threads=4
scene.camera.data.ortho_scale=14.0
for frame in [24,72,120,168]:
    scene.frame_set(frame); scene.render.filepath=str(ROOT/'assets/blender'/('transition-%03d.png'%frame))
    bpy.ops.render.render(write_still=True)
from mathutils import Vector
scene.frame_set(0);scene.camera.data.ortho_scale=6.3
for name,loc in [('rear-evidence',(-6,10,4)),('front-evidence',(0,-10,1.5))]:
    scene.camera.location=loc;scene.camera.rotation_euler=(Vector((0,0,0))-scene.camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(ROOT/'assets/blender'/(name+'.png'));bpy.ops.render.render(write_still=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(path))
assert all(n in bpy.data.objects for n in required)
meshes=[o for o in bpy.data.objects if o.type=='MESH']
assert len(meshes)==source_meshes
triangles=sum(len(o.data.polygons) for o in meshes)
materials=[m.name for m in bpy.data.materials]
assert any('Amber' in n for n in materials)
report={'asset':'Original conceptual cryostat','blender':bpy.app.version_string,'source_reopened':True,'fresh_glb_import':True,'clip':'Story','duration_seconds':duration,'bytes':path.stat().st_size,'mesh_objects':len(meshes),'triangles':triangles,'groups':required,'materials':materials,'gpu_instance_batches':instance_batches,'thermal_plates':5,'coax_lines':128,'transform_samples':9,'limits':'Conceptual illustration, not a functional cryogenic device. Local harnesses stay attached to module groups during disassembly. Transform sampling is not a collision solver.'}
report['pose_bounds']=pose_bounds
report['overview_contact_identical_bounds']=True
report['animated_subassemblies']=38
report['assembled_transform_max_error']=manifest['assembled_transform_max_error']
report['mesh_animation_channels']=0
report['choreography']='Asymmetric dispersed constellation with partial regroup'
(ROOT/'assets/blender/validation.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
