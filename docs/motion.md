# Orbital sculpture sequence

The original Blender sculpture anchors the center of the page. Fourteen unequal assemblies form a titanium yoke, swept armor fins, a split rotor and a suspended faceted core. Content alternates around the sculpture on desktop; mobile gives it a dedicated hero area.

One controller owns the eight-second Story clip. Native scrolling uses wider transition intervals with chapter holds. Play sequence traverses the story over 32 seconds; manual scatter takes nine seconds. A 4.2-second camera reveal establishes depth. Drag and arrow keys change the viewpoint. The thermal and scan effects are removed.

Rendering is on demand, pauses when hidden, and uses no real-time shadows. Device pixel ratio is capped at 1.25. The model has 26 meshes and 22,648 triangles; the observed desktop render uses 26 draw calls. These are workload measurements, not a frame-rate guarantee.

Touch-only narrow devices and reduced motion use rendered fallbacks. Portrait manual inspection repositions assembly centers while retaining mesh proportions. Reading content remains semantic HTML and direct chapter links work without waiting for animation.
