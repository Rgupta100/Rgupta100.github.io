"""Original asymmetrical orbital sculpture. Blender CLI: --preview-pair / --no-render."""
import bpy, math, sys, subprocess, shutil, json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'assets/blender'; IMAGES=ROOT/'public/images'; MODELS=ROOT/'public/models'
for p in (OUT,IMAGES,MODELS):p.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene; scene.render.fps=24; scene.frame_start=0; scene.frame_end=192
def material(name,color,metal,rough,emission=0):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
    if emission:p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=emission
    return m
titanium=material('Satin titanium',(.48,.54,.60),.9,.29);silver=material('Polished silver edges',(.72,.77,.80),.95,.21)
graphite=material('Graphite ceramic armor',(.026,.038,.047),.72,.3);black=material('Obsidian core',(.008,.015,.021),.65,.24);amber=material('Amber aperture',(1,.22,.018),.4,.24,2.1)
def empty(name,parent=None):
    o=bpy.data.objects.new(name,None);scene.collection.objects.link(o);o.parent=parent;return o
root=empty('Sculpture');groups={n:empty(n,root) for n in ('outer_frame','middle_frame','inner_frame','core')};families=[]
def family(name,group,delta,turn,delay):
    o=empty('assembly_'+name,groups[group]);families.append((o,Vector(delta),Vector(turn),delay));return o
def finish(o,mat,parent,bevel):
    o.parent=parent;o.data.materials.append(mat);bpy.context.view_layer.objects.active=o;o.select_set(True)
    if bevel:
        mod=o.modifiers.new('Precision edge radii','BEVEL');mod.width=bevel;mod.segments=3;bpy.ops.object.modifier_apply(modifier=mod.name)
    mod=o.modifiers.new('Weighted surface normals','WEIGHTED_NORMAL');mod.keep_sharp=True;mod.weight=35;bpy.ops.object.modifier_apply(modifier=mod.name);o.select_set(False);return o
def arc(name,radius,start,end,width,depth,y,mat,parent,taper=0,tilt=0,steps=52):
    verts=[]
    for i in range(steps+1):
        t=i/steps;a=math.radians(start+(end-start)*t);w=width*(1-taper*t)
        for rr,yy in ((radius-w/2,y-depth/2),(radius+w/2,y-depth/2),(radius+w/2,y+depth/2),(radius-w/2,y+depth/2)):
            x=rr*math.cos(a);z=rr*math.sin(a);verts.append((x,yy+tilt*x,z))
    faces=[(3,2,1,0)]
    for i in range(steps):
        for j in range(4):faces.append((i*4+j,i*4+(j+1)%4,(i+1)*4+(j+1)%4,(i+1)*4+j))
    faces.append(tuple(steps*4+j for j in range(4)))
    data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update();o=bpy.data.objects.new(name,data);scene.collection.objects.link(o)
    for p in data.polygons:p.use_smooth=True
    return finish(o,mat,parent,min(.045,width*.12,depth*.2))
def box(name,loc,size,mat,parent,bevel=.025,rot=(0,0,0)):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.scale=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.rotation_euler=rot
    return finish(o,mat,parent,bevel)
def puck(name,loc,radius,depth,mat,parent,vertices=12):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=loc,rotation=(math.pi/2,0,0));o=bpy.context.object;o.name=name
    return finish(o,mat,parent,.04)
yoke=family('titanium_yoke','outer_frame',(-2,.25,.25),(.07,.16,-.09),0)
arc('Titanium C yoke',2.05,42,294,.42,.62,.28,titanium,yoke,tilt=.14,steps=76)
arc('Yoke inset graphite race',2.055,47,289,.19,.018,-.042,graphite,yoke,tilt=.14,steps=74)
arc('Yoke fine silver chamfer',2.255,46,290,.022,.025,-.039,silver,yoke,tilt=.14,steps=74)
for name,a,delta in [('upper_terminal',42,(-.2,.3,1.7)),('lower_terminal',294,(.4,-.3,-1.65))]:
    f=family(name,'outer_frame',delta,(.13,-.14,.18),3);x=2.05*math.cos(math.radians(a));z=2.05*math.sin(math.radians(a))
    box(name+' silver terminal',(x,.28+.14*x,z),(.50,.67,.14),silver,f,.028,(0,math.radians(-a),0))
    box(name+' dark inset',(x,-.08+.14*x,z),(.22,.025,.05),black,f,.009,(0,math.radians(-a),0))
