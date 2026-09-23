"""Original cryostat-inspired hero. CLI flags: --preview-pair / --overview-only / --no-render."""
import bpy, math, sys, subprocess, shutil, json, re
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'assets/blender'; IMAGES=ROOT/'public/images'; MODELS=ROOT/'public/models'
for p in [OUT,IMAGES,MODELS]: p.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene; scene.render.fps=24; scene.frame_start=0; scene.frame_end=192; TAU=math.tau
def material(name,color,metal,rough,emission=0):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1); p.inputs['Metallic'].default_value=metal; p.inputs['Roughness'].default_value=rough
    if emission: p.inputs['Emission Color'].default_value=(*color,1); p.inputs['Emission Strength'].default_value=emission
    return m
gold=material('Satin gold thermal plates',(.65,.37,.095),.92,.29)
copper=material('Copper thermal braid',(.55,.22,.075),.9,.28)
nickel=material('Machined nickel',(.55,.60,.65),.95,.22)
wiregold=material('Gold plated coax',(.57,.33,.11),.92,.25)
dark=material('Graphite processor enclosure',(.018,.025,.032),.73,.28)
ceramic=material('Black ceramic insulators',(.009,.012,.016),.1,.38)
amber=material('Amber signal',(1,.24,.025),.5,.25,1.4)
def empty(name):
    o=bpy.data.objects.new(name,None);scene.collection.objects.link(o);return o
root=empty('Sculpture');groups={n:empty(n) for n in ['outer_frame','middle_frame','inner_frame','core']}
for g in groups.values():g.parent=root
cache={}
def instance(name,mesh,location,parent):
    o=bpy.data.objects.new(name,mesh);scene.collection.objects.link(o);o.location=location;o.parent=parent;return o
def lathe(name,profile,mat,loc,parent,n=64):
    key=(tuple(profile),mat.name,n)
    if key not in cache:
        v=[(r*math.cos(i*TAU/n),r*math.sin(i*TAU/n),z) for r,z in profile for i in range(n)];f=[]
        for j in range(len(profile)):
            k=(j+1)%len(profile)
            for i in range(n):f.append((j*n+i,j*n+(i+1)%n,k*n+(i+1)%n,k*n+i))
        m=bpy.data.meshes.new(name);m.from_pydata(v,[],f);m.materials.append(mat);m.update()
        for p in m.polygons:p.use_smooth=True
        cache[key]=m
    return instance(name,cache[key],loc,parent)
def cylinder(name,r,d,mat,loc,g,n=24,b=.012):
    b=min(b,d*.22,r*.2)
    return lathe(name,[(0,-d/2),(r-b,-d/2),(r,-d/2+b),(r,d/2-b),(r-b,d/2),(0,d/2)],mat,loc,g,n)
def ring(name,r,w,d,mat,loc,g,n=96):
    b=min(.018,d*.25,w*.25);a=r-w
    return lathe(name,[(a+b,-d/2),(r-b,-d/2),(r,-d/2+b),(r,d/2-b),(r-b,d/2),(a+b,d/2),(a,d/2-b),(a,-d/2+b)],mat,loc,g,n)
def box(name,loc,size,mat,g,b=.035):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.scale=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if b:
        mod=o.modifiers.new('Machined edge','BEVEL');mod.width=b;mod.segments=3;bpy.ops.object.modifier_apply(modifier=mod.name)
    o.data.materials.append(mat);o.parent=g;return o
def tube(name,points,r,mat,g,sides=6):
    v=[];f=[]
    for i,p in enumerate(points):
        t=Vector(points[min(i+1,len(points)-1)])-Vector(points[max(i-1,0)]);t.normalize();ref=Vector((0,0,1)) if abs(t.z)<.9 else Vector((1,0,0));n=t.cross(ref).normalized();b=t.cross(n).normalized()
        for j in range(sides):v.append(Vector(p)+r*(math.cos(j*TAU/sides)*n+math.sin(j*TAU/sides)*b))
    for i in range(len(points)-1):
        for j in range(sides):f.append((i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j))
    m=bpy.data.meshes.new(name);m.from_pydata(v,[],f);m.materials.append(mat);m.update()
    for p in m.polygons:p.use_smooth=True
    return instance(name,m,(0,0,0),g)
def polar(r,a,z):return(r*math.cos(a),r*math.sin(a),z)

