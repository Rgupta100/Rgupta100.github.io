---
name: Raghav Gupta Portfolio
description: Dark precision studio with an original orbital sculpture and readable professional evidence.
colors:
  bg: "#0d1012"
  ink: "#f1eee7"
  muted: "#b6b9bb"
  amber: "#d6a569"
  line: "#2b3236"
typography:
  display:
    fontFamily: "Manrope Variable, Manrope, sans-serif"
    fontSize: "clamp(86px,9vw,142px)"
    fontWeight: 450
    lineHeight: 0.93
    letterSpacing: "-.04em"
  headline:
    fontFamily: "Manrope Variable, Manrope, sans-serif"
    fontSize: "clamp(42px,4.6vw,72px)"
    fontWeight: 450
    lineHeight: 1.04
    letterSpacing: "-.04em"
  title:
    fontFamily: "Manrope Variable, Manrope, sans-serif"
    fontSize: "clamp(24px,2.25vw,35px)"
    fontWeight: 450
    lineHeight: 1.17
    letterSpacing: "-.025em"
  body:
    fontFamily: "Manrope Variable, Manrope, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.75
  label:
    fontFamily: "IBM Plex Mono, monospace"
    fontSize: "10px"
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
    width: "40px"
    height: "40px"
  icon-link-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.bg}"
  workflow-step:
    textColor: "{colors.muted}"
    padding: "12px 7px"
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

A centered orbital sculpture anchors the continuous graphite surface. Swept silver fins, interrupted arcs, dark inset surfaces, and a suspended faceted core provide the material character. Asymmetrical filled and outlined identity typography and alternating side columns frame the sculpture.

Professional evidence remains semantic HTML with native chapter anchors. Fine rules organize open articles; still images preserve the composition when interactive graphics are unavailable.

**Key Characteristics:**

- Centered orbital sculpture and generous negative space.
- Asymmetrical filled and outlined Manrope identity.
- Alternating evidence columns with technical mono metadata.
- Restrained amber states and a flat interface.

## Colors

Cool graphite and muted gray support warm-white typography and a single amber interface accent.

### Primary

- **Amber signal** (amber): punctuation, keyboard focus, selected workflow steps, navigation underlines, and interaction traces.

### Neutral

- **Graphite** (bg): continuous page and controls.
- **Warm white** (ink): headings, primary text, and active states.
- **Muted gray** (muted): supporting prose and metadata.
- **Divider gray** (line): evidence separators and footer.

### Named Rules

**The Signal Rule.** Amber identifies small signals and interactive emphasis; the reading surface stays graphite.

## Typography

**Display Font:** Manrope Variable, with Manrope and sans-serif fallbacks.

**Body Font:** The same Manrope stack.

**Label/Mono Font:** IBM Plex Mono, with monospace fallback.

### Hierarchy

