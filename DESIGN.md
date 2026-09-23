---
name: Raghav Gupta Portfolio
description: Dark precision studio with an original computing sculpture and readable professional evidence.
colors:
  bg: "#101112"
  ink: "#eeeae2"
  muted: "#b2b0aa"
  amber: "#d6a569"
  line: "#303234"
typography:
  display:
    fontFamily: "Manrope Variable, Manrope, sans-serif"
    fontSize: "clamp(90px,10.3vw,152px)"
    fontWeight: 500
    lineHeight: 0.96
    letterSpacing: "-.04em"
  headline:
    fontFamily: "Manrope Variable, Manrope, sans-serif"
    fontSize: "clamp(44px,5.6vw,80px)"
    fontWeight: 500
    lineHeight: 1.08
    letterSpacing: "-.04em"
  title:
    fontFamily: "Manrope Variable, Manrope, sans-serif"
    fontSize: "25px"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "-.025em"
  body:
    fontFamily: "Manrope Variable, Manrope, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.75
  label:
    fontFamily: "IBM Plex Mono, monospace"
    fontSize: "11px"
    fontWeight: 400
rounded:
  round: "50%"
spacing:
  gutter: "clamp(24px,5vw,88px)"
  compact: "12px"
  medium: "24px"
  section: "32px"
components:
  primary-link:
    textColor: "{colors.ink}"
    padding: "0 0 7px"
  text-link:
    textColor: "{colors.ink}"
  contact-link:
    textColor: "{colors.muted}"
    padding: "0 0 7px"
  icon-link:
    textColor: "{colors.ink}"
    rounded: "{rounded.round}"
    width: "48px"
    height: "48px"
  icon-link-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.bg}"
  workflow-step:
    textColor: "{colors.muted}"
    padding: "12px 10px"
  workflow-step-selected:
    textColor: "{colors.amber}"
  navigation-link:
    textColor: "{colors.muted}"
  model-control:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink}"
    padding: "10px 15px"
  navigation-link-current:
    textColor: "{colors.ink}"
---

# Design System: Raghav Gupta Portfolio

## Overview

**Creative North Star: "Dark precision studio"**

The approved studio world lands as a continuous graphite surface, warm-white Manrope typography, restrained amber signals, and an original quantum-computer-inspired cryostat sculpture with five gold/copper plates, nickel-colored cables, silver hardware and a graphite processor enclosure. The interface is open and spare; fine rules organize professional evidence without enclosing it in cards.

Physical depth belongs to the sculpture. Text remains ordinary semantic HTML above it, with native anchors connecting the five chapters. Typography and content remain useful when the interactive scene is unavailable.

**Key Characteristics:**

- Continuous dark surface and generous space.
- Warm typography with compact technical metadata.
- Fine dividers and restrained amber states.
- Sculptural depth with a flat interface.

## Colors

The palette pairs warm neutrals with a single amber interface accent.

### Primary

- **Amber signal** (`amber`): punctuation, focus outlines, selected workflow steps, navigation underlines, selection, and interaction traces.

### Neutral

- **Graphite** (`bg`): page, diagram fills, and mobile navigation surface.
- **Warm white** (`ink`): headings, primary text, and prominent interactive states.
- **Muted warm gray** (`muted`): supporting prose, metadata, and resting navigation.
- **Divider gray** (`line`): chapter entries, skill rows, footer, and contact separators.

### Named Rules

**The Signal Rule.** Amber identifies small signals and interactive emphasis; the reading surface stays graphite.

## Typography

**Display Font:** Manrope Variable, with Manrope and sans-serif fallbacks.

**Body Font:** The same Manrope stack.

**Label/Mono Font:** IBM Plex Mono, with monospace fallback.

Manrope gives identity and headings broad, quiet forms. Mono text identifies dates, technologies, and diagram annotations. The actual scale is role based, not a fixed mathematical ratio.

### Hierarchy

- **Display:** The frontmatter display role is the desktop identity. At widths up to 1100px it becomes 11vw; up to 999px it uses `clamp(76px,14vw,110px)` with .98 line height.
- **Headline:** The frontmatter headline role introduces chapters. Mobile chapters use 48px, or 43px up to 380px.
- **Title:** Experience and education headings use the title role. Project headings use `clamp(29px,3vw,42px)` with 1.22 line height; mobile projects use 32px.
- **Body:** General prose uses the body role, with a 70ch paragraph maximum. Hero prose is 17px on desktop and 16px below 1100px. Workflow explanations, skill descriptions, and contact availability use 16px through the final cascade.
- **Label:** Dates and technology lists use the mono label role. Navigation and actions use Manrope, generally 13–14px. These compact functional labels are not a display treatment.

