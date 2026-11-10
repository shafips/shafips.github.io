// The animated background. A plain script: uses window.Scrollstage (js/lib/scrollstage.js) and the
// background image as a data URL (js/bg-image.js), so WebGL can use it when the page is opened from
// disk. The other three.js scenes are js/dotwave.js (the dot waves) and js/gallery.js (the image ring).
(() => {
const { Stage, BlobGradient, WaveImage } = window.Scrollstage;
const backgroundImage = window.AQARI_BG_IMAGE;

/* ---------- animated background ----------
   Large, fully blurred colour blobs drift slowly over the background image and through each
   other (colours taken from the reference video), and the image waves beneath them: the waves
   follow the blobs as they move, the rest of the image stays still. The blobs are see-through,
   so the image is always visible. Nothing follows the cursor. Skipped when reduced motion is
   preferred or WebGL isn't available: the plain CSS image shows on its own. */
const canvas = document.getElementById('bgCosmic');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

if (canvas && !reduceMotion) {
  try {
    // The page is laid out at Full HD and zoomed to fit the screen (css/style.css), so the canvas's
    // CSS size is in Full HD pixels. Draw at the screen's real resolution instead: the zoom factor
    // (the same one index.html sets) times the device pixel ratio (capped at 1.5, as before).
    const canvasRatio = () => {
      const zoom = Math.min(innerWidth / 1920, innerHeight / 1080);
      const r = zoom * Math.min(1.5, window.devicePixelRatio || 1);
      return [r, r];
    };
    const stage = new Stage({
      canvas,
      fullscreen: false,      // sized by CSS: the rounded background panel
      antialias: false,
      dpr: canvasRatio(),
    });
    addEventListener('resize', () => { stage.dpr = canvasRatio(); stage.resize(); });

    // the colour blobs (drawn over the image)
    const blobs = new BlobGradient({
      order: -1,              // moves first, so the waves below follow this frame's positions
      base: null,             // no base colour: just the blobs, over the background image
      opacity: 0.3,           // a light tint: the image shows clearly through the blobs
      blobs: [                                          // later blobs drift over earlier ones
        { color: '#a9b4bd', size: 0.32 },               // grey blue
        { color: '#c9d7a9', size: 0.33 },               // pale yellow green
        { color: '#129fa8', size: 0.36 },               // teal
        { color: '#46608a', size: 0.27, strength: 0.9 },// navy
        { color: '#f6f6dc', size: 0.22 },               // cream white
      ],
      speed: 2.6,             // overall pace
      travel: 0.72,           // how far the blobs roam (0.5 = to the edges): right round the whole slide
      softness: 1,            // > 1 = softer, wider blobs
      seed: 5,                // change for different paths
    });

    // the background image, waving beneath the blobs as they move
    stage.add(new WaveImage({
      src: backgroundImage,
      amplitude: 0.008,       // how far the waves bend the image
      speed: 0.8,             // how fast the waves run
      sheen: 0.12,            // light / shade on the wave slopes
      pointer: 0,             // no cursor effect
      focus: () => blobs.positions,
      focusSpread: 2.4,       // the waves fade out at 2.4x a blob's radius: the whole slide moves
      onReady: () => canvas.classList.add('is-ready'),
    }));
    stage.add(blobs);

    stage.start();
  } catch (err) {
    console.warn('Animated background unavailable, showing the image only.', err);
  }
}
})();
