# Original conceptual cryostat hero

This replacement is an original visual illustration inspired by the multi-tier dilution-refrigerator architecture shown in [IBM's cryogenic systems article](https://www.ibm.com/quantum/blog/modular-cryogenics). It is not an IBM model, an operational cryostat design, or a claim that Raghav designed quantum hardware. No reference images, brands, textures, or labels are embedded.

## Build and validate

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --python scripts/build_sculpture.py
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --python scripts/validate_sculpture.py
```

Blender 5.2.1 LTS was used. System Python/Pillow performs format-only PNG-to-WebP conversion and mobile resizing. No Blender add-ons, downloaded assets, network services or credentials are needed. `-- --preview-pair` exports the complete model and renders assembled/exploded evidence; `-- --overview-only` renders the first composition; `-- --no-render` builds the editable source and exported asset only.

## Construction

Five circular gold thermal plates decrease in diameter down a vertical chandelier. Each has a beveled nickel rim, concentric toolpath detail, inner aperture,24 recessed perimeter fasteners and16 feedthroughs. Four levels each have32 individual curved coax lines with hex connectors/ferrules, six larger copper service loops, and six metal support rods with locking collars. An asymmetric finned refrigeration spine and six-strand copper thermal straps supply another level of structural detail. Three upper manifolds and a layered lower dark processor enclosure complete the assembly.

Geometry is actual mesh, including cables, fasteners, rims and fine connectors. Repeated hardware shares mesh datablocks and glTF mesh definitions. Unique cable meshes are joined within their animated family and material, reducing objects without changing visible geometry. GPU-instancing export remains disabled because Blender 5.2.1 produced invalid animation-node references in that mode. The validator rejects invalid child/animation node indices. Static children can be batched by the browser beneath their respective animated parent; no mesh is itself an animation target.

## Browser contract

- `public/models/portfolio.glb`, editable `assets/blender/portfolio.blend`.
- One `Story` clip runs exactly8seconds; chapter times0/2/4/6/8.
- Compatibility roots remain `outer_frame`, `middle_frame`, `inner_frame`, `core`. Beneath them, 38 `assembly_*` empties animate five plates, 16 radial cable/connector sectors, eight support clusters, three cooling-spine sections, three manifolds and three processor components.
- Each family has a local spatial pivot and staggered transform action. Plates initiate the motion; manifolds, cables, supports, cooling and processor parts follow. There are short pauses at partial and full extension, a partial-regroup phase, then staged reassembly. The Blender exporter merges active actions into the single `Story` clip rather than repeatedly baking NLA tracks.
- Poses: assembled overview; partial extension; an asymmetric constellation across the page; partial regroup; reassembly. Plates occupy distinct lateral/depth positions with modest, varied three-axis rotations. Cable sectors, supports, cooling and processor components move into individually authored irregular clusters rather than maintaining a cylinder or uniform grid. Connectors intentionally disengage during illustrative disassembly. Overview/contact preserve the original assembled geometry, verified within 0.00001 scene units.
- Blender Z maps to browser Y. Assembled bounds are approximately 3.12×5.07×3.12; full scatter is 13.58×6.65×4.70; partial regroup is 8.49×5.92×4.24. Exact conservative bounds are in `assets/blender/pose-bounds.json`. Source square-image camera direction remains `(6,5,10)`, with view heights 6.3 assembled, 8.5 partial, 14.0 scattered, 11.0 regrouped. The browser uses its own perspective choreography and full-width framing.
- `Amber signal` remains the interaction material. Standard PBR metals export directly. Studio lights are recreated by the browser rather than embedded in GLB.
- Five transparent desktop1000×1000 WebPs and mobile700×700 WebPs remain at the existing chapter filenames. Full-resolution PNG masters are in `assets/blender`.

## Evidence and archive

Final measured outputs: GLB 1,594,532 bytes; editable Blender 1,091,232 bytes; 1,105 mesh objects after cable joins; 214,356 rendered triangles. The animation has 80 channels targeting 38 subassemblies plus four compatibility roots. Overview WebP is 88,072 bytes desktop and 62,682 bytes mobile; all ten fallbacks are below 110 KB each.

`assembly-manifest.json` records the 38 families, original part membership and assembly-preservation error. `validation.json` records source reopen, fresh GLB import, source/import mesh agreement, the original 128 coax lines and five plates, clip duration, size and materials. Validation also checks all 38 families are animation targets, no static mesh is targeted, all child/animation indices are valid, and the explosion fits the agreed bounds. Four transition renders plus front/rear evidence supplement five chapter views. These checks do not certify a functional machine or constitute a collision solver.

Local-only archives (excluded from Git): the earlier nested-frame builder, source `.blend`, GLB, documentation, validator and storyboard are preserved in `assets/blender/previous-frames` in the authoring workspace. The archived builder expects its original repository-relative location if restored and rerun.

In that local workspace, the earlier four-module cryostat animation is preserved in `assets/blender/previous-four-module-animation`; the symmetric 38-family explosion is preserved in `assets/blender/previous-axial-family-animation`.

Publication metadata: all 13 current PNGs have no text chunks; their compressed pixel data was preserved byte-for-byte. Source stamp fields are disabled and render output is relative. The source was reopened after removing stale file-browser personal-path bytes and portable gzip compression. Run assets/blender/sanitize_metadata.py with Blender after rebuilding source artifacts.