### Named Rules

**The Evidence Type Rule.** Use Manrope for readable narrative and IBM Plex Mono for compact technical metadata.

## Layout

The fluid gutter is defined in frontmatter. Desktop identity occupies 46% of the content width; the sculpture occupies the right side. Subsequent chapter content starts at a 39% left offset and caps at 850px. The sculpture moves left and reduces in size across the first chapter transition. Chapters use 150px top and 110px bottom padding; the hero fills at least one small viewport height.

Up to 1100px the content offset reduces to 35%, chapter top padding to 120px, and skill rows become one column. At 999px and below the gutter becomes 24px, the fixed header becomes 80px high, content loses the left offset, and chapter padding becomes 35px top and 75px bottom. Identity, a 460px scene region, introduction, and actions stack vertically. The live canvas is 420px high; narrow fine-pointer devices retain the interactive scene, while narrow touch devices use the poster. Hero minimum height is 1100px and the introduction has a 490px top margin. Each later chapter has a 300px still above its content. At 380px and below the gutter becomes 20px. At 1700px and above outer padding keeps the composition within a 1580px span.

The spacing rhythm comes from repeated 12px, 24px, and 32px separations, with larger chapter breathing room. It is not an enforced global spacing scale. Skill rows are divided lists; experience and projects are open articles.

Print removes the scene and interactive chrome, switches to a light page, and makes content full width.

## Elevation & Depth

The interface has no box-shadow vocabulary. One-pixel borders and a dark header gradient separate content. Stacked metallic stages, organized cable routing and a lower enclosure provide depth through modeled surfaces, environment reflections, moving light, and hardware shadows. The interactive scene uses a 34-degree perspective camera, ACES filmic tone mapping, exposure .86, environment intensity .42, and hemisphere intensity .15. Across assembly progress, the warm key varies from 2.5 to 3.1 and the cool edge from 2.4 to 3.2; a warm point light sweeps around the assembly. Hardware receives soft shadows, but the ground shadow plane is explicitly hidden in current source.

### Named Rules

**The Sculptural Depth Rule.** Keep interface surfaces flat; let the original sculpture carry material depth.

## Shapes

The interface uses straight divider lines, unboxed text actions, circular project icon links, and small round signal dots. The illustration uses machined circular thermal stages, fine cable curves, support rods and connector hardware. Workflow SVGs use outlined rectangles with small corners and fine line drawings. These rounded shapes belong to their actual components; they do not imply a universal card radius.

## Components

### Buttons

Actions are quiet and text led. The primary link has an underline and downward arrow; its arrow moves down 3px on hover. Secondary project and social text links move the arrow 2px right and 2px up. The hero contact action uses muted text that brightens on hover. Circular project links invert to warm white with graphite content on hover. Primary and circular actions provide 48px targets; standard text actions provide at least 44px.

All links and buttons use an amber 2px focus outline with 6px offset. The copy control is an unboxed 44px square with an inline SVG and a live status message for success or failure. The motion control uses text, a left divider, and an operating-system-disabled state; JavaScript replaces its initial dot markup with the current text label.

### Navigation

The fixed header uses a graphite-to-transparent gradient, a lowercase identity mark, and direct chapter anchors. Resting labels are muted; current and hovered links brighten and gain a thin amber underline over .25s. Mobile navigation is a full-width dark dropdown controlled by Menu, closes on link activation or Escape, and remains available without JavaScript through the provided fallback styling.

### Evidence lists

Experience entries, project articles, and skills use top dividers instead of card backgrounds. Experience entries use 32px top and 44px bottom padding. Skill rows align labels and values in a 36%/remaining-width grid on wide screens and stack at the intermediate breakpoint.

### Workflow diagrams

Fine SVG line diagrams explain the project flow. Text buttons select a step, expose one description, and apply amber to the selected label, underline, and relevant diagram group. The initial HTML contains all descriptions for the no-script case. The diagrams are illustrative explanations, not live inference displays.

### Sculpture and motion