fin_specs=[('long_swept_fin',1.68,-40,66,.58,.30,-.48,titanium,.64,.10,(2.4,-.55,.85),(.13,-.17,-.22)),('lower_armor_fin',1.51,199,293,.47,.35,-.56,graphite,.55,-.09,(-.9,-.55,-1.7),(-.18,.24,.25)),('rear_armor_fin',1.48,73,153,.39,.31,.70,graphite,.55,.13,(.4,.9,1.8),(.21,-.13,.16))]
for i,(name,r,a,b,w,d,y,mat,taper,tilt,delta,turn) in enumerate(fin_specs):
    f=family(name,'middle_frame',delta,turn,5+i*2);arc(name,r,a,b,w,d,y,mat,f,taper,tilt,40)
    arc(name+' fine edge',r-w*.36,a+4,b-6,.022,.025,y-d/2-.014,amber if i==0 else silver,f,taper*.25,tilt,36)
rotor=family('rotor_major','inner_frame',(.7,.65,-.15),(.35,.12,-.32),8);arc('Split rotor major',1.17,15,204,.11,.17,-.12,silver,rotor,tilt=-.18,steps=58)
rotor2=family('rotor_minor','inner_frame',(1.9,.2,-1),(-.2,.24,.38),11);arc('Split rotor minor',1.17,225,340,.11,.17,-.12,silver,rotor2,tilt=-.18,steps=38)
core=family('faceted_core','core',(.25,.30,0),(.18,-.3,.22),14);puck('Faceted obsidian core',(0,.02,0),.84,.68,black,core,8);puck('Titanium core shoulder',(0,.39,0),.67,.14,titanium,core,8)
face=family('core_face','core',(0,-1.2,-.35),(.1,.12,-.18),16);puck('Graphite faceted face',(0,-.40,0),.68,.13,graphite,face,8);box('Face aperture recess',(0,-.481,0),(.79,.028,.135),black,face,.045)
signal=family('signal_aperture','core',(1.4,-.8,.45),(.05,-.1,.20),18);box('Amber light aperture',(0,-.502,0),(.67,.018,.042),amber,signal,.019)
for i,(a,delta) in enumerate([(132,(-1.65,-.6,1.2)),(314,(1.45,.8,-1.45))]):
    f=family('radial_key_'+str(i),'inner_frame',delta,(.1,.2,(-1)**i*.28),10+i*2);x=.94*math.cos(math.radians(a));z=.94*math.sin(math.radians(a))
    box('Radial titanium key '+str(i),(x,-.03,z),(.24,.34,.16),titanium,f,.023,(0,math.radians(-a),0));box('Key inset '+str(i),(x,-.21,z),(.10,.025,.07),black,f,.007,(0,math.radians(-a),0))
