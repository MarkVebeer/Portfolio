// Full-screen ASCII fluid: a small stable-fluids sim stirred by curl noise and the pointer,
// drawn as monospace glyphs in bark brown and honey straight onto the page colour.
// Pared down from a CRT demo: no bezel, scanlines, bloom or settings panel.

type Target = { tex: WebGLTexture; fbo: WebGLFramebuffer; w: number; h: number; texel: [number, number]; dispose(): void };
type Double = { w: number; h: number; texel: [number, number]; readonly read: Target; readonly write: Target; swap(): void; dispose(): void };
type Uniform = number | number[] | Target | { tex: WebGLTexture };
type Program = { p: WebGLProgram; loc: Record<string, WebGLUniformLocation | null> };

const hex = (h: number) => [(h >> 16) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
const BG = hex(0x2b2119);
const DEEP = hex(0x7a5233);
const ACCENT = hex(0xc98a45);
const RAMP = " .:-=+*#%@";

const SIM_RES = 96, DYE_RES = 384, CELL = 10; // CELL: glyph size in CSS px
const DENSITY_FADE = 0.4, MOTION_FADE = 0.5, UPWARD = 40, CURL = 29, PRESSURE = 0.9, PRESSURE_ITERS = 10;
const SPLAT_RADIUS = 0.0015, SPLAT_FORCE = 6000, SPLAT_DYE = 0.4, NOISE_FORCE = 105, NOISE_DYE = 0.77;
const DENSITY_FLOOR = 0.25, CONTRAST = 1.85, DITHER = 0.3, LIFT = 0.35, MAX_VEL = 240;
/** how strongly glyphs show over the page (1 = full colour) */
const STRENGTH = 0.55;
/** Ambient motion: a few emitters drift on slow looping paths, leaving trails the fluid curls and lifts.
    Speeds are radians/s per axis; dye is per second, force scales the emitter's own velocity. */
const EMITTERS = [
  { ax: 0.11, ay: 0.17, px: 0.0, py: 1.3, rx: 0.36, ry: 0.3 },
  { ax: 0.07, ay: 0.13, px: 2.1, py: 0.4, rx: 0.42, ry: 0.34 },
  { ax: 0.15, ay: 0.09, px: 4.2, py: 2.7, rx: 0.3, ry: 0.36 },
];
const EMIT_DYE = 2.2, EMIT_RADIUS = 0.004, EMIT_FORCE = 900;

const VS = `#version 300 es
precision highp float;
uniform vec2 uTexel;
out vec2 vUv, vL, vR, vT, vB;
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  vUv = p;
  vL = vUv - vec2(uTexel.x, 0.); vR = vUv + vec2(uTexel.x, 0.);
  vT = vUv + vec2(0., uTexel.y); vB = vUv - vec2(0., uTexel.y);
  gl_Position = vec4(p * 2. - 1., 0., 1.);
}`;
const HEAD = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv, vL, vR, vT, vB;
out vec4 o;
`;
const NOISE = `
float hash(vec3 p) { p = fract(p * .3183099 + .1); p *= 17.; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vnoise(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p) { float a = .5, s = 0.; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + 11.7; a *= .5; } return s; }
`;

const FS = {
  splat: `
    uniform sampler2D uTarget; uniform float uAspect, uRadius; uniform vec3 uColor; uniform vec2 uPoint;
    void main() {
      vec2 p = vUv - uPoint; p.x *= uAspect;
      o = vec4(texture(uTarget, vUv).xyz + exp(-dot(p, p) / uRadius) * uColor, 1.);
    }`,
  advect: `
    uniform sampler2D uVelocity, uSource; uniform vec2 uSimTexel; uniform float uDt, uDissipation;
    void main() {
      vec2 coord = vUv - uDt * texture(uVelocity, vUv).xy * uSimTexel;
      o = texture(uSource, coord) / (1. + uDissipation * uDt);
    }`,
  curl: `
    uniform sampler2D uVelocity;
    void main() {
      float c = texture(uVelocity, vR).y - texture(uVelocity, vL).y - texture(uVelocity, vT).x + texture(uVelocity, vB).x;
      o = vec4(.5 * c, 0., 0., 1.);
    }`,
  vorticity: `
    uniform sampler2D uVelocity, uCurl; uniform float uCurlStrength, uDt;
    void main() {
      float L = texture(uCurl, vL).x, R = texture(uCurl, vR).x, T = texture(uCurl, vT).x, B = texture(uCurl, vB).x;
      float C = texture(uCurl, vUv).x;
      vec2 f = .5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
      f = f / (length(f) + 1e-4) * uCurlStrength * C; f.y *= -1.;
      o = vec4(texture(uVelocity, vUv).xy + f * uDt, 0., 1.);
    }`,
  forces: NOISE + `
    uniform sampler2D uVelocity, uDye; uniform float uDt, uTime, uUpward, uNoiseForce, uAspect, uMaxVel;
    void main() {
      vec2 v = texture(uVelocity, vUv).xy;
      vec3 d = texture(uDye, vUv).rgb;
      v.y += uUpward * max(d.r, max(d.g, d.b)) * uDt;
      vec2 p = vUv * vec2(uAspect, 1.) * 2.2; float t = uTime * .12, e = .02;
      float n1 = fbm(vec3(p + vec2(0, e), t)), n2 = fbm(vec3(p - vec2(0, e), t));
      float n3 = fbm(vec3(p + vec2(e, 0), t)), n4 = fbm(vec3(p - vec2(e, 0), t));
      v += uNoiseForce * vec2(n1 - n2, n4 - n3) / (2. * e) * uDt;
      float l = length(v); if (l > uMaxVel) v *= uMaxVel / l;
      o = vec4(v, 0., 1.);
    }`,
  noiseDye: NOISE + `
    uniform sampler2D uDye; uniform float uDt, uTime, uAmount, uAspect;
    void main() {
      vec2 p = vUv * vec2(uAspect, 1.) * 1.6;
      float s = smoothstep(.52, .76, fbm(vec3(p, uTime * .08 + 3.)));
      o = vec4(texture(uDye, vUv).rgb + s * uAmount * uDt, 1.);
    }`,
  divergence: `
    uniform sampler2D uVelocity;
    void main() {
      float L = texture(uVelocity, vL).x, R = texture(uVelocity, vR).x, T = texture(uVelocity, vT).y, B = texture(uVelocity, vB).y;
      vec2 C = texture(uVelocity, vUv).xy;
      if (vL.x < 0.) L = -C.x; if (vR.x > 1.) R = -C.x; if (vT.y > 1.) T = -C.y; if (vB.y < 0.) B = -C.y;
      o = vec4(.5 * (R - L + T - B), 0., 0., 1.);
    }`,
  scale: `
    uniform sampler2D uTex; uniform float uValue;
    void main() { o = uValue * texture(uTex, vUv); }`,
  pressure: `
    uniform sampler2D uPressure, uDivergence;
    void main() {
      float L = texture(uPressure, vL).x, R = texture(uPressure, vR).x, T = texture(uPressure, vT).x, B = texture(uPressure, vB).x;
      o = vec4((L + R + B + T - texture(uDivergence, vUv).x) * .25, 0., 0., 1.);
    }`,
  gradient: `
    uniform sampler2D uPressure, uVelocity;
    void main() {
      float L = texture(uPressure, vL).x, R = texture(uPressure, vR).x, T = texture(uPressure, vT).x, B = texture(uPressure, vB).x;
      o = vec4(texture(uVelocity, vUv).xy - vec2(R - L, T - B), 0., 1.);
    }`,
  // one texel per character cell: dye density, with the faint haze cut so empty areas stay plain
  lum: `
    uniform sampler2D uDye; uniform vec2 uGrid; uniform float uContrast, uFloor;
    void main() {
      vec2 h = .25 / uGrid;
      vec3 d = (texture(uDye, vUv + vec2(-h.x, -h.y)).rgb + texture(uDye, vUv + vec2(h.x, -h.y)).rgb +
                texture(uDye, vUv + vec2(-h.x, h.y)).rgb + texture(uDye, vUv + vec2(h.x, h.y)).rgb) * .25;
      float m = max(d.r, max(d.g, d.b));
      float k = max(m - uFloor, 0.) / max(1. - uFloor, .05);
      o = vec4(1. - exp(-k * uContrast));
    }`,
  // glyph per cell from the ramp, tinted bark -> honey by density, laid over the page colour
  ascii: `
    uniform sampler2D uLum, uAtlas; uniform vec2 uOrigin, uGrid; uniform float uTile, uRampCount, uDither, uLift, uStrength;
    uniform vec3 uBg, uLo, uHi;
    float bayer4(ivec2 p) {
      int i = (p.x & 3) + 4 * (p.y & 3);
      int m[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
      return (float(m[i]) + .5) / 16.;
    }
    void main() {
      vec2 p = gl_FragCoord.xy - uOrigin;
      ivec2 cell = ivec2(floor(p / uTile));
      if (p.x < 0. || p.y < 0. || cell.x >= int(uGrid.x) || cell.y >= int(uGrid.y)) { o = vec4(uBg, 1); return; }
      float l = texelFetch(uLum, cell, 0).r;
      float idx = floor(clamp(l + (bayer4(cell) - .5) * uDither * smoothstep(.03, .12, l), 0., .9999) * uRampCount);
      int tile = int(uTile);
      ivec2 ip = ivec2(p) - cell * tile;
      float g = texelFetch(uAtlas, ivec2(int(idx) * tile + ip.x, ip.y), 0).r;
      vec3 col = mix(uLo, uHi, smoothstep(.15, .85, l));
      o = vec4(mix(uBg, col, g * mix(uLift, 1., l) * uStrength), 1.);
    }`,
};

export function createAsciiBg(canvas: HTMLCanvasElement, reduce: boolean): (now: number) => void {
  const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, depth: false, stencil: false });
  // no WebGL2 / float targets: the page just keeps its flat colour
  if (!gl || (!gl.getExtension("EXT_color_buffer_float") && !gl.getExtension("EXT_color_buffer_half_float"))) return () => {};
  gl.bindVertexArray(gl.createVertexArray());

  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
    return s;
  };
  const vs = compile(gl.VERTEX_SHADER, VS);
  const program = (fs: string): Program => {
    const p = gl.createProgram()!;
    gl.attachShader(p, vs);
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, HEAD + fs));
    gl.linkProgram(p);
    const loc: Program["loc"] = {};
    for (let i = 0, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i < n; i++) {
      const name = gl.getActiveUniform(p, i)!.name;
      loc[name] = gl.getUniformLocation(p, name);
    }
    return { p, loc };
  };
  let P: Record<keyof typeof FS, Program>;
  try {
    P = Object.fromEntries(Object.entries(FS).map(([k, v]) => [k, program(v)])) as typeof P;
  } catch (err) {
    console.warn(err);
    return () => {};
  }

  const target = (w: number, h: number, filter: number = gl.LINEAR): Target => {
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    const fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return { tex, fbo, w, h, texel: [1 / w, 1 / h], dispose() { gl.deleteTexture(tex); gl.deleteFramebuffer(fbo); } };
  };
  const double = (w: number, h: number): Double => {
    let a = target(w, h), b = target(w, h);
    return {
      w, h, texel: a.texel,
      get read() { return a; }, get write() { return b; },
      swap() { [a, b] = [b, a]; },
      dispose() { a.dispose(); b.dispose(); },
    };
  };

  const run = (pr: Program, dst: Target | null, u: Record<string, Uniform>) => {
    gl.useProgram(pr.p);
    let unit = 0;
    const texel = (u.uTexel as number[] | undefined) ?? (dst ? dst.texel : [1 / canvas.width, 1 / canvas.height]);
    if (pr.loc.uTexel) gl.uniform2fv(pr.loc.uTexel, texel);
    for (const k in u) {
      const l = pr.loc[k];
      if (!l || k === "uTexel") continue;
      const v = u[k];
      if (typeof v === "number") gl.uniform1f(l, v);
      else if ("tex" in v) {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, v.tex);
        gl.uniform1i(l, unit++);
      } else if (v.length === 2) gl.uniform2fv(l, v);
      else gl.uniform3fv(l, v);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst ? dst.fbo : null);
    gl.viewport(0, 0, dst ? dst.w : canvas.width, dst ? dst.h : canvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  let W = 1, H = 1, tile = CELL, cols = 1, rows = 1, origin = [0, 0];
  let vel: Double, dye: Double, pres: Double, divT: Target, curlT: Target, lumT: Target;
  let atlas: WebGLTexture | null = null;
  let built = false;

  const resFor = (r: number) => {
    let a = W / H;
    const flip = a < 1;
    if (flip) a = 1 / a;
    const lo = Math.round(r), hi = Math.round(r * a);
    return flip ? [lo, hi] : [hi, lo];
  };

  const buildAtlas = () => {
    const glyphs = Array.from(RAMP);
    const cv = document.createElement("canvas");
    cv.width = tile * glyphs.length;
    cv.height = tile;
    const g = cv.getContext("2d")!;
    g.fillStyle = "#000";
    g.fillRect(0, 0, cv.width, cv.height);
    g.fillStyle = "#fff";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = `500 ${Math.round(tile * 0.95)}px "IBM Plex Mono", ui-monospace, monospace`;
    glyphs.forEach((ch, i) => g.fillText(ch, i * tile + tile / 2, tile / 2 + tile * 0.04));
    if (atlas) gl.deleteTexture(atlas);
    atlas = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, atlas);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  };

  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = Math.max(1, Math.floor(innerWidth * dpr));
    H = Math.max(1, Math.floor(innerHeight * dpr));
    canvas.width = W;
    canvas.height = H;
    if (built) [vel, dye, pres, divT, curlT, lumT].forEach((t) => t.dispose());
    const [sw, sh] = resFor(SIM_RES), [dw, dh] = resFor(DYE_RES);
    vel = double(sw, sh);
    pres = double(sw, sh);
    divT = target(sw, sh);
    curlT = target(sw, sh);
    dye = double(dw, dh);
    tile = Math.max(6, Math.round(CELL * dpr));
    cols = Math.max(1, Math.floor(W / tile));
    rows = Math.max(1, Math.floor(H / tile));
    origin = [Math.floor((W - cols * tile) / 2), Math.floor((H - rows * tile) / 2)];
    lumT = target(cols, rows, gl.NEAREST);
    buildAtlas();
    built = true;
  };
  resize();
  let resizeQueued = false;
  addEventListener("resize", () => (resizeQueued = true));
  // the glyph font may arrive after the first atlas was drawn
  document.fonts?.ready.then(buildAtlas);

  // pointer stirs the fluid; the canvas itself sits under the page and takes no events
  const pointer = { x: 0.5, y: 0.5, px: 0.5, py: 0.5, has: false, moved: false };
  addEventListener("pointermove", (e) => {
    const x = e.clientX / innerWidth, y = 1 - e.clientY / innerHeight;
    if (!pointer.has) { pointer.px = x; pointer.py = y; pointer.has = true; }
    pointer.x = x;
    pointer.y = y;
    pointer.moved = true;
  }, { passive: true });

  const step = (dt: number, time: number) => {
    const aspect = W / H, simTexel = vel.texel;
    run(P.curl, curlT, { uVelocity: vel.read });
    run(P.vorticity, vel.write, { uVelocity: vel.read, uCurl: curlT, uCurlStrength: CURL, uDt: dt }); vel.swap();
    run(P.forces, vel.write, { uVelocity: vel.read, uDye: dye.read, uDt: dt, uTime: time, uAspect: aspect, uMaxVel: MAX_VEL, uUpward: UPWARD, uNoiseForce: NOISE_FORCE }); vel.swap();
    run(P.noiseDye, dye.write, { uDye: dye.read, uDt: dt, uTime: time, uAspect: aspect, uAmount: NOISE_DYE }); dye.swap();

    // ambient emitters, so the background keeps moving with nobody touching it
    for (const e of EMITTERS) {
      const pt = [0.5 + e.rx * Math.sin(time * e.ax + e.px), 0.5 + e.ry * Math.sin(time * e.ay + e.py)];
      const vx = e.rx * e.ax * Math.cos(time * e.ax + e.px) * aspect, vy = e.ry * e.ay * Math.cos(time * e.ay + e.py);
      const d = EMIT_DYE * dt;
      run(P.splat, vel.write, { uTarget: vel.read, uAspect: aspect, uPoint: pt, uColor: [vx * EMIT_FORCE * dt * 60, vy * EMIT_FORCE * dt * 60, 0], uRadius: EMIT_RADIUS }); vel.swap();
      run(P.splat, dye.write, { uTarget: dye.read, uAspect: aspect, uPoint: pt, uColor: [d, d, d], uRadius: EMIT_RADIUS }); dye.swap();
    }

    if (pointer.moved) {
      const dx = (pointer.x - pointer.px) * aspect, dy = pointer.y - pointer.py;
      if (Math.abs(dx) + Math.abs(dy) > 1e-5) {
        const pt = [pointer.x, pointer.y];
        run(P.splat, vel.write, { uTarget: vel.read, uAspect: aspect, uPoint: pt, uColor: [dx * SPLAT_FORCE, dy * SPLAT_FORCE, 0], uRadius: SPLAT_RADIUS }); vel.swap();
        run(P.splat, dye.write, { uTarget: dye.read, uAspect: aspect, uPoint: pt, uColor: [SPLAT_DYE, SPLAT_DYE, SPLAT_DYE], uRadius: SPLAT_RADIUS }); dye.swap();
      }
      pointer.px = pointer.x;
      pointer.py = pointer.y;
      pointer.moved = false;
    }

    run(P.divergence, divT, { uVelocity: vel.read });
    run(P.scale, pres.write, { uTex: pres.read, uValue: PRESSURE }); pres.swap();
    for (let i = 0; i < PRESSURE_ITERS; i++) { run(P.pressure, pres.write, { uPressure: pres.read, uDivergence: divT }); pres.swap(); }
    run(P.gradient, vel.write, { uPressure: pres.read, uVelocity: vel.read }); vel.swap();
    run(P.advect, vel.write, { uVelocity: vel.read, uSource: vel.read, uSimTexel: simTexel, uDt: dt, uDissipation: MOTION_FADE }); vel.swap();
    run(P.advect, dye.write, { uVelocity: vel.read, uSource: dye.read, uSimTexel: simTexel, uDt: dt, uDissipation: DENSITY_FADE }); dye.swap();
  };

  const draw = () => {
    const grid = [cols, rows];
    run(P.lum, lumT, { uDye: dye.read, uGrid: grid, uContrast: CONTRAST, uFloor: DENSITY_FLOOR });
    run(P.ascii, null, {
      uLum: lumT, uAtlas: { tex: atlas! }, uOrigin: origin, uGrid: grid, uTile: tile, uRampCount: RAMP.length,
      uDither: DITHER, uLift: LIFT, uStrength: STRENGTH, uBg: BG, uLo: DEEP, uHi: ACCENT,
    });
  };

  let time = 0, last = performance.now(), lastFrame = 0;
  if (reduce) {
    // reduced motion: let the noise settle into a pattern once, then hold that still frame
    for (let i = 0; i < 240; i++) { time += 1 / 30; step(1 / 30, time); }
    draw();
    addEventListener("resize", () => { resize(); for (let i = 0; i < 240; i++) { time += 1 / 30; step(1 / 30, time); } draw(); });
    return () => {};
  }

  return (now: number) => {
    if (resizeQueued) { resize(); resizeQueued = false; }
    if (now - lastFrame < 1000 / 30) return;
    lastFrame = now;
    const dt = Math.min((now - last) / 1000, 1 / 15);
    last = now;
    time += dt;
    step(Math.min(dt, 1 / 30), time);
    draw();
  };
}
