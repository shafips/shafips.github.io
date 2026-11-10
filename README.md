# Aqari Platform presentation

Plain HTML, CSS and JavaScript. You don't need a build step or Node. To open it, double-click
`index.html` (it works straight from disk) or serve the folder with any web server. The page is laid
out at 1920 × 1080 and scales to fit the screen.

```
index.html            the slides
css/style.css         page frame, header, fonts
css/slides.css        slides, animations
js/slides.js          paging: one scroll / swipe / key press = one step
js/lib/three.min.js   three.js r160 (window.THREE)
js/lib/scrollstage.js 3D components: Stage, ClothRing, BlobGradient, WaveImage (window.Scrollstage)
js/whenactive.js      watchSlide(): run a scene only while its slide shows
js/bg-image.js        the background image as a data URL (for WebGL from disk)
js/ring-images.js     the page 2 ring photos as data URLs (same reason)
js/main.js            animated background
js/dotwave.js         dot wave, on any <canvas class="slide-wave">
js/gallery.js         3D image ring, on <canvas class="gallery-canvas">
images/, fonts/
```

## Reusing the animations in a new presentation

Each slide is a `<section class="slide">` inside `<main class="slides">`. All the animations below
are switched on by classes and attributes, not by per-slide code. A new slide that uses the same
classes gets the same motion.

| What | How |
| --- | --- |
| Entrance (fade, rise, un-blur) | add `data-anim` to any element; stagger with `style="--i: 2"` |
| Steps inside a slide | `data-steps="4"` on the slide; `data-step-item="0..3"` on the parts. The current one gets `.is-current`, earlier ones `.is-past`; `--step` is set on the slide |
| Section tabs | `<a href="#page-n" data-section="name">` in `.section-nav`; slides with the same `data-section` light that tab |
| Floating | add the element's class to the `:is(...)` list at the end of `css/slides.css`; tune with `--fy` (height), `--fx` (sway), `--fd` (duration), `--fdel` (delay) |
| Line that draws itself | `<path class="intro-orbit-line" pathLength="1" d="...">` inside an `<svg class="intro-orbit">` |
| Big outlined number | `<svg class="big-num">` with `<g data-step-item="n"><path pathLength="1" ...>`; the outline draws on its step |
| Title wipe | `<h2 class="sec-title"><img class="sec-title-img" src="..."></h2>` |
| Glass card with sheen | `.intro-card` with a `<span class="intro-shine">` inside |
| Dot wave | `<canvas class="slide-wave">` in any slide (add `slide-wave--band` for a band) |
| 3D image ring | `<canvas class="gallery-canvas">`; images in `js/ring-images.js`, ring settings in `js/gallery.js` |
| Animated background | automatic; colours, pace and reach in `js/main.js` |

Jump to a slide or step with the address: `index.html#page-5/3` opens page 5 at step 3.
Reduced-motion settings are respected throughout.