heights=[2.,1.10,.15,-.80,-1.63];radii=[1.55,1.43,1.26,1.04,.83]
owners=[groups['outer_frame'],groups['outer_frame'],groups['middle_frame'],groups['inner_frame'],groups['core']]
for stage,(z,r,g) in enumerate(zip(heights,radii,owners)):
    ring('Thermal plate %d'%stage,r,r-.25,.12,gold,(0,0,z),g)
    ring('Nickel plate rim %d'%stage,r+.012,.042,.06,nickel,(0,0,z-.014),g)
    ring('Concentric machining %d'%stage,r-.18,.009,.005,copper,(0,0,z+.062),g)
    ring('Inner aperture rim %d'%stage,.29,.045,.14,nickel,(0,0,z),g,64)
    for i in range(24):
        p=polar(r-.105,TAU*i/24,z+.079);cylinder('Recessed hex fastener',.032,.038,nickel,p,g,6,.003);cylinder('Dark screw recess',.011,.008,ceramic,(p[0],p[1],p[2]+.021),g,12,.001)
    for i in range(16):
        p=polar(r*.63,TAU*(i+.5)/16,z+.082);cylinder('Gold feedthrough collar',.048,.07,wiregold,p,g,12,.006);cylinder('Ceramic feedthrough',.026,.08,ceramic,(p[0],p[1],p[2]+.04),g,16,.005)
    if stage:
        up=heights[stage-1]-.08;lo=z+.085
        for i in range(6):
            x,y,_=polar(min(r*.86,radii[stage-1]*.8),TAU*(i+.25)/6,0);cylinder('Nickel standoff',.026,up-lo,nickel,(x,y,(up+lo)/2),g,16,.004)
            for end in [up-.028,lo+.028]:cylinder('Locking collar',.058,.078,gold,(x,y,end),g,12,.007)

for stage in range(1,5):
    top=heights[stage-1]-.10;bottom=heights[stage]+.13;g=owners[stage]
    for i in range(32):
        a=TAU*(i+.35)/32;r0=radii[stage-1]*(.66 if i%2 else .78);r1=radii[stage]*(.60 if i%2 else .73);pts=[]
        for k in range(21):
            t=k/20;aa=a+.10*math.sin(math.pi*t);rr=r0*(1-t)+r1*t+.12*math.sin(math.pi*t);zz=top*(1-t)+bottom*t+.042*math.sin(TAU*t)*math.sin(math.pi*t);pts.append(polar(rr,aa,zz))
        tube('Coax stage %d line %02d'%(stage,i),pts,.012 if i%3 else .016,nickel if i%4==0 else wiregold,g)
        for endpoint in [pts[0],pts[-1]]:
            cylinder('Coax connector hex',.028,.074,gold,endpoint,g,6,.003);cylinder('Coax nickel ferrule',.018,.108,nickel,endpoint,g,12,.002)
    for i in range(6):
        a=TAU*(i+.16)/6;pts=[]
        for k in range(25):
            t=k/24;pts.append(polar(radii[stage]*.88+.16*math.sin(math.pi*t),a+.18*math.sin(TAU*t),top*(1-t)+bottom*t))
        tube('Copper cooling loop %d %d'%(stage,i),pts,.026,copper,g,8)

for i in range(3):
    x,y,_=polar(.68,TAU*i/3+.4,0);g=groups['outer_frame'];cylinder('Upper manifold',.145,.40,nickel,(x,y,2.26),g,48,.018)
    for z in [2.09,2.42]:ring('Manifold copper flange',.19,.055,.07,gold,(x,y,z),g,48)
    cylinder('Service neck',.058,.21,copper,(x,y,2.55),g,24,.009)
for j,g in enumerate([groups['outer_frame'],groups['middle_frame'],groups['inner_frame']]):
    zz=[1.5,.58,-.34][j];cylinder('Cold head column',.105,.61,nickel,(-.32,.18,zz),g,32,.015)
    for k in range(7):ring('Exchanger fin',.16,.07,.035,copper,(-.32,.18,zz-.24+k*.08),g,32)
    for stripe in range(6):
        pts=[]
        for k in range(18):
            t=k/17;pts.append((-.32+(radii[min(j+1,4)]*.75+.32)*t,.18+(stripe-2.5)*.026,zz-.18+.13*math.sin(math.pi*t)))
        tube('Thermal braid strand',pts,.016,copper,g)
g=groups['core'];box('Processor copper saddle',(0,0,-1.85),(1.10,.92,.17),copper,g,.05);box('Processor housing',(0,0,-2.17),(.99,.85,.49),dark,g,.075)
box('Processor nickel face',(0,-.436,-2.17),(.79,.025,.31),nickel,g,.025);box('Processor dark inset',(0,-.456,-2.17),(.59,.02,.19),ceramic,g,.016);box('Amber signal channel',(0,-.47,-2.302),(.62,.016,.012),amber,g,.004)
for x in [-.36,.36]:
    for z in [-2.29,-2.05]:o=cylinder('Processor face screw',.021,.024,gold,(x,-.46,z),g,6,.003);o.rotation_euler.x=math.pi/2