The Blender-authored eight-second Story clip animates 38 assembly families. Native scroll maps chapter progress across that clip. Camera yaw, elevation, and distance follow five smoothly interpolated shots: (.48, .23, 12.4), (1.12, .10, 12.8), (.22, .20, 19.5), (-.58, .49, 14.6), and the opening shot again (angles in radians). A 1.8-second entrance introduces an azimuth sweep and distance change. During reading, desktop placement moves from right to left and reduces the sculpture, with extra reduction at the scattered pose. Manual inspection centers the scene at full scale; narrow scenes stay centered. The scattered pose distributes 38 families into an irregular constellation, with authored bounds approximately 13.585 by 6.646 by 4.703 scene units. Portrait inspection compresses family-center positions horizontally and expands them vertically without stretching meshes. Authored positions are restored before each animation-mixer evaluation.

The hero inspection area supports mouse dragging and arrow-key rotation. It uses a grab/grabbing cursor and a dedicated inset amber focus outline. Play sequence becomes Stop sequence during an 18-second full playback, then Replay sequence at completion or manual stop. Scatter parts reaches the scattered midpoint over 4.8 seconds; Reassemble returns to the initial pose over 4.8 seconds, both with power1.inOut easing. These actions open a full-viewport inspection composition. Hero copy and footer fade over .45 seconds, become hidden and inert, and the controls move to the bottom center. Return to overview, Escape, or scrolling restores the reading composition and native chapter progress; sequence completion and reassembly also leave inspection mode.

Controls use graphite backgrounds, warm-white text, amber border/text hover states, and 44px minimum targets. Thermal view is a pressed-state toggle with a pale blue border/text treatment. The square Scan surface button uses an inline SVG. The smaller Return to overview action has a 30px minimum height in current source; that local exception is not a new target-size standard.

### Surface effects

The thermal study blends a world-position-based false-color shader from deep violet and blue through red and orange to pale yellow, with contour bands and edge shading. It is explicitly illustrative, not measured temperature data. A compact Cooler/Warmer legend appears when the thermal blend is visible. This effect palette belongs to the sculpture and legend; the interface retains its amber accent.

Story progress automatically introduces thermal coloring around progress .85 and an edge-lit cyan inspection pass around progress 3. Thermal view overrides the automatic heat blend. Scan surface, thermal toggling, and pulse events trigger a 2.6-second cyan scan from above to below the model, with a temporary dark, blue-rimmed inspection material and fine horizontal bands. Returning to reading clears the manual thermal override and resumes the automatic story effects.

Fine-pointer movement also adds a small camera offset. Hero art clicks send a 1.25-second emissive pulse; the first arrival at contact progress 3.99 or later sends one completion pulse when motion is enabled. The amber right-angle trace fades over 850ms and click rings over 800ms. Heading reveals retain their 16px, .8-second expo.out arrival.

Motion off persists locally, operating-system reduced motion takes precedence, and failed graphics retain rendered images. Live rendering is eligible at desktop widths or with a fine hover pointer; narrow touch devices use stills. Manual animation pauses while the document is hidden, and narrow offscreen scenes skip drawing. Rendering continues only while an entrance, pulse, scan, thermal blend, focus transition, camera interpolation, or assembly change needs frames. Repeated static hardware is instanced within its parent while animated families and their transforms survive; this optimization does not alter the visual choreography.

## Do's and Don'ts

### Do:

- **Do** keep the continuous graphite surface and warm readable text.
- **Do** use amber for small signals, selected states, and visible keyboard focus.
- **Do** use real text and native anchors independently of the sculpture.
- **Do** preserve still-image and reduced-motion paths when extending the scene.

### Don't:

- **Don't** introduce interface drop shadows as a substitute for sculptural depth.
- **Don't** turn the open evidence lists into a generic card grid.
- **Don't** require motion or WebGL to read the portfolio or reach its links.

Source basis: `src/styles/global.css`, `src/pages/index.astro`, `src/scripts/main.ts`, `src/scripts/scene.ts`, `src/scripts/camera-path.ts`, `src/scripts/surface-effects.ts`, `src/scripts/batch-hardware.ts`, `scripts/build_sculpture.py`, `PRODUCT.md`, and `docs/direction.md`. Viewport evidence: `.impeccable/review/scatter-desktop.png` and `.impeccable/review/thermal-desktop.png`; full-page stitched captures were excluded.

Not canonized: small diagram annotations and footer metadata are local implementation details, not a reusable reading-size rule; no synthetic color ramps or unused CSS variables are promoted into tokens. Ground shadows visible in earlier motion captures are not canonized because current source hides the ground plane. The compact return target is not a general accessibility rule. Final portrait capture and render parity belong to the separate finish review rather than being inferred from source.





