// Dot wave (the last page, and the visitor journey): a cinematic ocean surface of about 147,000 dots seen in perspective. three.js
// draws it on the page's <canvas class="slide-wave">. A shader moves every dot by six Gerstner waves
// (the standard model of ocean swell): a long hero swell and five shorter ones from slightly
// different angles. Crests darken to navy, a band of light sweeps across, near dots blur into
// bokeh, the distance fades into haze, and the camera drifts slowly. A plain script: uses the global
// THREE (js/lib/three.min.js).
//
// Each canvas renders only while its page is showing (and while it fades out), and draws one still
// frame when reduced motion is preferred.
(() => {

// every <canvas class="slide-wave">: the closing page's, and the band across the visitor journey
for (const canvas of document.querySelectorAll('.slide-wave')) {
  try {
    startDotWave(canvas);
  } catch (err) {
    console.warn('Dot wave unavailable.', err);
  }
}

function startDotWave(canvas) {
  const page = canvas.closest('.slide');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  // ---- look and motion ----
  const COLS = 640;            // dots across
  const ROWS = 229;            // dots from near to far          (146,560 dots in all)
  const FRONT = 3.0;           // z of the front row: below the bottom of the picture, with room to spare
  const SPACING = 0.092;       // distance between dots (world units)
  const DOT_SIZE = 2.0;        // dot size 5 world units from the camera (Full HD px)
  const TROUGH = new THREE.Color('#8d99a3');   // light grey in the troughs ...
  const CREST = new THREE.Color('#2e4a6e');    // ... deep navy on the crests
  const OPACITY = 0.55;          // lighter per dot: there are many more of them
  const KEEP_DRAWING = 1500;   // ms to keep drawing after the page is left, while it fades out

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  const CAMERA_HOME = new THREE.Vector3(0, 1.8, 5.0);   // low over the water, so the swells stand out
  const LOOK_AT = new THREE.Vector3(0, 0, -5);
  camera.position.copy(CAMERA_HOME);
  camera.lookAt(LOOK_AT);

  // the grid, on the ground plane (x across, z away from the camera)
  const positions = new Float32Array(COLS * ROWS * 3);
  const width = (COLS - 1) * SPACING, depth = (ROWS - 1) * SPACING;
  let i = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      positions[i++] = c * SPACING - width / 2;
      positions[i++] = 0;
      positions[i++] = FRONT - r * SPACING;  // from below the bottom of the picture to far away
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uSize: { value: DOT_SIZE },
      uScale: { value: 1 },          // screen pixels per Full HD pixel
      uTrough: { value: TROUGH },
      uCrest: { value: CREST },
      uOpacity: { value: OPACITY },
      uHalfWidth: { value: width / 2 },
      uNear: { value: FRONT },
      uFar: { value: FRONT - depth },
    },
    vertexShader: /* glsl */ `
      uniform float uTime, uSize, uScale, uHalfWidth, uNear, uFar;
      varying float vAlpha, vCrest, vSoft;
      #define FRONT_Z uNear

      // One Gerstner wave: the model for real ocean swell. Each point of the surface moves in a
      // small circle rather than straight up and down, which gives sharp crests and broad, flat
      // troughs. wave = (direction x, direction z, steepness 0..1, wavelength); it travels at the
      // speed of a deep-water wave of that length (longer swells are faster), slowed for a calm sea.
      vec3 gerstner(vec4 wave, vec2 xz, float t) {
        vec2 d = normalize(wave.xy);
        float k = 6.28318 / wave.w;
        float speed = sqrt(9.8 / k) * 0.34;
        float f = k * (dot(d, xz) - speed * t);
        float a = wave.z / k;
        return vec3(d.x * a * cos(f), a * sin(f), d.y * a * cos(f));
      }

      void main() {
        vec3 p = position;
        // a long, slow hero swell, then five shorter swells from slightly different angles
        vec3 o = gerstner(vec4( 0.10, 1.0, 0.22, 12.0), p.xz, uTime)
               + gerstner(vec4( 0.00, 1.0, 0.17, 7.5), p.xz, uTime)
               + gerstner(vec4( 0.35, 1.0, 0.14, 4.6), p.xz, uTime)
               + gerstner(vec4(-0.45, 1.0, 0.13, 3.3), p.xz, uTime)
               + gerstner(vec4( 0.20, 1.0, 0.09, 2.0), p.xz, uTime)
               + gerstner(vec4(-0.25, 1.0, 0.06, 1.3), p.xz, uTime);
        // taller swells (heights only, so the surface never folds over), calming towards the
        // horizon: full height in the near water, down to 15% from 12 units out, so the waves at
        // the back stay low and flat instead of rising up towards the text
        float calm = mix(0.15, 1.0, smoothstep(-12.0, -3.0, position.z));
        o.y *= 2.4 * calm;
        // and still at the front: the swell (up-down and back-forth) fades out over the front rows,
        // so the front edge of the surface stays flat and low, below the picture, and its
        // underside never shows
        o *= smoothstep(FRONT_Z, FRONT_Z - 2.5, position.z);
        p += o;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;

        // perspective size, plus depth of field: dots close to the camera grow and go soft
        // (bokeh), far dots stay small and sharp; below 1px a dot fades instead of shrinking
        float dist = -mv.z;
        float bokeh = 1.0 - smoothstep(2.5, 5.5, dist);
        float size = uSize * uScale * 5.0 / dist * (1.0 + 1.8 * bokeh);
        gl_PointSize = max(size, 1.0);
        vSoft = bokeh;

        // crests: height of the swell; a broad band of light sweeps slowly across the water
        float crest = clamp(o.y * 0.55 + 0.45, 0.0, 1.0);
        float sweep = 0.5 + 0.5 * sin(position.x * 0.11 - uTime * 0.22);
        vCrest = crest;

        // fade into the haze of the distance and out at the sides
        float haze = smoothstep(uFar, uNear - 6.0, position.z);
        float sides = 1.0 - smoothstep(uHalfWidth * 0.7, uHalfWidth, abs(position.x));
        float tiny = clamp(size, 0.0, 1.0);
        vAlpha = haze * sides * tiny * (0.45 + 0.55 * crest) * (0.7 + 0.45 * sweep)
               * (1.0 - 0.55 * bokeh);      // soft near dots are lighter, as out-of-focus light is
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uTrough, uCrest;
      uniform float uOpacity;
      varying float vAlpha, vCrest, vSoft;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float edge = smoothstep(0.5, mix(0.32, 0.0, vSoft), d);   // sharp dot, or soft bokeh disc
        gl_FragColor = vec4(mix(uTrough, uCrest, vCrest), uOpacity * vAlpha * edge);
      }
    `,
  });
  scene.add(new THREE.Points(geometry, material));

  // the page is laid out at 1920 x 1080 and zoomed to fit the screen (css/style.css): draw at the
  // pixels the canvas really covers on screen
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    const zoom = Math.min(innerWidth / 1920, innerHeight / 1080);
    const ratio = zoom * Math.min(1.5, window.devicePixelRatio || 1);
    renderer.setPixelRatio(ratio);
    renderer.setSize(w, h, false);
    material.uniforms.uScale.value = ratio;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  const render = (t) => {
    material.uniforms.uTime.value = t;
    // a slow drift, like a camera on a dolly: a little sideways, a little up and down
    camera.position.set(
      CAMERA_HOME.x + Math.sin(t * 0.045) * 0.7,
      CAMERA_HOME.y + Math.sin(t * 0.07 + 1.3) * 0.12,
      CAMERA_HOME.z,
    );
    camera.lookAt(LOOK_AT);
    renderer.render(scene, camera);
  };

  let lastActive = -Infinity;
  function frame(now) {
    requestAnimationFrame(frame);
    if (page.classList.contains('is-active')) lastActive = now;
    else if (now - lastActive > KEEP_DRAWING) return;   // off screen: nothing to do
    render(now / 1000);
  }

  resize();
  addEventListener('resize', () => { resize(); if (reduceMotion.matches) render(0); });
  if (reduceMotion.matches) render(0);
  else requestAnimationFrame(frame);
}
})();