for i in range(12):tube('Processor control lead',[polar(.57-.12*k/13,i*TAU/12,-1.72-.28*k/13) for k in range(14)],.013,wiregold,g)
for x in [-.39,.39]:
    for y in [-.32,.32]:cylinder('Processor mounting post',.03,.27,nickel,(x,y,-1.96),g,16,.006)

# Keep every authored mesh unchanged; regroup static hardware into 38 independently
# choreographed subassemblies with meaningful local pivots.
bpy.context.view_layer.update()
mesh_objects=[o for o in scene.objects if o.type=='MESH']
assembled_matrices={o.name:o.matrix_world.copy() for o in mesh_objects}
members={}
def sector(x,y,count): return int((math.atan2(y,x)%TAU)/TAU*count)%count
def classify(o):
    n=o.name;p=o.location
    for prefix in ['Thermal plate ','Nickel plate rim ','Concentric machining ','Inner aperture rim ']:
        if n.startswith(prefix): return 'plate_%d'%int(n[len(prefix):].split('.')[0])
    if n.startswith(('Recessed hex fastener','Dark screw recess','Gold feedthrough collar','Ceramic feedthrough')):
        stage=min(range(5),key=lambda i:abs(p.z-heights[i]-.08))
        if stage and n.startswith(('Gold feedthrough collar','Ceramic feedthrough')):return 'cables_%d_%d'%(stage,sector(p.x,p.y,4))
        return 'plate_%d'%stage
    match=re.match(r'Coax stage (\d+) line (\d+)',n)
    if match:return 'cables_%d_%d'%(int(match[1]),int(match[2])//8)
    if n.startswith(('Coax connector hex','Coax nickel ferrule')):
        stage=min(range(1,5),key=lambda i:min(abs(p.z-(heights[i-1]-.10)),abs(p.z-(heights[i]+.13))))
        return 'cables_%d_%d'%(stage,sector(p.x,p.y,4))
    match=re.match(r'Copper cooling loop (\d+) (\d+)',n)
    if match:return 'cables_%d_%d'%(int(match[1]),int((int(match[2])+.16)/6*4)%4)
    if n.startswith(('Nickel standoff','Locking collar')):
        stage=min(range(1,5),key=lambda i:min(abs(p.z-(heights[i-1]-.108)),abs(p.z-(heights[i]+.113)),abs(p.z-(heights[i-1]+heights[i]+.005)/2)))
        return 'supports_%d_%d'%(stage,sector(p.x,p.y,2))
    if n.startswith(('Upper manifold','Manifold copper flange','Service neck')):
        return 'manifold_%d'%(round(((math.atan2(p.y,p.x)-.4)%TAU)/TAU*3)%3)
    if n.startswith(('Cold head column','Exchanger fin','Thermal braid strand')):
        bounds=[o.matrix_world@Vector(c) for c in o.bound_box];z=sum(v.z for v in bounds)/8
        return 'cooling_%d'%min(range(3),key=lambda i:abs(z-[1.5,.58,-.34][i]))
    if n.startswith(('Processor copper saddle','Processor control lead','Processor mounting post')):return 'processor_saddle'
    if n.startswith('Processor housing'):return 'processor_body'
    if n.startswith(('Processor nickel face','Processor dark inset','Amber signal channel','Processor face screw')):return 'processor_face'
    raise RuntimeError('Unclassified authored part: '+n)
for o in mesh_objects:members.setdefault(classify(o),[]).append(o)
families={}
# Authored asymmetric constellation in Blender XYZ. Unlike an exploded cylinder,
# each family has a distinct destination; the browser presents this across the page.
plate_targets=[(-3.3,.25,2.45),(2.4,-.25,1.55),(-.15,.8,.20),(3.5,-.40,-1.05),(-2.8,-.55,-2.28)]
plate_turns=[(.10,-.18,.12),(-.13,.18,-.20),(.18,-.10,.25),(-.12,.16,-.30),(.17,.10,.10)]
cable_targets=[
    [(-5.2,.7,1.15),(-1.0,-1.5,2.8),(4.7,.9,2.5),(5.5,-.5,.65)],
    [(-4.6,-.8,-.1),(-1.9,1.4,.85),(2.6,1.2,.1),(5.2,-1.2,-.65)],
    [(-5.35,.65,-1.45),(-2.35,-1.3,-.6),(.85,-1.25,-1.2),(5.45,.8,-1.75)],
    [(-4.25,.45,-2.45),(-.65,1.3,-2.2),(1.75,-.9,-2.25),(3.65,1.2,-2.5)]]
support_targets=[ [(-5.8,-.15,1.7),(1.0,1.2,3.0)],[(5.7,.2,1.3),(-3.0,1.6,.1)],[(-.3,-1.7,-1.0),(5.8,-.15,-1.2)],[(-5.4,1.2,-2.4),(2.0,.7,-2.75)] ]
def motion(name,anchor):
    bits=name.split('_');kind=bits[0]
    if kind=='plate':
        i=int(bits[1]);return Vector(plate_targets[i])-anchor,i*.035,Vector(plate_turns[i])
    if kind=='cables':
        stage,sec=int(bits[1]),int(bits[2]);sign=-1 if sec%2 else 1
        return Vector(cable_targets[stage-1][sec])-anchor,.30+stage*.05+sec*.035,Vector((-.08+stage*.035,.12*sign,.18*sign))
    if kind=='supports':
        stage,sec=int(bits[1]),int(bits[2]);sign=-1 if sec else 1
        return Vector(support_targets[stage-1][sec])-anchor,.64+stage*.03+sec*.03,Vector((.20*sign,.12,-.25*sign))
    if kind=='cooling':
        i=int(bits[1]);return Vector([(.5,.4,1.65),(-2.65,-.75,-.1),(2.15,.25,-1.65)][i])-anchor,.80+i*.02,Vector((.10,-.12,.18*(-1 if i%2 else 1)))
    if kind=='manifold':
        i=int(bits[1]);return Vector([(-4.2,.8,3.05),(.9,-.7,2.9),(4.65,1.2,2.45)][i])-anchor,.15+i*.05,Vector((.10*i,-.10,.16*i))
    target,delay,turn={'processor_saddle':((-1.7,-.5,-2.65),.72,(.12,-.16,-.12)),'processor_body':((1.0,-.8,-2.8),.92,(.1,.16,.18)),'processor_face':((-.15,-1.5,-2.75),1.04,(.05,-.2,-.12))}[name]
    return Vector(target)-anchor,delay,Vector(turn)
def finish_action(o):
    action=o.animation_data.action;action.name=o.name+' choreography'
    for layer in action.layers:
        for strip in layer.strips:
            for bag in strip.channelbags:
                for curve in bag.fcurves:
                    for key in curve.keyframe_points:key.interpolation='BEZIER';key.handle_left_type='AUTO_CLAMPED';key.handle_right_type='AUTO_CLAMPED'
    # Keep each authored action active; export merges these channels into Story.
for name,objects in members.items():
    anchor=sum((sum((o.matrix_world@Vector(c) for c in o.bound_box),Vector())/8 for o in objects),Vector())/len(objects)
    family=empty('assembly_'+name);family.parent=objects[0].parent;family.location=anchor;families[name]=family
    bpy.context.view_layer.update()
    for o in objects:
        world=assembled_matrices[o.name];o.parent=family;o.matrix_world=world
    delta,delay,twist=motion(name,anchor);start=round((.18+delay)*24);full_start=round((2.18+delay*.22)*24);full_end=round((3.52+delay*.25)*24);return_start=round((6.35+(1.04-delay)*.25)*24)
    keys=[(0,0),(start,0),(45,.32),(48,.32),(full_start,.32),(full_end,1),(96,1),(110,1),(140,.58),(144,.58),(return_start,.58),(189,0),(192,0)]
    for frame,amount in keys:
        family.location=anchor+delta*amount;family.rotation_euler=twist*amount
        family.keyframe_insert(data_path='location',frame=frame);family.keyframe_insert(data_path='rotation_euler',frame=frame)
    finish_action(family)
for g in groups.values():
    for frame,angle in [(0,0),(48,.12),(96,0),(144,-.15),(192,0)]:
        g.rotation_euler.z=angle;g.keyframe_insert(data_path='rotation_euler',frame=frame)
    finish_action(g)
scene.frame_set(0);bpy.context.view_layer.update()
preservation_error=max(abs(o.matrix_world[r][c]-assembled_matrices[o.name][r][c]) for o in mesh_objects for r in range(4) for c in range(4))
assert preservation_error<1e-5,preservation_error
source_family_counts={n:len(m) for n,m in members.items()}
# Storage-neutral joins: only unique cable meshes, never repeated fastener geometry.
# All children of an animated family are static, enabling safe browser-side batching.
for name,family in families.items():
    batches={}
    for o in list(family.children):
        if o.type=='MESH' and o.data.users==1 and o.name.startswith(('Coax stage','Copper cooling loop','Thermal braid strand','Processor control lead')):
            batches.setdefault(o.data.materials[0].name,[]).append(o)
    for material_name,objects in batches.items():
        if len(objects)<2:continue
        bpy.ops.object.select_all(action='DESELECT')
        for o in objects:o.select_set(True)
        bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();objects[0].name='Harness '+name+' '+material_name
(OUT/'assembly-manifest.json').write_text(json.dumps({'families':source_family_counts,'family_count':len(families),'assembled_transform_max_error':preservation_error,'original_mesh_objects':len(mesh_objects),'mesh_objects':sum(o.type=='MESH' for o in scene.objects),'original_coax_lines':128,'clip':'Story','duration_seconds':8},indent=2))
pose_bounds={}
for i,chapter in enumerate(['overview','experience','projects','skills','contact']):
    scene.frame_set(i*48);bpy.context.view_layer.update()
    points=[o.matrix_world@Vector(corner) for o in scene.objects if o.type=='MESH' for corner in o.bound_box]
    browser_points=[(p.x,p.z,-p.y) for p in points]
    lo=[min(p[a] for p in browser_points) for a in range(3)];hi=[max(p[a] for p in browser_points) for a in range(3)]
    pose_bounds[chapter]={'min':lo,'max':hi,'size':[hi[a]-lo[a] for a in range(3)],'axes':'glTF/browser XYZ'}
(OUT/'pose-bounds.json').write_text(json.dumps(pose_bounds,indent=2))
scene.frame_set(0);bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:
    if o.type in ['MESH','EMPTY']:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(MODELS/'portfolio.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIVE_ACTIONS',export_nla_strips_merged_animation_name='Story',export_frame_range=True,export_force_sampling=True,export_anim_slide_to_zero=True)
def aim(o,p=(0,0,0)):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
def area(name,loc,power,color,size):
    d=bpy.data.lights.new(name,'AREA');d.energy=power;d.color=color;d.shape='DISK';d.size=size;o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=loc;aim(o)
area('Broad cool studio key',(-4,-5,6),1600,(.85,.92,1),5);area('Warm precision rim',(4,2,5),1900,(1,.86,.66),4);area('Soft front detail',(1,-6,0),850,(.93,.96,1),4);area('Lower copper edge',(-3,1,-2),650,(1,.65,.36),3)
world=bpy.data.worlds.new('Precision studio');scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.09,.1,.12,1);world.node_tree.nodes['Background'].inputs[1].default_value=.4
d=bpy.data.cameras.new('HeroCamera');cam=bpy.data.objects.new('HeroCamera',d);scene.collection.objects.link(cam);cam.location=(6,-10,5);aim(cam,(0,0,.08));d.type='ORTHO';d.ortho_scale=6.3;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True;scene.render.threads_mode='FIXED';scene.render.threads=6
scene.render.resolution_x=1000;scene.render.resolution_y=1000;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
for stamp in [p.identifier for p in scene.render.bl_rna.properties if p.identifier.startswith('use_stamp')]:
    setattr(scene.render,stamp,False)
scene.render.filepath='//overview-transparent.png'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'portfolio.blend'))
if '--no-render' not in sys.argv:
    chapters=['overview','projects'] if '--preview-pair' in sys.argv else (['overview'] if '--overview-only' in sys.argv else ['overview','experience','projects','skills','contact'])
    for name in chapters:
        i=['overview','experience','projects','skills','contact'].index(name)
        scene.frame_set(i*48);d.ortho_scale={'experience':8.5,'projects':14.,'skills':11.}.get(name,6.3);scene.render.filepath=str(OUT/(name+'-transparent.png'));bpy.ops.render.render(write_still=True)
        subprocess.run([shutil.which('python') or 'python','-c','from PIL import Image;import sys;im=Image.open(sys.argv[1]);im.save(sys.argv[2],quality=88,method=4);im.resize((700,700),Image.Resampling.LANCZOS).save(sys.argv[3],quality=88,method=4)',scene.render.filepath,str(IMAGES/(name+'-desktop.webp')),str(IMAGES/(name+'-mobile.webp'))],check=True)
print('CRYOSTAT_READY',str(MODELS/'portfolio.glb'),(MODELS/'portfolio.glb').stat().st_size)