- **Display:** The first name uses the frontmatter display role. The surname uses weight 350, transparent fill, and a one-pixel light-gray outline (#d8dad8); its amber period stays filled. At 1000–1199px the identity uses 10vw. Below 1000px it uses clamp(70px,12vw,110px), .95 line height, and opposing alignment on two lines.
- **Headline:** Chapter headings use the frontmatter headline role, 45px at 1000–1199px, and clamp(46px,9vw,66px) below 1000px.
- **Title:** Experience headings use the title role and 29px on mobile. Project headings use clamp(29px,3vw,46px), weight 450, and 1.1 line height; mobile projects use 35px. Education headings retain the base 25px treatment.
- **Body:** Base prose retains the body role. Experience bullets, project descriptions, and skill values use 15px/1.85 desktop and 16px mobile. Hero introduction uses 14px/1.85 in a 29ch column, 13px at intermediate desktop widths, and 15px/38ch mobile. Workflow explanations use 14px desktop and 15px mobile.
- **Label:** Dates and technologies use 10px mono text. Skill category labels use 19px Manrope. Compact metadata sizes are local functional treatments.

### Named Rules

**The Evidence Type Rule.** Use Manrope for readable narrative and IBM Plex Mono for compact technical metadata.

## Layout

The sculpture stays horizontally centered as the document passes around it. On desktop the filled first name sits at 14vh on the left; the outlined surname sits at 62vh on the right. Subtitle and introduction occupy a 23% left column; actions sit at 82vh on the right. The hero spans at least 105svh. Scene controls sit centrally at 85vh. The footer is hidden after the overview chapter.

Chapter headings occupy the left 25% column. Evidence begins at a 66% offset in a 34% column capped at 520px. Projects reverse the arrangement, with heading right and evidence left. Chapters have 220px top and 160px bottom padding and at least 120vh. At 1000–1199px columns adjust to 65%/35%, with a wider contact column.

Below 1000px content becomes a single reading column. Hero top padding is 120px and minimum height 1150px. The scene begins at 350px with a 460px region and 440px live canvas; the introduction has a 535px top margin. Narrow fine-pointer devices retain live rendering; narrow touch devices use stills. Chapter padding becomes 60px top and 90px bottom, with 280px stills. The existing 24px mobile gutter, 20px smallest-screen gutter, and wide-screen outer padding remain.

Manual inspection fills the viewport, hides and inerts hero copy/footer, and places controls at bottom center. Print restores document flow, makes the outlined surname solid black, and removes interactive illustration chrome.

## Elevation & Depth

The interface has no box-shadow vocabulary. Fine rules and a graphite header gradient separate content. Geometry, metallic reflections, and moving light carry sculptural depth. The scene uses a 34-degree perspective camera, ACES filmic tone mapping, exposure .95, environment intensity .55, and hemisphere intensity .15. The warm key varies from 2.5 to 3.1 and cool edge from 2.4 to 3.2; a warm point light sweeps around the sculpture. Shadow maps and mesh casting/receiving are disabled. Device pixel ratio is capped at 1.25.

### Named Rules

**The Sculptural Depth Rule.** Keep interface surfaces flat; let the original sculpture carry material depth.

## Shapes

Interrupted orbital arcs, swept fins, beveled metal edges, and a dark faceted core define the illustration. The interface uses straight dividers, unboxed text actions, circular project links, and small round signal dots. Workflow illustrations retain fine outlined geometry. These component shapes do not imply a universal card radius.

## Components

### Buttons

The primary link has an underline and a downward arrow that moves 3px on hover. Project and social text-link arrows move 2px right and up. Hero contact text brightens on hover. Circular project actions invert to warm white with graphite content. Primary actions have a 48px minimum target, standard text actions at least 44px, and project icon links are 40px squares in the orbital stylesheet.

Links and buttons use an amber 2px focus outline with 6px offset. The copy control is an unboxed 44px square with an inline SVG and live success/failure feedback. Motion state is shown as text with a left divider.

### Navigation

The fixed gradient header carries a lowercase identity mark and direct chapter anchors. Current and hovered links brighten and gain an amber underline over .25s. Mobile navigation becomes a dark dropdown, closes on activation or Escape, and remains available without JavaScript.

### Evidence lists

Experience, projects, and skills use top dividers and no card backgrounds. Experience entries have 32px top and 56px bottom padding. Skill rows stack category and value with a 10px gap at every width.

### Workflow diagrams

Fine SVG diagrams explain each project. Text buttons select one description and emphasize its diagram group, label, and underline in amber. All descriptions exist in initial HTML for no-script reading. These are illustrative explanations, not live inference displays.

### Sculpture and motion

The eight-second Blender Story clip animates 14 subassemblies. Asset validation records 26 meshes, 22,648 triangles, and 634,968 GLB bytes. These describe the current artifact, not universal design budgets. Scroll seeks the clip while the sculpture remains centered. Desktop scale reduces from 1 toward .60, or .55 at peak scatter; inspection restores scale 1. Portrait inspection recomposes family centers without stretching meshes and restores authored positions before mixer evaluation.

Camera yaw, elevation, and distance follow five interpolated shots: (.55, .30, 11.8), (.52, .12, 12.3), (.10, .20, 18), (-.62, .30, 13.4), and the opening shot again. Angles are radians. The entrance lasts 4.2 seconds; exponential frame interpolation uses a 3.5 response coefficient for slower settling.

The inspection area supports mouse dragging and arrow-key rotation. Play sequence becomes Stop sequence during 32-second playback, then Replay sequence at completion or manual stop. Scatter parts and Reassemble move to midpoint and initial pose over nine seconds using power1.inOut. Inspection fades hero copy/footer over .45 seconds and makes them hidden and inert. Return to overview, Escape, scrolling, completion, and reassembly restore reading mode.

The two outlined controls use 44px minimum targets, 11px Manrope, graphite fill, and amber hover states. Return to overview retains its local 30px minimum height. Thermal effects, scan passes, and their controls are absent from the shipped orbital scene.

Hero interaction and first contact arrival can trigger a 1.25-second emissive pulse. The fine-pointer trace fades over 850ms and click rings over 800ms. Heading reveals retain 16px movement and .8-second expo.out easing.

Motion off persists locally; system reduced motion takes precedence. Graphics failures retain still images. Playback pauses when hidden, narrow offscreen scenes skip drawing, and frames are requested only while a transition remains active. The validated asset has no GPU instance batches; the batching helper remains available without defining visual style.

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

Source basis: src/styles/global.css followed by src/styles/orbital.css, src/pages/index.astro, src/scripts/main.ts, scene.ts, camera-path.ts, and assets/blender/validation.json. Viewport evidence: .impeccable/review/orbital-overview.png and orbital-projects.png.

Not canonized: compact metadata, 40px project links, and the 30px return target are local details, not reusable reading-size or touch-target standards. Superseded cryostat, thermal, and scan treatments are excluded from this orbital system.

