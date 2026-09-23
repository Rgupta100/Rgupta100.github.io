"""Lossless PNG text removal and portable Blender source settings. Run with Blender."""
import bpy, struct, hashlib, json, re, gzip
from pathlib import Path
root=Path(__file__).resolve().parent
png_results=[]
for path in root.glob('*.png'):
    raw=path.read_bytes(); assert raw[:8]==b'\x89PNG\r\n\x1a\n'
    out=bytearray(raw[:8]); pos=8; removed=[]; before=[]; after=[]
    while pos<len(raw):
        length=struct.unpack('>I',raw[pos:pos+4])[0]
        chunk=raw[pos:pos+12+length]; kind=raw[pos+4:pos+8]
        if kind==b'IDAT': before.append(chunk)
        if kind in (b'tEXt',b'iTXt',b'zTXt'): removed.append(kind.decode())
        else:
            out.extend(chunk)
            if kind==b'IDAT': after.append(chunk)
        pos+=12+length
    assert before==after
    path.write_bytes(out)
    png_results.append({'file':path.name,'removed_text_chunks':len(removed),'idat_preserved':True})
bpy.ops.wm.open_mainfile(filepath=str(root/'portfolio.blend'))
for scene in bpy.data.scenes:
    for prop in scene.render.bl_rna.properties:
        if prop.identifier.startswith('use_stamp'): setattr(scene.render,prop.identifier,False)
    scene.render.stamp_note_text=''
    scene.render.filepath='//overview-transparent.png'
for collection in (bpy.data.images,bpy.data.libraries,bpy.data.movieclips,bpy.data.sounds,bpy.data.fonts):
    for item in collection:
        if getattr(item,'filepath','') and item.filepath!='<builtin>':
            item.filepath=bpy.path.relpath(item.filepath)
bpy.context.preferences.filepaths.save_version=0
for screen in bpy.data.screens:
    for area in screen.areas:
        for space in area.spaces:
            if space.type=='FILE_BROWSER' and space.params:
                space.params.directory=b'//'
bpy.ops.wm.save_as_mainfile(filepath=str(root/'portfolio.blend'),compress=False)
# Blender retains bytes beyond the null terminator in the saved file-browser
# directory buffer. Clear only stale personal-path strings, preserving offsets.
blend=root/'portfolio.blend'
data=blend.read_bytes()
for match in re.finditer(rb'[ -~]{8,}',data):
    if b'Users\\' in match.group() or b'/Users/' in match.group():
        data=data[:match.start()]+b'\0'*len(match.group())+data[match.end():]
assert b'Users\\' not in data and b'/Users/' not in data
blend.write_bytes(gzip.compress(data,compresslevel=9,mtime=0))
bpy.ops.wm.open_mainfile(filepath=str(blend))
assert len([o for o in bpy.data.objects if o.type=='MESH'])==json.loads((root/'assembly-manifest.json').read_text())['mesh_objects']
assert bpy.context.scene.render.filepath=='//overview-transparent.png'
assert not bpy.context.scene.render.use_stamp_filename
print(json.dumps({'pngs':png_results,'paths':list(bpy.utils.blend_paths(absolute=False))},indent=2))