spine=family('rear_bridge','middle_frame',(-.45,1.2,-.50),(.2,.18,-.2),12);box('Diagonal rear bridge',(0,.75,0),(.26,.20,2.32),titanium,spine,.055,(0,-.38,0));box('Rear bridge graphite insert',(0,.87,0),(.12,.06,1.4),graphite,spine,.02,(0,-.38,0))
bpy.context.view_layer.update()
for f,delta,turn,delay in families:
    children=list(f.children);points=[o.matrix_world@Vector(c) for o in children for c in o.bound_box];center=sum(points,Vector())/len(points);f.location=center
    for o in children:o.location-=center
    origin=f.location.copy()
    for frame,amount in [(0,0),(8+delay,0),(44,.25),(48,.25),(54+delay,.25),(88+delay//3,1),(96,1),(108,1),(140,.52),(144,.52),(156+delay,.52),(190,0),(192,0)]:
        f.location=origin+delta*amount;f.rotation_euler=turn*amount;f.keyframe_insert(data_path='location',frame=frame);f.keyframe_insert(data_path='rotation_euler',frame=frame)
    f.animation_data.action.name='Story_'+f.name
def bounds():
    coords=[(v.x,v.z,-v.y) for o in scene.objects if o.type=='MESH' for c in o.bound_box for v in [o.matrix_world@Vector(c)]];lo=[min(v[j] for v in coords) for j in range(3)];hi=[max(v[j] for v in coords) for j in range(3)]
    return {'min':lo,'max':hi,'size':[b-a for a,b in zip(lo,hi)]}
pose={}
for i,name in enumerate(['overview','experience','projects','skills','contact']):scene.frame_set(i*48);bpy.context.view_layer.update();pose[name]=bounds()
(OUT/'pose-bounds.json').write_text(json.dumps(pose,indent=2));manifest={'asset':'Original orbital sculpture','family_count':len(families),'mesh_objects':sum(o.type=='MESH' for o in scene.objects),'families':[f.name for f,*_ in families]};(OUT/'assembly-manifest.json').write_text(json.dumps(manifest,indent=2))
scene.frame_set(0);bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(MODELS/'portfolio.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIVE_ACTIONS',export_nla_strips_merged_animation_name='Story',export_frame_range=True,export_force_sampling=True,export_anim_slide_to_zero=True)
def aim(o,p=(0,0,0)):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
def area(name,loc,power,color,size):
    d=bpy.data.lights.new(name,'AREA');d.energy=power;d.color=color;d.shape='DISK';d.size=size;o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=loc;aim(o)
area('Broad cool key',(-4,-5,6),1300,(.85,.92,1),5);area('Silver rim',(4,2,5),1800,(1,.94,.87),4);area('Soft front',(1,-6,0),600,(.93,.96,1),4);area('Lower warm edge',(-3,1,-2),500,(1,.68,.38),3)
world=bpy.data.worlds.new('Precision studio');scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.09,.1,.12,1);world.node_tree.nodes['Background'].inputs[1].default_value=.35
d=bpy.data.cameras.new('HeroCamera');cam=bpy.data.objects.new('HeroCamera',d);scene.collection.objects.link(cam);cam.location=(3,-10,3);aim(cam);d.type='ORTHO';d.ortho_scale=5.8;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True;scene.render.threads_mode='FIXED';scene.render.threads=6
scene.render.resolution_x=1000;scene.render.resolution_y=1000;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
for prop in scene.render.bl_rna.properties:
    if prop.identifier.startswith('use_stamp'):setattr(scene.render,prop.identifier,False)
scene.render.filepath='//overview-transparent.png';bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'portfolio.blend'),compress=True)
if '--no-render' not in sys.argv:
    chapters=['overview','projects'] if '--preview-pair' in sys.argv else ['overview','experience','projects','skills','contact']
    for name in chapters:
        i=['overview','experience','projects','skills','contact'].index(name);scene.frame_set(i*48);d.ortho_scale={'experience':6.7,'projects':10.8,'skills':8.5}.get(name,5.8);scene.render.filepath=str(OUT/(name+'-transparent.png'));bpy.ops.render.render(write_still=True)
        subprocess.run([shutil.which('python') or 'python','-c','from PIL import Image;import sys;im=Image.open(sys.argv[1]);im.save(sys.argv[2],quality=88,method=4);im.resize((700,700),Image.Resampling.LANCZOS).save(sys.argv[3],quality=88,method=4)',scene.render.filepath,str(IMAGES/(name+'-desktop.webp')),str(IMAGES/(name+'-mobile.webp'))],check=True)
print('ORBITAL_READY',json.dumps(manifest),json.dumps(pose['projects']))
