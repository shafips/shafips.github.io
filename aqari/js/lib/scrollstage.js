/* scrollstage (the parts this page uses: Stage, ClothRing, BlobGradient, WaveImage) as a plain script: window.Scrollstage. Needs js/lib/three.min.js first. */
var Scrollstage = (() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod2) => function __require() {
    try {
      return mod2 || (0, cb[__getOwnPropNames(cb)[0]])((mod2 = { exports: {} }).exports, mod2), mod2.exports;
    } catch (e) {
      throw mod2 = 0, e;
    }
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod2, isNodeMode, target) => (target = mod2 != null ? __create(__getProtoOf(mod2)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod2 || !mod2.__esModule ? __defProp(target, "default", { value: mod2, enumerable: true }) : target,
    mod2
  ));
  var __toCommonJS = (mod2) => __copyProps(__defProp({}, "__esModule", { value: true }), mod2);

  // three-global:three
  var require_three = __commonJS({
    "three-global:three"(exports, module) {
      module.exports = window.THREE;
    }
  });

  // <stdin>
  var stdin_exports = {};
  __export(stdin_exports, {
    BlobGradient: () => BlobGradient,
    ClothRing: () => ClothRing,
    Stage: () => Stage,
    WaveImage: () => WaveImage
  });

  // vendor/scrollstage/src/Stage.js
  var THREE = __toESM(require_three(), 1);

  // vendor/scrollstage/src/math.js
  var clamp01 = (v) => Math.min(1, Math.max(0, v));
  var lerp = (a, b, t) => a + (b - a) * t;
  var invLerp = (a, b, v) => a === b ? 0 : (v - a) / (b - a);
  var mod = (n, m) => (n % m + m) % m;
  var range = (p, a, b) => clamp01(invLerp(a, b, p));
  var smoothstep = (a, b, x) => {
    const t = clamp01((x - a) / (b - a));
    return t * t * (3 - 2 * t);
  };
  var softLimit = (x, max) => max * Math.tanh(x / max);
  var hash1 = (n) => {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  var noise1 = (x) => {
    const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    return (hash1(i) * (1 - u) + hash1(i + 1) * u) * 2 - 1;
  };
  function rng(seed = 1) {
    let a = seed >>> 0;
    return () => {
      a = a + 1831565813 >>> 0;
      let t = a;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function springStep(s, to, k, c, dt) {
    s.v += (k * (to - s.x) - c * s.v) * dt;
    s.x += s.v * dt;
  }
  var critical = (k, ratio = 1) => 2 * Math.sqrt(k) * ratio;
  var c1 = 1.70158;
  var c3 = c1 + 1;

  // vendor/scrollstage/src/ScrollTimeline.js
  var $el = (t) => typeof t === "string" ? document.querySelector(t) : t;
  var ScrollTimeline = class {
    constructor({ sections = [], track = null, offset = null, smooth = 10, reducedMotion = null } = {}) {
      this.track = track ? $el(track) : null;
      this.offsetOption = offset;
      this.smooth = smooth;
      this.reducedMotion = reducedMotion ?? matchMedia("(prefers-reduced-motion: reduce)").matches;
      this.sections = sections.map((s, i) => {
        if (!s.name) throw new Error(`[scrollstage] section #${i} needs a name`);
        if (s.length == null && !s.el) throw new Error(`[scrollstage] section "${s.name}" needs a length or an el`);
        return { start: 1, end: 0, ...s, from: 0, to: 0, state: "before" };
      });
      this.byName = new Map(this.sections.map((s) => [s.name, s]));
      if (this.byName.size !== this.sections.length) throw new Error("[scrollstage] section names must be unique");
      this.nativeY = window.scrollY;
      this.y = this.nativeY;
      this.velocity = 0;
      this.direction = 1;
      this.maxScroll = 1;
      this.measure = this.measure.bind(this);
      this.onScroll = () => {
        this.nativeY = window.scrollY;
      };
      window.addEventListener("scroll", this.onScroll, { passive: true });
      window.addEventListener("load", this.measure);
      document.fonts?.ready.then(this.measure);
      if ("ResizeObserver" in window) {
        this.ro = new ResizeObserver(() => this.measure());
        this.ro.observe(document.body);
      }
      this.measure();
      this.update(0);
    }
    /** Recomputes every section's pixel range. Called on resize and layout changes. */
    measure() {
      const vh = window.innerHeight;
      const toPx = (len) => {
        if (typeof len === "number") return len;
        const m = /^(-?[\d.]+)\s*(px|vh)?$/.exec(String(len).trim());
        if (!m) throw new Error(`[scrollstage] bad section length "${len}" (use a number, "800px" or "120vh")`);
        return Number(m[1]) * (m[2] === "vh" ? vh / 100 : 1);
      };
      const docTop = (el) => el.getBoundingClientRect().top + window.scrollY;
      let cursor = this.offsetOption ?? (this.track ? docTop(this.track) : 0);
      const trackStart = cursor;
      let hasLength = false;
      for (const s of this.sections) {
        if (s.el) {
          const el = $el(s.el);
          if (!el) {
            console.warn(`[scrollstage] section "${s.name}": element ${s.el} not found`);
            continue;
          }
          const r = el.getBoundingClientRect();
          const top = r.top + window.scrollY;
          s.from = top - s.start * vh;
          s.to = top + r.height - s.end * vh;
        } else {
          hasLength = true;
          s.from = cursor;
          s.to = cursor + toPx(s.length);
          cursor = s.to;
        }
      }
      if (this.track && hasLength) {
        const h = `${Math.ceil(cursor - trackStart + vh)}px`;
        if (this.track.style.height !== h) this.track.style.height = h;
      }
      this.maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);
    }
    /** Advances the smoothing; the Stage calls this once per frame. */
    update(dt) {
      const prev = this.y;
      const target = this.nativeY;
      if (this.reducedMotion || !this.smooth || dt === 0) this.y = target;
      else {
        this.y += (target - this.y) * (1 - Math.exp(-this.smooth * dt));
        if (Math.abs(target - this.y) < 0.05) this.y = target;
      }
      if (dt > 0) {
        const v = (this.y - prev) / dt;
        this.velocity += (v - this.velocity) * (1 - Math.exp(-12 * dt));
        if (Math.abs(this.velocity) < 0.5 && this.y === target) this.velocity = 0;
      }
      if (this.y !== prev) this.direction = this.y > prev ? 1 : -1;
      for (const s of this.sections) {
        const p = this.progressOf(s);
        const state = p <= 0 ? "before" : p >= 1 ? "after" : "active";
        if (state !== s.state) {
          if (this.ready) {
            if (s.state !== "active") s.onEnter?.(this.direction);
            if (state !== "active") s.onLeave?.(this.direction);
          }
          s.state = state;
        }
        if (s.onUpdate && p !== s.lastP) s.onUpdate(p);
        s.lastP = p;
      }
      this.ready = true;
    }
    progressOf(s, smoothed = true) {
      const y = smoothed ? this.y : this.nativeY;
      return s.to === s.from ? y >= s.to ? 1 : 0 : clamp01((y - s.from) / (s.to - s.from));
    }
    /**
     * Progress 0..1 of a named section; with no name, of the whole page.
     * Pass { smoothed: false } to read the raw scroll.
     */
    progress(name, { smoothed = true } = {}) {
      if (name == null) return clamp01((smoothed ? this.y : this.nativeY) / this.maxScroll);
      const s = this.byName.get(name);
      if (!s) throw new Error(`[scrollstage] no section "${name}". Sections: ${[...this.byName.keys()].join(", ") || "(none)"}`);
      return this.progressOf(s, smoothed);
    }
    /** True while the smoothed scroll is inside the section. */
    isActive(name) {
      const p = this.progress(name);
      return p > 0 && p < 1;
    }
    /** { from, to } in document pixels. */
    section(name) {
      const s = this.byName.get(name);
      return s ? { from: s.from, to: s.to } : null;
    }
    /** Scrolls the page to `at` (0..1) of a section. */
    scrollTo(name, at = 0, { behavior } = {}) {
      const s = this.byName.get(name);
      if (!s) return;
      window.scrollTo({
        top: s.from + (s.to - s.from) * at,
        behavior: behavior ?? (this.reducedMotion ? "auto" : "smooth")
      });
    }
    dispose() {
      window.removeEventListener("scroll", this.onScroll);
      window.removeEventListener("load", this.measure);
      this.ro?.disconnect();
    }
  };

  // vendor/scrollstage/src/Pointer.js
  var Pointer = class {
    constructor({ smooth = 8 } = {}) {
      this.smooth = smooth;
      this.x = 0;
      this.y = 0;
      this.sx = 0;
      this.sy = 0;
      this.vx = 0;
      this.vy = 0;
      this.clientX = -1;
      this.clientY = -1;
      this.inside = false;
      this.down = false;
      this.moved = false;
      this.onMove = (e) => {
        this.clientX = e.clientX;
        this.clientY = e.clientY;
        this.x = e.clientX / window.innerWidth * 2 - 1;
        this.y = -(e.clientY / window.innerHeight) * 2 + 1;
        this.inside = true;
        this.moved = true;
      };
      this.onDown = (e) => {
        this.onMove(e);
        this.down = true;
      };
      this.onUp = () => {
        this.down = false;
      };
      this.onLeave = (e) => {
        if (!e.relatedTarget) this.inside = false;
      };
      this.onTouchEnd = (e) => {
        if (e.pointerType !== "mouse") this.inside = false;
      };
      window.addEventListener("pointermove", this.onMove, { passive: true });
      window.addEventListener("pointerdown", this.onDown, { passive: true });
      window.addEventListener("pointerup", this.onUp, { passive: true });
      window.addEventListener("pointerup", this.onTouchEnd, { passive: true });
      window.addEventListener("pointercancel", this.onUp, { passive: true });
      document.addEventListener("pointerout", this.onLeave, { passive: true });
    }
    update(dt) {
      const k = dt > 0 ? 1 - Math.exp(-this.smooth * dt) : 1;
      const px = this.sx, py = this.sy;
      this.sx += (this.x - this.sx) * k;
      this.sy += (this.y - this.sy) * k;
      if (dt > 0) {
        const kv = 1 - Math.exp(-10 * dt);
        this.vx += ((this.sx - px) / dt - this.vx) * kv;
        this.vy += ((this.sy - py) / dt - this.vy) * kv;
      }
    }
    /** Called by the Stage after every component has seen this frame. */
    endFrame() {
      this.moved = false;
    }
    dispose() {
      window.removeEventListener("pointermove", this.onMove);
      window.removeEventListener("pointerdown", this.onDown);
      window.removeEventListener("pointerup", this.onUp);
      window.removeEventListener("pointerup", this.onTouchEnd);
      window.removeEventListener("pointercancel", this.onUp);
      document.removeEventListener("pointerout", this.onLeave);
    }
  };

  // vendor/scrollstage/src/Stage.js
  var $el2 = (t) => typeof t === "string" ? document.querySelector(t) : t;
  var Stage = class {
    constructor({
      canvas = null,
      timeline = null,
      fov = 45,
      near = 0.1,
      far = 200,
      cameraPosition = [0, 0, 6],
      lookAt = [0, 0, 0],
      dpr = [1, 2],
      antialias = true,
      alpha = true,
      clearColor = 0,
      clearAlpha = 0,
      fullscreen = true,
      render = null
    } = {}) {
      this.canvas = canvas ? $el2(canvas) : document.body.appendChild(document.createElement("canvas"));
      if (!this.canvas) throw new Error(`[scrollstage] canvas ${canvas} not found`);
      this.fullscreen = fullscreen;
      if (fullscreen) {
        Object.assign(this.canvas.style, { position: "fixed", inset: "0", width: "100%", height: "100%", display: "block" });
      }
      this.dpr = dpr;
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias, alpha, powerPreference: "high-performance" });
      this.renderer.setClearColor(clearColor, clearAlpha);
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(fov, 1, near, far);
      this.camera.position.fromArray(cameraPosition);
      this.camera.lookAt(new THREE.Vector3().fromArray(lookAt));
      this.scene.add(this.camera);
      this.timeline = timeline ?? new ScrollTimeline();
      this.pointer = new Pointer();
      this.customRender = render;
      this.reducedMotionQuery = matchMedia("(prefers-reduced-motion: reduce)");
      this.reducedMotion = this.reducedMotionQuery.matches;
      this.onMotionPref = (e) => {
        this.reducedMotion = e.matches;
        this.timeline.reducedMotion = e.matches;
      };
      this.reducedMotionQuery.addEventListener("change", this.onMotionPref);
      this.components = [];
      this.frameListeners = /* @__PURE__ */ new Set();
      this.view = { width: 1, height: 1, aspect: 1, dpr: 1, portrait: false };
      this.frame = { time: 0, dt: 0, stage: this, scroll: this.timeline, pointer: this.pointer, view: this.view, camera: this.camera };
      this.running = false;
      this.raf = 0;
      this.last = 0;
      this.resize = this.resize.bind(this);
      this.tick = this.tick.bind(this);
      window.addEventListener("resize", this.resize);
      if (!fullscreen && "ResizeObserver" in window) {
        this.ro = new ResizeObserver(this.resize);
        this.ro.observe(this.canvas);
      }
      this.resize();
    }
    /** Adds (and mounts) a component; returns it so you can keep a handle. */
    add(component) {
      component.stage = this;
      component.mount(this);
      component.resize(this.view);
      this.components.push(component);
      this.components.sort((a, b) => a.order - b.order);
      return component;
    }
    remove(component) {
      const i = this.components.indexOf(component);
      if (i === -1) return;
      this.components.splice(i, 1);
      component.dispose();
      component.stage = null;
    }
    /** Runs `fn(frame)` every frame after the components; returns an unsubscribe function. */
    onFrame(fn) {
      this.frameListeners.add(fn);
      return () => this.frameListeners.delete(fn);
    }
    start() {
      if (this.running) return this;
      this.running = true;
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.tick);
      return this;
    }
    stop() {
      this.running = false;
      cancelAnimationFrame(this.raf);
      return this;
    }
    resize() {
      const w = this.fullscreen ? window.innerWidth : this.canvas.clientWidth;
      const h = this.fullscreen ? window.innerHeight : this.canvas.clientHeight;
      if (!w || !h) return;
      const dpr = Math.min(this.dpr[1], Math.max(this.dpr[0], window.devicePixelRatio || 1));
      this.renderer.setPixelRatio(dpr);
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      Object.assign(this.view, { width: w, height: h, aspect: w / h, dpr, portrait: w < h });
      this.timeline.measure();
      for (const c of this.components) c.resize(this.view);
    }
    tick(now) {
      if (!this.running) return;
      this.raf = requestAnimationFrame(this.tick);
      const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1e3));
      this.last = now;
      this.step(dt);
    }
    /** Advances one frame by dt seconds and renders. Exposed for tests and offline rendering. */
    step(dt) {
      const f = this.frame;
      f.dt = dt;
      f.time += dt;
      this.pointer.update(dt);
      this.timeline.update(dt);
      for (const c of this.components) if (c.enabled) c.update(f);
      for (const fn of this.frameListeners) fn(f);
      this.render(dt);
      this.pointer.endFrame();
    }
    render(dt = 0) {
      if (this.customRender) this.customRender({ renderer: this.renderer, scene: this.scene, camera: this.camera, dt });
      else this.renderer.render(this.scene, this.camera);
    }
    /** Visible width/height in world units at `distance` in front of the camera. */
    worldSize(distance) {
      const h = 2 * distance * Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2);
      return { width: h * this.camera.aspect, height: h };
    }
    dispose() {
      this.stop();
      for (const c of [...this.components]) this.remove(c);
      window.removeEventListener("resize", this.resize);
      this.ro?.disconnect();
      this.reducedMotionQuery.removeEventListener("change", this.onMotionPref);
      this.pointer.dispose();
      this.timeline.dispose();
      this.renderer.dispose();
    }
  };

  // vendor/scrollstage/src/Component.js
  var Component = class {
    constructor(options = {}) {
      this.options = options;
      this.order = options.order ?? 0;
      this.enabled = options.enabled ?? true;
      this.stage = null;
    }
    mount() {
    }
    resize() {
    }
    update() {
    }
    dispose() {
    }
    /**
     * Reads a progress "source" (by default this.options.progress):
     *   undefined          -> progress of the whole page
     *   'name'             -> progress of that timeline section
     *   { section, range } -> a sub-range of a section, e.g. { section: 'ring', range: [0, 0.4] }
     *   number             -> constant
     *   (frame) => number  -> your own
     */
    progress(frame, source = this.options.progress) {
      return resolveProgress(source, frame);
    }
  };
  function resolveProgress(source, frame) {
    if (source == null) return frame.scroll.progress();
    if (typeof source === "number") return clamp01(source);
    if (typeof source === "string") return frame.scroll.progress(source);
    if (typeof source === "function") return clamp01(source(frame));
    if (typeof source === "object" && source.section) {
      const p = frame.scroll.progress(source.section);
      return source.range ? range(p, source.range[0], source.range[1]) : p;
    }
    throw new Error(`[scrollstage] can't read progress from ${JSON.stringify(source)}`);
  }

  // vendor/scrollstage/src/textures.js
  var THREE2 = __toESM(require_three(), 1);
  var loader = new THREE2.TextureLoader();
  var cache = /* @__PURE__ */ new Map();
  var blankTexture = new THREE2.DataTexture(new Uint8Array([235, 238, 245, 255]), 1, 1);
  blankTexture.colorSpace = THREE2.SRGBColorSpace;
  blankTexture.needsUpdate = true;
  function loadTexture(url, renderer = null) {
    if (cache.has(url)) return cache.get(url);
    const p = new Promise((resolve, reject) => {
      loader.load(url, (tex) => {
        tex.colorSpace = THREE2.SRGBColorSpace;
        if (renderer) tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        resolve(tex);
      }, void 0, (err) => {
        cache.delete(url);
        reject(err);
      });
    });
    cache.set(url, p);
    return p;
  }

  // vendor/scrollstage/src/shaders/imageMaterial.js
  var THREE3 = __toESM(require_three(), 1);
  var GLSL_ROUNDED_BOX = (
    /* glsl */
    `
float roundedBox(vec2 p, vec2 halfSize, float r) {
  vec2 q = abs(p) - halfSize + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}`
  );
  var GLSL_COVER_UV = (
    /* glsl */
    `
// object-fit: cover for a texture of imageSize on a plane of planeSize
vec2 coverUv(vec2 uv, vec2 planeSize, vec2 imageSize) {
  float pa = planeSize.x / planeSize.y, ia = imageSize.x / imageSize.y;
  vec2 s = pa > ia ? vec2(1.0, ia / pa) : vec2(pa / ia, 1.0);
  return (uv - 0.5) * s + 0.5;
}`
  );
  var FRAG = (
    /* glsl */
    `
uniform sampler2D tMap;
uniform vec2 uImageSize;
uniform vec2 uPlaneSize;  // world size of the plane (for corner radius + cover fit)
uniform float uRadius;    // corner radius, share of the short side
uniform float uZoom;      // 1 = cover; > 1 zooms in
uniform float uReveal;    // 0..1 wipe from the bottom
uniform float uOpacity;
uniform float uGray;      // 0 = colour, 1 = greyscale
uniform float uBrightness;
varying vec2 vUv;
${GLSL_ROUNDED_BOX}
${GLSL_COVER_UV}
void main() {
  vec2 p = (vUv - 0.5) * uPlaneSize;
  float d = roundedBox(p, uPlaneSize * 0.5, uRadius * min(uPlaneSize.x, uPlaneSize.y));
  float aa = max(fwidth(d), 1e-5);
  float mask = 1.0 - smoothstep(-aa, aa, d);

  float edge = 0.08;
  float r = uReveal * (1.0 + edge);
  mask *= 1.0 - smoothstep(r - edge, r, vUv.y);

  float a = mask * uOpacity;
  if (a < 0.002) discard;

  vec2 uv = coverUv(vUv, uPlaneSize, uImageSize);
  uv = (uv - 0.5) / uZoom + 0.5;
  vec4 tex = texture2D(tMap, uv);
  float g = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
  vec3 col = mix(tex.rgb, vec3(g), uGray) * uBrightness;
  gl_FragColor = vec4(col, a);
  #include <colorspace_fragment>
}`
  );

  // vendor/scrollstage/src/shaders/clothMaterial.js
  var THREE4 = __toESM(require_three(), 1);
  var VERT = (
    /* glsl */
    `
uniform vec2 uSize;
uniform float uSeed, uWave, uCorner, uFlutter, uBend, uTwist, uWindFold, uCloth, uTime;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPos;

float clothDisp(vec2 q, vec2 uv) {
  float ph = uSeed * 6.283;
  float z = (sin(q.x * 2.1 + q.y * 0.8 + ph) * 0.55
           + sin(q.y * 2.6 - q.x * 1.1 + ph * 0.75 + uSeed * 11.0) * 0.45) * uWave;
  vec2 cuv = mix(uv, vec2(1.0 - uv.x, uv.y), step(0.5, fract(uSeed * 7.13)));   // which bottom corner droops
  float c = max(0.0, cuv.x + (1.0 - cuv.y) - 1.2);
  z += uCorner * c * c * 3.5;
  // wind: broad rolling waves from the held edge out to the free edge, growing toward it
  float ripple = sin(uv.x * 4.5 - uTime * 3.6 + q.y * 1.4 + uSeed * 20.0) * 0.55
               + sin(uv.x * 7.5 - uTime * 5.0 - q.y * 2.2 + uSeed * 7.0) * 0.28
               + sin(uv.y * 5.5 - uTime * 2.7 + uv.x * 3.0 + uSeed * 3.0) * 0.17;
  float gust = 0.65 + 0.35 * sin(q.y * 2.3 - uTime * 1.6 + uSeed * 9.0) * sin(q.x * 1.7 + uTime * 1.1);
  z += uFlutter * ripple * gust * smoothstep(0.0, 1.0, uv.x);
  float b = sin(q.x * 3.2 + q.y * 2.0 - uTime * 2.4 + uSeed * 5.0) * 0.6
          + sin(q.y * 3.6 - q.x * 1.8 - uTime * 1.7 + uSeed * 13.0) * 0.4;
  z += uCloth * b;
  float t = uv.x;                                         // 0 at the spine, 1 at the free edge
  z += uBend * t * t * (1.0 + uTwist * (uv.y - 0.5) * 2.0);
  return z;
}

// folds the part of the sheet right of a vertical crease at x = c by angle A, around a rounded crease of width w
void crease(inout vec3 p, inout vec3 n, float c, float A, float w) {
  float s = p.x - c;
  if (s <= 0.0 || abs(A) < 1e-4) return;
  float t = min(s, w);
  float a = A * t / w;
  float r = w / A;
  float sa = sin(a), ca = cos(a), zz = p.z;
  float u = r * sa + (s - t) * cos(A);
  float v = r * (1.0 - ca) + (s - t) * sin(A);
  p.x = c + u - zz * sa;
  p.z = v + zz * ca;
  n = vec3(n.x * ca - n.z * sa, n.y, n.x * sa + n.z * ca);
}

void main() {
  vUv = uv;
  vec3 p = position;
  const float e = 0.01;
  float z0 = clothDisp(p.xy, uv);
  float zx = clothDisp(p.xy + vec2(e, 0.0), uv + vec2(e / uSize.x, 0.0));
  float zy = clothDisp(p.xy + vec2(0.0, e), uv + vec2(0.0, e / uSize.y));
  vec3 n = normalize(vec3(-(zx - z0) / e, -(zy - z0) / e, 1.0));
  p.z += z0;
  p.x -= (2.0 / 3.0) * uBend * uBend * uv.x * uv.x * uv.x;   // keeps the sheet's length while it bends
  crease(p, n, uSize.x / 6.0, uWindFold, uSize.x / 3.0);       // the outer third rolls back in the wind
  vNormal = normalize(normalMatrix * n);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vViewPos = mv.xyz;
  gl_Position = projectionMatrix * mv;
}`
  );
  var FRAG2 = (
    /* glsl */
    `
uniform sampler2D tMap;
uniform vec2 uImageSize, uSize;
uniform float uRadius, uLoaded, uShade, uHover, uOpacity, uSeed, uBlur;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPos;
${GLSL_ROUNDED_BOX}
${GLSL_COVER_UV}
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
void main() {
  bool front = gl_FrontFacing;
  vec2 uv = vUv;
  if (!front) uv.x = 1.0 - uv.x;                       // the back shows the print the right way round

  // silhouette: rounded corners (derivatives before any discard)
  float d = roundedBox((vUv - 0.5) * uSize, uSize * 0.5, uRadius);
  float aa = max(fwidth(d), 1e-4);
  vec2 wq = (uv - 0.5) * uSize * 220.0;
  float weaveAmt = 1.0 - smoothstep(0.35, 0.9, length(fwidth(wq)));
  // uBlur also feathers the card's edge inwards, so the whole print comes out of a blur
  float mask = (1.0 - smoothstep(-aa - uBlur * 0.09, aa, d)) * uOpacity;
  if (mask < 0.003) discard;

  // cloth surface: soft dye variation + a fine woven thread pattern (fades out when too small to see)
  vec2 pp = (uv - 0.5) * uSize + uSeed * 17.0;
  float mottle = vnoise(pp * 2.5) * 0.6 + vnoise(pp * 6.0) * 0.4;
  float grain = sin(wq.x * 6.283) * sin(wq.y * 6.283) * 0.5 * weaveAmt;

  // the printed image, cover-fit; lifted blacks and paper-white highlights, a touch desaturated
  vec2 cuv = coverUv(uv, uSize, uImageSize);
  vec3 tex;
  if (uBlur > 0.002) {
    // uBlur 0..1: a golden-angle disc of taps (radius up to 5% of the image), plus a mip bias to smooth it
    float r = uBlur * 0.05;
    tex = vec3(0.0);
    for (int k = 0; k < 16; k++) {
      float fk = float(k) + 0.5;
      float a = fk * 2.39996;
      tex += texture2D(tMap, cuv + vec2(cos(a), sin(a)) * r * sqrt(fk / 16.0), uBlur * 4.0).rgb;
    }
    tex /= 16.0;
  } else {
    tex = texture2D(tMap, cuv).rgb;
  }
  vec3 img = mix(vec3(0.82, 0.85, 0.88), tex, uLoaded);
  float lum = dot(img, vec3(0.299, 0.587, 0.114));
  img = mix(vec3(lum), img, 0.92);
  img = mix(vec3(0.05, 0.045, 0.04), vec3(0.963, 0.946, 0.904), img);
  img *= 0.975 + 0.035 * mottle + grain * 0.06;
  vec3 col = img * (0.93 + 0.07 * smoothstep(0.0, 0.012, -d));   // worn outer edge

  // lighting: high-key fill from above + a soft sheen where the folds turn away
  vec3 n = normalize(front ? vNormal : -vNormal);
  vec3 V = normalize(-vViewPos);
  vec3 base = col;
  col = base * (0.84 + 0.2 * max(dot(n, normalize(vec3(-0.15, 0.9, 0.4))), 0.0));
  float sheen = pow(1.0 - max(dot(n, V), 0.0), 3.0);
  col += mix(vec3(0.9), base, 0.5) * sheen * 0.22;
  col *= uShade * (1.0 + uHover * 0.1);
  gl_FragColor = vec4(col, mask);
  #include <colorspace_fragment>
}`
  );
  function createClothMaterial({ size = [1, 4 / 3], radius = 0.035, seed = Math.random() } = {}) {
    const uniforms = {
      tMap: { value: blankTexture },
      uImageSize: { value: new THREE4.Vector2(1, 1) },
      uSize: { value: new THREE4.Vector2(size[0], size[1]) },
      uRadius: { value: radius },
      uLoaded: { value: 0 },
      uShade: { value: 1 },
      uHover: { value: 0 },
      uOpacity: { value: 1 },
      uBlur: { value: 0 },
      uSeed: { value: seed },
      uTwist: { value: (seed - 0.5) * 0.7 },
      uWave: { value: 0 },
      uCorner: { value: 0 },
      uFlutter: { value: 0 },
      uBend: { value: 0 },
      uWindFold: { value: 0 },
      uCloth: { value: 0 },
      uTime: { value: 0 }
    };
    const material = new THREE4.ShaderMaterial({
      uniforms,
      vertexShader: VERT,
      fragmentShader: FRAG2,
      transparent: true,
      side: THREE4.DoubleSide
    });
    material.userData.setTexture = (tex) => {
      uniforms.tMap.value = tex;
      uniforms.uImageSize.value.set(tex.image?.width || 1, tex.image?.height || 1);
      uniforms.uLoaded.value = 1;
    };
    return material;
  }

  // vendor/scrollstage/src/components/ClothRing.js
  var THREE5 = __toESM(require_three(), 1);
  var ClothRing = class extends Component {
    constructor(options = {}) {
      super({
        images: [],
        count: 32,
        cardSize: [1, 4 / 3],
        spacing: 0.4,
        radius: null,
        cornerRadius: 0.035,
        segments: [48, 36],
        // the front-of-ring magnifier
        frontPush: 0.5,
        frontPop: 0.36,
        frontSpread: 0.36,
        frontTurn: 0.32,
        frontLift: 0.145,
        hoverRise: 0.32,
        // turning
        speed: -0.075,
        idleDelay: 1,
        drag: 1,
        friction: 1.4,
        maxSpeed: 3,
        parallax: 1,
        // entrance: a big bang from the centre
        shown: false,
        duration: 2.2,
        stagger: 0.4,
        swirl: 2.4,
        scatter: 0.9,
        minScale: 0.03,
        entrance: "bang",
        exitDuration: null,
        // cloth and air
        // air: how hard a moving cursor shakes nearby cloth; airBlow: how hard it blows while resting
        // over the ring; airRadius: its reach, as a share of the canvas's short side
        // flag: a steady wind, so every print waves like a flag even when the ring is still (0 = off)
        cloth: 1,
        air: 1,
        airBlow: 0.45,
        airRadius: 0.3,
        spinShake: 1,
        breeze: 1,
        flag: 0,
        seed: 7,
        onSelect: null,
        dragTarget: null,
        ...options
      });
      if (!this.options.images.length) throw new Error("[scrollstage] ClothRing needs images");
      this.cards = [];
      this.theta = 0;
      this.velocity = 0;
      this.visVel = 0;
      this.seek = 0;
      this.idle = 99;
      this.reveal = this.options.shown ? 1 : 0;
      this.target = this.reveal;
      this.frontIndex = 0;
      this.hoverIndex = -1;
      this.dragging = null;
      this.ray = new THREE5.Raycaster();
      this.ndc = new THREE5.Vector2();
      this.tmp = { p: new THREE5.Vector3(), q: new THREE5.Quaternion(), q2: new THREE5.Quaternion(), v: new THREE5.Vector3(), n: new THREE5.Vector3() };
      this.cursor = { x: -1e4, y: -1e4, t: 0, vx: 0, vy: 0, speed: 0 };
    }
    /** Places a Stage's camera the way the original page framed the ring. */
    static cameraFor(stage, ring, { distance = 1.9, height = 3.9 } = {}) {
      const cam = stage.camera, R = ring.radius;
      const tan = Math.tan(THREE5.MathUtils.degToRad(cam.fov) / 2);
      const d = distance * Math.max(3.3 / (2 * tan), 3.6 / (2 * tan * cam.aspect));
      cam.position.set(0, height, R + d);
      cam.lookAt(0, -0.35, R * 0.45);
      cam.updateMatrixWorld();
    }
    mount(stage) {
      const o = this.options, n = o.count, [w, h] = o.cardSize;
      this.radius = o.radius ?? n * o.spacing / (2 * Math.PI);
      this.step = Math.PI * 2 / n;
      this.group = new THREE5.Group();
      stage.scene.add(this.group);
      this.geometry = new THREE5.PlaneGeometry(w, h, ...o.segments);
      const r = rng(o.seed);
      const textures = o.images.map((item) => textureFor(item, stage.renderer));
      for (let i = 0; i < n; i++) {
        const k = i % o.images.length;
        const material = createClothMaterial({ size: [w, h], radius: o.cornerRadius, seed: r() });
        const mesh = new THREE5.Mesh(this.geometry, material);
        mesh.userData.index = i;
        mesh.renderOrder = 1;
        this.group.add(mesh);
        const size = 0.75 + Math.pow(r(), 1.15) * 0.5;
        this.cards.push({
          mesh,
          u: material.uniforms,
          item: o.images[k],
          wave: 0.012 + r() * 0.014,
          corner: 0.025 + r() * 0.05,
          stiffness: (22 + r() * 18) / Math.pow(size, 1.5),
          size,
          bend: { x: 0, v: 0 },
          wind: { x: 0, v: 0 },
          billow: { x: 0, v: 0 },
          rise: { x: 0, v: 0 },
          air: 0,
          hover: 0,
          shakePh: r() * 100,
          prevT: 0,
          // the big bang: its delay, height in the debris cloud, starting tumble and spin
          delay: r(),
          h: (r() - 0.5) * 2,
          q0: new THREE5.Quaternion().setFromEuler(new THREE5.Euler(r() * 6.283, r() * 6.283, r() * 6.283)),
          axis: new THREE5.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(),
          spin: Math.PI * (1.5 + r() * 2)
        });
        textures[k].then((tex) => material.userData.setTexture(tex)).catch((e) => console.warn("[scrollstage] ClothRing: failed to load", o.images[k], e));
      }
      const el = o.dragTarget ?? stage.renderer.domElement;
      this.dragEl = el;
      this.onDown = (e) => {
        if (this.reveal < 0.98) return;
        this.dragging = { id: e.pointerId, x: e.clientX, y: e.clientY, lastX: e.clientX, t: performance.now(), moved: 0 };
        el.setPointerCapture?.(e.pointerId);
      };
      this.onMove = (e) => {
        const d = this.dragging;
        if (!d || d.id !== e.pointerId || !o.drag) return;
        const rect = el.getBoundingClientRect(), now = performance.now();
        const dTheta = (e.clientX - d.lastX) / Math.max(1, rect.width) * Math.PI * 1.4 * o.drag;
        this.theta += dTheta;
        this.velocity = lerp(this.velocity, dTheta / (Math.max(1, now - d.t) / 1e3), 0.5);
        this.seek = 0;
        this.idle = 0;
        d.moved += Math.abs(e.clientX - d.lastX);
        d.lastX = e.clientX;
        d.t = now;
      };
      this.onUp = (e) => {
        const d = this.dragging;
        if (!d || d.id !== e.pointerId) return;
        this.dragging = null;
        if (performance.now() - d.t > 80) this.velocity = 0;
        this.velocity = Math.max(-o.maxSpeed, Math.min(o.maxSpeed, this.velocity));
        if (d.moved < 6 && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6) {
          const i = this.pick(e.clientX, e.clientY);
          if (i !== -1) {
            this.goTo(i);
            o.onSelect?.(i, this.cards[i].item);
          }
        }
      };
      this.onAirMove = (e) => {
        if (!e.isPrimary) return;
        const cur = this.cursor, t = performance.now();
        const k = cur.t && t - cur.t < 200 ? 1e3 / Math.max(1, t - cur.t) : 0;
        const vx = Math.max(-6e3, Math.min(6e3, (e.clientX - cur.x) * k));
        const vy = Math.max(-6e3, Math.min(6e3, (e.clientY - cur.y) * k));
        cur.vx += (vx - cur.vx) * 0.35;
        cur.vy += (vy - cur.vy) * 0.35;
        cur.speed = Math.hypot(cur.vx, cur.vy);
        cur.x = e.clientX;
        cur.y = e.clientY;
        cur.t = t;
      };
      window.addEventListener("pointermove", this.onAirMove, { passive: true });
      el.addEventListener("pointerdown", this.onDown);
      el.addEventListener("pointermove", this.onMove);
      el.addEventListener("pointerup", this.onUp);
      el.addEventListener("pointercancel", this.onUp);
      if (o.drag) el.style.touchAction = "pan-y";
    }
    show() {
      if (this.options.entrance === "blur" && this.reveal < 1e-3) {
        const n = this.options.count, front = mod(Math.round(-this.theta / this.step), n);
        for (let i = 0; i < n; i++) this.cards[i].order = n > 1 ? mod(i - front, n) / (n - 1) : 0;
      }
      this.target = 1;
      return this;
    }
    hide() {
      this.target = 0;
      return this;
    }
    /** Turns the ring so card `i` faces the camera (the shortest way round). */
    goTo(i) {
      const current = this.theta + this.seek;
      this.seek += mod(-i * this.step - current + Math.PI, Math.PI * 2) - Math.PI;
      this.velocity = 0;
      this.idle = 0;
      return this;
    }
    next() {
      return this.goTo(mod(this.frontIndex + 1, this.options.count));
    }
    prev() {
      return this.goTo(mod(this.frontIndex - 1, this.options.count));
    }
    /** Index of the card under a client (CSS px) point, or -1. */
    pick(clientX, clientY) {
      if (!this.group.visible || this.reveal < 0.98) return -1;
      const rect = this.stage.renderer.domElement.getBoundingClientRect();
      if (!rect.width) return -1;
      this.ndc.set((clientX - rect.left) / rect.width * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      this.ray.setFromCamera(this.ndc, this.stage.camera);
      const hit = this.ray.intersectObjects(this.group.children, false)[0];
      return hit ? hit.object.userData.index : -1;
    }
    update(frame) {
      const { dt, stage, pointer, time } = frame;
      if (dt <= 0) return;
      const o = this.options, n = o.count, R = this.radius, [, H] = o.cardSize;
      const motion = stage.reducedMotion ? 0 : 1;
      const { p: vP, q: vQ, q2, v, n: vN } = this.tmp;
      const dur = this.target < this.reveal ? o.exitDuration ?? o.duration : o.duration;
      const rate = dt / Math.max(0.01, motion ? dur : 0.3);
      this.reveal = this.target > this.reveal ? Math.min(this.target, this.reveal + rate) : Math.max(this.target, this.reveal - rate);
      this.group.visible = this.reveal > 1e-3;
      if (!this.group.visible) return;
      const before = this.theta;
      if (!this.dragging) {
        this.theta += this.velocity * dt;
        this.velocity *= Math.exp(-o.friction * dt);
        const s = this.seek * (1 - Math.exp(-4 * dt));
        this.theta += s;
        this.seek -= s;
        this.idle += dt;
        if (this.idle > o.idleDelay && Math.abs(this.seek) < 0.01) this.theta += o.speed * dt * motion;
      }
      if (Math.abs(this.velocity) > 0.05 || Math.abs(this.seek) > 0.01) this.idle = 0;
      this.visVel += ((this.theta - before) / dt - this.visVel) * (1 - Math.exp(-10 * dt));
      const vel = this.visVel;
      const px = pointer.inside ? pointer.sx : 0, py = pointer.inside ? pointer.sy : 0;
      this.group.rotation.set(
        -py * 0.035 * o.parallax * motion,
        px * 0.06 * o.parallax * motion,
        Math.max(-0.035, Math.min(0.035, -vel * 0.012))
      );
      this.group.updateMatrixWorld();
      const hovered = pointer.inside && !this.dragging ? this.pick(pointer.clientX, pointer.clientY) : -1;
      if (hovered !== this.hoverIndex) {
        this.hoverIndex = hovered;
        this.dragEl.style.cursor = hovered !== -1 ? "pointer" : o.drag ? "grab" : "";
      }
      this.frontIndex = mod(Math.round(-this.theta / this.step), n);
      const cur = this.cursor;
      const still = Math.exp(-dt * 5);
      cur.vx *= still;
      cur.vy *= still;
      cur.speed *= still;
      const rect = this.stage.renderer.domElement.getBoundingClientRect();
      const RW = Math.max(1, rect.width), RH = Math.max(1, rect.height);
      const over = pointer.inside && cur.x >= rect.left && cur.x <= rect.right && cur.y >= rect.top && cur.y <= rect.bottom;
      const airR = o.airRadius * Math.min(RW, RH);
      const airGain = motion * ((over ? o.airBlow : 0) + 0.8 * clamp01(cur.speed / 1800)) * o.air;
      const sweep = clamp01(cur.speed / 900);
      const spinAir = Math.min(1, Math.abs(vel) * 0.8) * o.spinShake * motion;
      const moving = Math.min(1, Math.abs(vel) * 4);
      const fade = 1 - Math.exp(-dt * 12);
      const st = o.stagger;
      const blurIn = o.entrance === "blur";
      for (let i = 0; i < n; i++) {
        const c = this.cards[i];
        const u = c.u;
        c.hover += ((i === this.hoverIndex ? 1 : 0) - c.hover) * fade;
        springStep(c.rise, i === this.hoverIndex && this.reveal >= 1 ? 1 : 0, 70, critical(70), dt);
        const tLin = clamp01(this.reveal * (1 + st) - (blurIn ? c.order ?? 0 : c.delay) * st);
        const tEase = motion ? 1 - (1 - tLin) ** 3 : tLin;
        c.mesh.visible = tEase > 2e-3;
        if (!c.mesh.visible) {
          c.prevT = tEase;
          continue;
        }
        const t = blurIn ? 1 : tEase;
        const flight = Math.abs(t - c.prevT) / dt;
        c.prevT = t;
        const a0 = i * this.step + this.theta;
        const aw = Math.atan2(Math.sin(a0), Math.cos(a0));
        const a = aw + o.frontSpread * Math.sin(aw) * Math.exp(-(aw * aw) / 1.2);
        const sa = Math.sin(a), ca = Math.cos(a);
        const front = Math.max(0, ca), f2 = front * front, f3 = f2 * front;
        const rx = R * sa, rz = R * ca * (1 + o.frontPush * front);
        const pop = 1 + o.frontPop * f2;
        const yaw = Math.atan2(rx, rz) - Math.PI / 2 + o.frontTurn * f3 * f2;
        const ry = (pop - 1) * H / 2 + o.frontLift * f3 + c.rise.x * o.hoverRise;
        const angR = Math.atan2(rx, rz), radR = Math.hypot(rx, rz);
        const ang = angR + (1 - t) * o.swirl;
        const rad = radR * t;
        vP.set(rad * Math.sin(ang), ry * t + Math.sin(Math.PI * t) * c.h * o.scatter, rad * Math.cos(ang));
        vQ.setFromAxisAngle(Y_AXIS, yaw);
        if (t < 1) {
          q2.copy(c.q0).slerp(vQ, 1 - (1 - t) * (1 - t));
          vQ.copy(q2).multiply(SPIN_Q.setFromAxisAngle(c.axis, (1 - t) * c.spin));
        }
        const s = blurIn ? pop * (0.94 + 0.06 * tEase) : o.minScale + (pop - o.minScale) * Math.pow(t, 0.6);
        c.mesh.position.copy(vP);
        c.mesh.quaternion.copy(vQ);
        c.mesh.scale.setScalar(s);
        const sn = u.uSeed.value * 97;
        const turb = noise1(time * 2.3 + sn) * 0.65 + noise1(time * 5.9 + sn * 1.7) * 0.35;
        const turb2 = noise1(time * 1.7 + sn * 2.3 + 11) * 0.7 + noise1(time * 4.3 + sn * 0.6) * 0.3;
        let push = 0;
        let airTo = 0;
        if (airGain > 0) {
          vN.set(0, 0, 0.25).applyQuaternion(vQ).add(vP).applyMatrix4(this.group.matrixWorld).project(stage.camera);
          v.copy(vP).applyMatrix4(this.group.matrixWorld).project(stage.camera);
          const sx = rect.left + (v.x * 0.5 + 0.5) * RW, sy = rect.top + (-v.y * 0.5 + 0.5) * RH;
          const ax = sx - cur.x, ay = sy - cur.y;
          const aDist = Math.hypot(ax, ay) || 1;
          const puff = 0.55 + 0.45 * noise1(time * 3.2 - aDist / airR * 2.2 + 7);
          airTo = airGain * puff * Math.exp(-(aDist * aDist) / (airR * airR)) * (0.75 + 0.25 * c.size);
          const nsx = (vN.x - v.x) * 0.5 * RW, nsy = -(vN.y - v.y) * 0.5 * RH;
          const nsLen = Math.hypot(nsx, nsy) || 1;
          const facing = clamp01(nsLen / 25);
          const pushOut = (ax * nsx + ay * nsy) / (aDist * nsLen) * facing;
          const pushSweep = (cur.vx * nsx + cur.vy * nsy) / (nsLen * Math.max(cur.speed, 1)) * facing;
          push = pushOut * 0.75 + pushSweep * 0.35 * sweep;
        }
        c.air += (airTo - c.air) * (1 - Math.exp(-dt * (airTo > c.air ? 14 : 2.2)));
        const airBend = c.air * (push * 0.3 + turb * 0.1);
        const airFlap = c.air * (push * 0.5 + turb2 * 0.3);
        const flag = o.flag * motion * (0.75 + 0.25 * turb);
        const flagFlap = o.flag * motion * turb2 * 0.14;
        c.shakePh += dt * (1 + Math.abs(vel) * 6) / Math.sqrt(c.size);
        const shakeA = noise1(c.shakePh) * 0.6 + noise1(c.shakePh * 1.9 + 3.1) * 0.4;
        const shakeB = noise1(c.shakePh * 1.3 + 5) * 0.65 + noise1(c.shakePh * 2.7 + 1.7) * 0.35;
        const gustField = noise1(time * 0.9 - a0 * 1.6 + 3) * 0.7 + noise1(time * 2.1 - a0 * 3.1) * 0.3;
        const breeze = o.breeze * moving * motion * (0.35 + 0.65 * Math.max(0, gustField));
        const dir = Math.sign(vel) || 1;
        const bendTo = softLimit(vel * 0.09 + flight * 0.14 + airBend + spinAir * shakeA * 0.17 + breeze * 0.06 * dir, 0.5);
        const bk = c.stiffness, bc = critical(bk, 0.75);
        springStep(c.bend, bendTo * motion, bk, bc, dt / 2);
        springStep(c.bend, bendTo * motion, bk, bc, dt / 2);
        const gust = 0.8 + 0.2 * noise1(time * 1.3 * (0.7 + c.size * 0.3) + i * 7.7);
        const windTo = softLimit(softLimit(vel * 0.32 + flight * 0.5, 1.15) * gust + airFlap + flagFlap + spinAir * shakeB * 0.4 + breeze * 0.22 * dir, 1.25);
        const wk = c.stiffness * 0.55, wc = critical(wk, 0.7);
        springStep(c.wind, windTo * motion, wk, wc, dt / 2);
        springStep(c.wind, windTo * motion, wk, wc, dt / 2);
        const billowTo = Math.min(Math.abs(vel) * 0.03, 0.05) + Math.min(flight * 0.02, 0.05) + c.air * 0.045 + spinAir * 0.02 + breeze * 0.02 + flag * 0.014;
        springStep(c.billow, billowTo * motion, 8, critical(8), dt);
        const nz = Math.cos(yaw);
        u.uShade.value = (0.86 + 0.14 * smoothstep(-1, 1, ca)) * (0.8 + 0.2 * Math.abs(nz));
        u.uHover.value = c.hover;
        u.uOpacity.value = blurIn ? clamp01(tLin * 2.5) : clamp01(t * 4);
        u.uBlur.value = blurIn && motion ? 1 - tEase : 0;
        u.uWave.value = c.wave * o.cloth;
        u.uCorner.value = c.corner * o.cloth;
        u.uFlutter.value = (Math.min(Math.abs(vel) * 0.06, 0.07) + c.air * 0.035 + breeze * 0.04 + flag * 0.055) * o.cloth;
        u.uWindFold.value = c.wind.x * o.cloth;
        u.uBend.value = c.bend.x * o.cloth;
        u.uCloth.value = c.billow.x * o.cloth;
        u.uTime.value = time;
      }
    }
    dispose() {
      const el = this.dragEl;
      window.removeEventListener("pointermove", this.onAirMove);
      el.removeEventListener("pointerdown", this.onDown);
      el.removeEventListener("pointermove", this.onMove);
      el.removeEventListener("pointerup", this.onUp);
      el.removeEventListener("pointercancel", this.onUp);
      el.style.cursor = "";
      for (const c of this.cards) c.mesh.material.dispose();
      this.geometry.dispose();
      this.group.removeFromParent();
      this.cards = [];
    }
  };
  var Y_AXIS = new THREE5.Vector3(0, 1, 0);
  var SPIN_Q = new THREE5.Quaternion();
  function textureFor(item, renderer) {
    if (typeof item === "string") return loadTexture(item, renderer);
    const tex = item instanceof HTMLCanvasElement ? new THREE5.CanvasTexture(item) : new THREE5.Texture(item);
    tex.colorSpace = THREE5.SRGBColorSpace;
    tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    if (item instanceof HTMLImageElement && !item.complete) {
      return new Promise((resolve, reject) => {
        item.addEventListener("load", () => {
          tex.needsUpdate = true;
          resolve(tex);
        }, { once: true });
        item.addEventListener("error", reject, { once: true });
      });
    }
    tex.needsUpdate = true;
    return Promise.resolve(tex);
  }

  // vendor/scrollstage/src/components/WaveImage.js
  var THREE6 = __toESM(require_three(), 1);
  var VERT2 = (
    /* glsl */
    `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`
  );
  var FRAG3 = (
    /* glsl */
    `
uniform sampler2D tMap;
uniform vec2 uImageSize;
uniform vec2 uViewSize;     // canvas size in px (for aspect + cover fit)
uniform float uTime;
uniform float uAmp;         // how far the waves bend the image (uv units per unit of slope)
uniform float uScale;       // wave size: higher = more, smaller waves
uniform float uSheen;       // light on the crests / shade on the far slopes
uniform float uOpacity;
uniform vec2 uPointer;      // pointer in uv (y up)
uniform float uPointerAmp;  // 0..1, ripple strength around the pointer
uniform vec3 uFocus[4];     // where the waves are allowed: x, y in uv (y up), radius (share of the height)
uniform int uFocusCount;    // 0 = waves everywhere
uniform float uFocusSpread; // how far beyond a focus radius the waves fade out (x radius)
varying vec2 vUv;
${GLSL_COVER_UV}

// a few travelling sine waves, bent by each other so the crests curve and drift like silk
float waveField(vec2 p, float t) {
  float a = sin(p.x * 3.1 + t * 0.9 + sin(p.y * 2.3 + t * 0.5) * 1.4);
  float b = sin((p.x * 0.7 - p.y) * 4.3 - t * 0.7);
  float c = sin((p.x + p.y * 0.5) * 6.7 + t * 1.3);
  return a * 0.55 + b * 0.35 + c * 0.09;
}

void main() {
  float aspect = uViewSize.x / uViewSize.y;
  vec2 p = vec2(vUv.x * aspect, vUv.y) * uScale;
  float h = waveField(p, uTime);
  float e = 0.01;
  vec2 grad = vec2(waveField(p + vec2(e, 0.0), uTime) - h, waveField(p + vec2(0.0, e), uTime) - h) / e;

  // ripple rings spreading from the pointer while it moves
  vec2 d = (vUv - uPointer) * vec2(aspect, 1.0);
  float r = length(d);
  float ripple = sin(r * 42.0 - uTime * 5.0) * exp(-r * 7.0) * uPointerAmp;

  // with focus areas, the waves only move the image inside them (fading out softly at the rim)
  float weight = uFocusCount == 0 ? 1.0 : 0.0;
  for (int i = 0; i < 4; i++) {
    if (i >= uFocusCount) break;
    vec2 fd = (vUv - uFocus[i].xy) * vec2(aspect, 1.0);
    weight = max(weight, 1.0 - smoothstep(uFocus[i].z * 0.3, uFocus[i].z * uFocusSpread, length(fd)));
  }
  // the movement fades out toward the canvas edges, so the waves never pull in pixels from beyond
  // the image (and the image needn't be zoomed: it lines up exactly with a CSS cover image)
  vec2 edge = min(vUv, 1.0 - vUv);
  float edgeFade = smoothstep(0.0, 0.08, min(edge.x * aspect, edge.y));
  grad *= weight * edgeFade;
  ripple *= edgeFade;

  vec2 disp = grad * uAmp + (d / max(r, 1e-4)) * ripple * 0.006;
  vec2 uv = coverUv(vUv + disp, uViewSize, uImageSize);
  vec3 col = texture2D(tMap, uv).rgb;

  // light falling from the upper left across the wave slopes
  float slope = dot(grad, normalize(vec2(-0.6, 0.8)));
  col += uSheen * clamp(slope * 0.12 + ripple * 0.25, -0.5, 0.8);
  gl_FragColor = vec4(col, uOpacity);
  #include <colorspace_fragment>
}`
  );
  var WaveImage = class extends Component {
    constructor(options = {}) {
      super({ amplitude: 3e-3, scale: 1, speed: 0.6, sheen: 0.12, pointer: 0.8, focus: null, focusSpread: 1.4, onReady: null, ...options });
      if (!this.options.src) throw new Error("[scrollstage] WaveImage needs a src");
      this.time = 0;
      this.ready = false;
      this.announced = false;
      this.rect = { left: 0, top: 0, width: 1, height: 1 };
    }
    mount(stage) {
      const o = this.options;
      this.uniforms = {
        tMap: { value: null },
        uImageSize: { value: new THREE6.Vector2(1, 1) },
        uViewSize: { value: new THREE6.Vector2(1, 1) },
        uTime: { value: 0 },
        uAmp: { value: o.amplitude },
        uScale: { value: o.scale },
        uSheen: { value: o.sheen },
        uOpacity: { value: 1 },
        uPointer: { value: new THREE6.Vector2(0.5, 0.5) },
        uPointerAmp: { value: 0 },
        uFocus: { value: Array.from({ length: 4 }, () => new THREE6.Vector3()) },
        uFocusCount: { value: 0 },
        uFocusSpread: { value: o.focusSpread }
      };
      this.mesh = new THREE6.Mesh(
        new THREE6.PlaneGeometry(2, 2),
        new THREE6.ShaderMaterial({ uniforms: this.uniforms, vertexShader: VERT2, fragmentShader: FRAG3, depthTest: false, depthWrite: false })
      );
      this.mesh.frustumCulled = false;
      this.mesh.renderOrder = -1e3;
      this.mesh.visible = false;
      stage.scene.add(this.mesh);
      loadTexture(o.src, stage.renderer).then((tex) => {
        if (!this.mesh) return;
        tex.generateMipmaps = false;
        tex.minFilter = THREE6.LinearFilter;
        this.uniforms.tMap.value = tex;
        this.uniforms.uImageSize.value.set(tex.image.width, tex.image.height);
        this.mesh.visible = true;
        this.ready = true;
      }).catch((e) => console.warn("[scrollstage] WaveImage: failed to load", o.src, e));
    }
    resize(view) {
      this.uniforms.uViewSize.value.set(view.width, view.height);
      const r = this.stage.canvas.getBoundingClientRect();
      this.rect = { left: r.left, top: r.top, width: r.width || 1, height: r.height || 1 };
    }
    update(frame) {
      const { dt, stage, pointer } = frame;
      const o = this.options, u = this.uniforms;
      const motion = stage.reducedMotion ? 0 : 1;
      this.time += dt * o.speed * motion;
      u.uTime.value = this.time;
      u.uAmp.value = o.amplitude * motion;
      if (o.focus) {
        const list = o.focus() ?? [];
        const n = Math.min(4, list.length);
        for (let i = 0; i < n; i++) u.uFocus.value[i].set(list[i].x, list[i].y, list[i].r);
        u.uFocusCount.value = n;
      }
      if (pointer.moved && motion && o.pointer) {
        u.uPointer.value.set(
          (pointer.clientX - this.rect.left) / this.rect.width,
          1 - (pointer.clientY - this.rect.top) / this.rect.height
        );
        u.uPointerAmp.value = Math.min(o.pointer, u.uPointerAmp.value + 0.08);
      } else {
        u.uPointerAmp.value *= Math.exp(-1.6 * dt);
      }
      if (this.ready && !this.announced) {
        this.announced = true;
        requestAnimationFrame(() => o.onReady?.());
      }
    }
    dispose() {
      this.mesh.removeFromParent();
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
      this.mesh = null;
    }
  };

  // vendor/scrollstage/src/components/BlobGradient.js
  var THREE7 = __toESM(require_three(), 1);
  var MAX_BLOBS = 8;
  var VERT3 = (
    /* glsl */
    `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`
  );
  var FRAG4 = (
    /* glsl */
    `
#define MAX_BLOBS ${MAX_BLOBS}
uniform vec3 uBase;
uniform int uCount;
uniform float uAspect;
uniform float uSoftness;            // > 1 = wider, softer blobs
uniform vec3 uBlob[MAX_BLOBS];      // x, y (aspect space, y up), radius (share of the height)
uniform vec3 uColor[MAX_BLOBS];
uniform float uStrength[MAX_BLOBS];
uniform float uFrame;
uniform float uOverlay;             // 1 = no base colour: just the blobs, see-through elsewhere
uniform float uOpacity;
varying vec2 vUv;

float grain(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }

void main() {
  vec2 p = vec2(vUv.x * uAspect, vUv.y);
  // blobs composited "over" each other in premultiplied colour, starting from the base colour
  // (opaque) or from nothing (overlay)
  vec3 pre = uBase * (1.0 - uOverlay);
  float a = 1.0 - uOverlay;
  for (int i = 0; i < MAX_BLOBS; i++) {
    if (i >= uCount) break;
    vec2 d = p - uBlob[i].xy;
    float r = uBlob[i].z * uSoftness;
    float w = exp(-dot(d, d) / (r * r)) * uStrength[i];   // a gaussian: no edge at all
    pre = uColor[i] * w + pre * (1.0 - w);
    a = w + a * (1.0 - w);
  }
  vec3 col = pre / max(a, 1e-4);
  // dither by a fraction of a colour step so the smooth gradients never band
  col += (grain(gl_FragCoord.xy + uFrame * 7.31) - 0.5) / 255.0;
  gl_FragColor = vec4(col, a * uOpacity);
}`
  );
  var srgb = (hex) => {
    const c = new THREE7.Color();
    c.setStyle(hex, THREE7.NoColorSpace);
    return new THREE7.Vector3(c.r, c.g, c.b);
  };
  var BlobGradient = class extends Component {
    constructor(options = {}) {
      super({
        base: "#9dbdb3",
        blobs: [
          { color: "#c9d7a9", size: 0.45 },
          { color: "#129fa8", size: 0.5 },
          { color: "#46608a", size: 0.38, strength: 0.9 },
          { color: "#f6f6dc", size: 0.32 }
        ],
        speed: 1,
        travel: 0.6,
        softness: 1,
        opacity: 1,
        seed: 5,
        onReady: null,
        ...options
      });
      const n = this.options.blobs.length;
      if (!n || n > MAX_BLOBS) throw new Error(`[scrollstage] BlobGradient takes 1..${MAX_BLOBS} blobs`);
      const r = rng(this.options.seed);
      this.paths = this.options.blobs.map(() => ({
        fx: 0.13 + r() * 0.17,
        fy: 0.11 + r() * 0.17,
        fx2: 0.29 + r() * 0.2,
        fy2: 0.23 + r() * 0.2,
        px: r() * 6.283,
        py: r() * 6.283,
        px2: r() * 6.283,
        py2: r() * 6.283,
        fr: 0.2 + r() * 0.25,
        pr: r() * 6.283
      }));
      this.time = 0;
      this.frameCount = 0;
      this.aspect = 1;
      this.announced = false;
      this.positions = this.options.blobs.map(() => ({ x: 0.5, y: 0.5, r: 0 }));
    }
    mount(stage) {
      const o = this.options;
      this.uniforms = {
        uBase: { value: srgb(o.base || "#000000") },
        uCount: { value: o.blobs.length },
        uAspect: { value: 1 },
        uSoftness: { value: o.softness },
        uFrame: { value: 0 },
        uOverlay: { value: o.base ? 0 : 1 },
        uOpacity: { value: o.opacity },
        uBlob: { value: Array.from({ length: MAX_BLOBS }, () => new THREE7.Vector3()) },
        uColor: { value: Array.from({ length: MAX_BLOBS }, (_, i) => srgb(o.blobs[i]?.color ?? "#000000")) },
        uStrength: { value: Array.from({ length: MAX_BLOBS }, (_, i) => o.blobs[i]?.strength ?? 1) }
      };
      this.mesh = new THREE7.Mesh(new THREE7.PlaneGeometry(2, 2), new THREE7.ShaderMaterial({
        uniforms: this.uniforms,
        vertexShader: VERT3,
        fragmentShader: FRAG4,
        depthTest: false,
        depthWrite: false,
        transparent: !o.base || o.opacity < 1
      }));
      this.mesh.frustumCulled = false;
      this.mesh.renderOrder = -1e3;
      stage.scene.add(this.mesh);
      this.place();
    }
    /** Puts every blob on its path for the current time. */
    place() {
      const o = this.options, t = this.time * o.speed, a = this.aspect, T = o.travel;
      this.paths.forEach((q, i) => {
        const x = 0.5 + T * (0.75 * Math.sin(t * q.fx + q.px) + 0.25 * Math.sin(t * q.fx2 + q.px2));
        const y = 0.5 + T * (0.75 * Math.sin(t * q.fy + q.py) + 0.25 * Math.sin(t * q.fy2 + q.py2));
        const size = o.blobs[i].size * (1 + 0.15 * Math.sin(t * q.fr + q.pr));
        this.uniforms?.uBlob.value[i].set(x * a, y, size);
        const pos = this.positions[i];
        pos.x = x;
        pos.y = y;
        pos.r = size * o.softness;
      });
    }
    resize(view) {
      this.aspect = view.aspect;
      this.uniforms.uAspect.value = view.aspect;
      this.place();
    }
    update(frame) {
      this.time += frame.stage.reducedMotion ? 0 : frame.dt;
      this.uniforms.uFrame.value = this.frameCount++ % 1e3;
      this.place();
      if (!this.announced) {
        this.announced = true;
        requestAnimationFrame(() => this.options.onReady?.());
      }
    }
    dispose() {
      this.mesh.removeFromParent();
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
    }
  };
  return __toCommonJS(stdin_exports);
})();
