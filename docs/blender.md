# Original orbital sculpture

An original abstract sculpture for the portfolio: a heavy incomplete titanium C-yoke, three unequal swept armor segments, a split inner rotor, and a faceted graphite core with a narrow amber aperture. It is artistic geometry, with no claim of scientific function or manufactured hardware.

## Build and validate

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --python scripts/build_sculpture.py
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --python scripts/validate_sculpture.py
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --python assets/blender/sanitize_metadata.py
```

Blender 5.2.1 LTS was used. System Python/Pillow converts PNG renders to WebP and resizes the mobile variants. No downloaded assets, add-ons, API keys or external services are required. Add `-- --preview-pair` to render overview and scatter only, or `-- --no-render` to build source and GLB without images.

## Geometry and motion

The sculpture has 14 meaningful moving assemblies and 26 meshes. Curved solids have variable widths, real thickness, beveled edges and distinct depths. Sparse terminal inserts and a diagonal rear bridge provide precision details. Metallic titanium, graphite, polished silver and amber emission use export-compatible Principled materials.

One `Story` animation lasts exactly 8 seconds. Chapter times are 0, 2, 4, 6 and 8 seconds: assembled, partly open, scattered, partly regrouped, assembled. Each assembly uses its own local pivot and staggered transform action. The compatibility roots remain `outer_frame`, `middle_frame`, `inner_frame`, and `core`. All animated children have `assembly_` names. Mesh children have no animation channels, so browser batching may preserve animated parents. Blender GPU-instancing export is deliberately disabled due to invalid animation node references observed in that exporter mode.

The browser owns playback speed and camera choreography; it scrubs one clip rather than running independent autoplay. Blender Z maps to browser Y; the sculpture faces Blender negative Y / browser positive Z. Bounds in browser XYZ are 4.168 × 4.532 × 1.708 assembled and 9.227 × 7.417 × 4.110 scattered. Exact chapter bounds are in `pose-bounds.json`. The source square-render camera corresponds to browser (3,3,10), with orthographic view heights 5.8 / 6.7 / 10.8 / 8.5 / 5.8. Browser lighting is recreated separately.

## Delivered artifacts and checks

- `public/models/portfolio.glb`: 634,968 bytes; 22,648 triangles; 26 meshes; 28 animation channels.
- `assets/blender/portfolio.blend`: 491,226 bytes; editable source with complete geometry, materials, lights, camera and animation.
- `public/images/{overview,experience,projects,skills,contact}-{desktop,mobile}.webp`: five 1000-pixel desktop and five 700-pixel mobile stills. All ten are below 68 KB; overview desktop is 66,268 bytes.
- `assets/blender/*-transparent.png`, `storyboard.png`, front/rear evidence and four transition frames.
- `assembly-manifest.json`, `pose-bounds.json`, and `validation.json` record the actual asset contract and checks.

Validation reopens the source, freshly imports the GLB, checks valid node indices, verifies exact clip duration and mesh counts, samples nine transform frames, and enforces geometry and payload budgets. It does not constitute a collision solver. The prior cryostat is preserved locally in ignored `assets/blender/previous-cryostat`; earlier experiments also remain in ignored previous-* directories.

## Portable publication metadata

Render stamp fields are disabled. The source render path is relative. `sanitize_metadata.py` removes PNG text chunks while preserving compressed IDAT pixel data exactly, clears obsolete personal directory bytes from Blender file-browser state, and verifies the sanitized source reopens. Run it after regeneration. No local personal paths or historical variants belong in published assets.
