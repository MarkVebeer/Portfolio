// Hero intro: a low-poly beaver hops along a log and chews the name into it, letter by letter,
// throwing wood chips and sawdust. Built from primitives (no model files), lit flat, in the site palette.
import * as THREE from "three";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import fontJson from "three/examples/fonts/helvetiker_bold.typeface.json";
import { state } from "./state";
import { HORIZON, SHORE, makeLandscape, wrapX } from "./landscape";

// natural colours: brown beaver with orange teeth, bark-brown log, pale freshly cut wood
const C = {
  fur: 0x6b4428,
  furLight: 0x9a6a43,
  tail: 0x3a2e2a,
  tailRidge: 0x2a201d,
  teeth: 0xe0892f,
  white: 0xf3efe6,
  dark: 0x1a1412,
  bark: 0x5a3d27,
  wood: 0xe2c08c,
  woodMid: 0xc49461,
  groove: 0x2e1d12,
};

const R = 1.15; // log radius
const WATER_Y = -R * 0.45; // the log floats half-sunk in the river
/** how fast the log drifts downstream (world units per second); the scenery scrolls past at this speed */
const DRIFT = 1.1;
const TEXT_SIZE = 0.78, TEXT_DEPTH = 0.16;
// timeline (seconds)
const T_ENTER = 0.7, T_WALK = 0.32, T_CHEW = 0.5, T_EXIT = 0.6;

const ease = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const flat = (color: number, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, metalness: 0, ...extra });

/** beaver detail: multiplies every part's segment count (1 = chunky low-poly) */
const DETAIL = 2.2;

/** smooth-shaded material for the beaver: no facets, so its curves don't step along the edges */
const soft = (color: number, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...extra });

function sphere(r: number, color: number | THREE.Material, seg = 10): THREE.Mesh {
  const mat = typeof color === "number" ? soft(color) : color;
  const w = Math.round(seg * DETAIL);
  return new THREE.Mesh(new THREE.SphereGeometry(r, w, Math.max(8, Math.round(w * 0.75))), mat);
}

/* ---------------- beaver ---------------- */
export function makeBeaver() {
  const fur = soft(C.fur), muzzle = soft(C.furLight), dark = soft(C.dark, { roughness: 0.4 }), white = soft(C.white, { roughness: 0.5 }), teeth = soft(C.teeth, { roughness: 0.45 });
  const root = new THREE.Group();   // position on the log, facing +x
  const body = new THREE.Group();   // breathes, bobs
  root.add(body);

  const torso = sphere(0.5, fur, 12);
  torso.scale.set(1.25, 0.92, 0.88);
  body.add(torso);
  const belly = sphere(0.36, muzzle, 10);
  belly.scale.set(1.15, 0.85, 0.7);
  belly.position.set(0.18, -0.12, 0.2);
  body.add(belly);

  // feet
  for (const [x, z] of [[0.35, 0.28], [0.35, -0.28], [-0.35, 0.3], [-0.35, -0.3]]) {
    const f = sphere(0.14, dark, 8);
    f.scale.set(1.5, 0.6, 1);
    f.position.set(x, -0.44, z);
    body.add(f);
  }

  // tail: pivots at the rump so it can swish and slap
  const tailPivot = new THREE.Group();
  tailPivot.position.set(-0.55, -0.22, 0);
  const tail = sphere(0.5, soft(C.tail), 10);
  tail.scale.set(1.0, 0.14, 0.62);
  tail.position.set(-0.45, -0.05, 0);
  tailPivot.add(tail);
  // crosshatch ridges on the paddle
  const ridgeMat = soft(C.tailRidge);
  for (let i = -2; i <= 2; i++) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.02, 0.025), ridgeMat);
    r.position.set(-0.5, 0.03, i * 0.11);
    tailPivot.add(r);
  }
  body.add(tailPivot);

  // head: pivots at the neck so it can chew and look around
  const head = new THREE.Group();
  head.position.set(0.45, 0.22, 0);
  const skull = sphere(0.36, fur, 12);
  skull.position.set(0.18, 0.06, 0);
  head.add(skull);
  const snout = sphere(0.2, muzzle, 10);
  snout.scale.set(1.1, 0.85, 1.05);
  snout.position.set(0.45, -0.02, 0);
  head.add(snout);
  const nose = sphere(0.075, dark, 8);
  nose.position.set(0.63, 0.06, 0);
  head.add(nose);
  for (const z of [0.045, -0.045]) {
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.13, 0.075), teeth);
    tooth.position.set(0.58, -0.17, z);
    head.add(tooth);
  }
  const eyes: THREE.Object3D[] = [];
  for (const z of [0.22, -0.22]) {
    const eye = new THREE.Group();
    eye.position.set(0.36, 0.17, z);
    eye.add(sphere(0.065, dark, 8));
    const glint = sphere(0.022, white, 6);
    glint.position.set(0.04, 0.03, z > 0 ? 0.03 : -0.03);
    eye.add(glint);
    head.add(eye);
    eyes.push(eye);
    const ear = sphere(0.09, fur, 8);
    ear.scale.set(0.7, 1, 1);
    ear.position.set(0.02, 0.36, z * 1.1);
    head.add(ear);
  }
  // whisker dots
  for (const z of [0.12, -0.12]) {
    const d = sphere(0.018, dark, 5);
    d.position.set(0.6, -0.04, z);
    head.add(d);
  }
  body.add(head);

  root.scale.setScalar(1);
  return { root, body, head, tailPivot, eyes };
}

/* ---------------- log ---------------- */
function ringTexture(): THREE.CanvasTexture {
  const s = 256, cv = document.createElement("canvas");
  cv.width = cv.height = s;
  const g = cv.getContext("2d")!;
  g.fillStyle = "#d9b27c";
  g.fillRect(0, 0, s, s);
  g.strokeStyle = "#b5874f";
  for (let r = 10; r < s / 2; r += 13) {
    g.lineWidth = 2 + (r % 3);
    g.beginPath();
    g.ellipse(s / 2 + 3, s / 2 - 2, r, r * 0.96, 0, 0, Math.PI * 2);
    g.stroke();
  }
  g.strokeStyle = "#4a3120";
  g.lineWidth = 14;
  g.beginPath();
  g.arc(s / 2, s / 2, s / 2 - 7, 0, Math.PI * 2);
  g.stroke();
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeLog(length: number) {
  const group = new THREE.Group();
  const geo = new THREE.CylinderGeometry(R, R, length, 22, 5, true);
  // rough bark: nudge each vertex in/out a little
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const seed = (x: number) => (Math.sin(x * 12.9898) * 43758.5453) % 1;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const k = 1 + Math.abs(seed(Math.round(v.y * 100) * 31 + Math.round(Math.atan2(v.z, v.x) * 100))) * 0.03 - 0.01;
    pos.setXYZ(i, v.x * k, v.y, v.z * k);
  }
  geo.computeVertexNormals();
  const bark = new THREE.Mesh(geo, flat(C.bark));
  bark.rotation.z = Math.PI / 2;
  group.add(bark);

  const capMat = new THREE.MeshStandardMaterial({ map: ringTexture(), roughness: 0.9 });
  for (const s of [-1, 1]) {
    const cap = new THREE.Mesh(new THREE.CircleGeometry(R * 1.01, 26), capMat);
    cap.position.x = (s * length) / 2;
    cap.rotation.y = (s * Math.PI) / 2;
    group.add(cap);
  }

  // a stubby branch for character
  const stub = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, 0.5, 8), flat(C.bark));
  stub.position.set(-length * 0.2, R * 0.78, -R * 0.55);
  stub.rotation.set(-0.5, 0, 0.35);
  group.add(stub);
  const stubCap = new THREE.Mesh(new THREE.CircleGeometry(0.13, 8), flat(C.woodMid));
  stubCap.position.set(0, 0.251, 0);
  stubCap.rotation.x = -Math.PI / 2;
  stub.add(stubCap);
  return group;
}

/* ---------------- pond ---------------- */
const rgb = (h: number) => new THREE.Vector3((h >> 16) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255);

/** Stream under the log: flowing streaks, glints and foam where it meets the log, filling the whole view. */
function makeWater(logHalf: number) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uUnder: { value: 0 },
      uMurk: { value: rgb(MURK) },
      uLogHalf: { value: logHalf },
      uLogX: { value: 0 },
      uLogZ: { value: Math.sqrt(R * R - WATER_Y * WATER_Y) },
      uDeep: { value: rgb(0x1d3437) },
      uShallow: { value: rgb(0x3d6461) },
      uGlint: { value: rgb(0xcfe2d8) },
      uFoam: { value: rgb(0xe9ede4) },
      uSky: { value: rgb(0xa9c3cf) },
    },
    vertexShader: `
      varying vec2 vP; varying float vDist;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.);
        vP = w.xz;
        vec4 v = viewMatrix * w;
        vDist = length(v.xyz);
        gl_Position = projectionMatrix * v;
      }`,
    fragmentShader: `
      uniform float uTime, uUnder, uLogHalf, uLogX, uLogZ; uniform vec3 uDeep, uShallow, uGlint, uFoam, uSky, uMurk;
      varying vec2 vP; varying float vDist;
      float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
        return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p) { float s = 0., a = .5; for (int i = 0; i < 4; i++) { s += a * n(p); p *= 2.1; a *= .5; } return s; }
      void main() {
        vec2 p = vP;
        float t = uTime;
        // the stream runs left to right
        float warp = fbm(vec2(p.x * .7 - t * .12, p.y * 1.8));
        float streak = sin((p.x - t * .22) * 3.4 + warp * 7. + p.y * 2.2);
        float fine = fbm(vec2(p.x * 3. - t * .4, p.y * 6.));
        vec3 col = mix(uDeep, uShallow, smoothstep(-5., 2.8, p.y) * .85 + warp * .25);
        // glints stay subtle up close, where perspective makes them big
        col = mix(col, uGlint, smoothstep(.85, 1., streak) * (.15 + .4 * fine) * mix(.35, 1., smoothstep(8., 1., p.y)));
        // foam and a soft shade where the water meets the front of the log
        float onLog = 1. - smoothstep(uLogHalf - .05, uLogHalf + .15, abs(p.x - uLogX));
        float d = p.y - uLogZ;
        col *= 1. - .35 * onLog * smoothstep(.7, 0., d) * step(0., d);
        float foam = onLog * (1. - smoothstep(0., .14 + fine * .12, abs(d))) * (.55 + .45 * fine);
        col = mix(col, uFoam, foam * .85);
        // farther water reflects more of the sky
        col = mix(col, uSky, smoothstep(-1.5, -4.6, p.y) * .4);
        if (!gl_FrontFacing) {
          // seen from below: the bright, rippling underside of the surface
          float shim = smoothstep(.1, 1., streak * .5 + .5) * (.35 + .65 * fine);
          col = mix(uMurk * 2.2, vec3(.6, .76, .68), shim * .75);
        }
        col = mix(col, uMurk, uUnder * smoothstep(1.5, 15., vDist));
        gl_FragColor = vec4(col, 1.);
      }`,
  });
  // wide enough to run off both sides of the screen, from the far bank to past the camera
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(260, 30, 1, 1), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, WATER_Y, 9);
  return { mesh, mat };
}

type Sway = { obj: THREE.Object3D; phase: number; amp: number; speed: number };

/** A strip of river life that scrolls past and wraps around: reed clumps and cattails, lily pads, stones,
    grass, willow thickets, beaver-chewed stumps, granite boulders and a beaver lodge. Repeats every SPAN units. */
const SPAN = 46;
function makeRiver() {
  const group = new THREE.Group();
  const sway: Sway[] = [];
  const items: { obj: THREE.Object3D; x: number; bob?: number }[] = [];
  const rand = (a: number, b: number) => a + Math.random() * (b - a);
  const greens = [0x5d7a3a, 0x6f8c44, 0x4e6a30, 0x7f9a52, 0x8a9a4a];
  const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
  const place = (obj: THREE.Object3D, x: number, bob?: number) => {
    group.add(obj);
    items.push({ obj, x, bob });
  };

  const tuft = (n: number, hMin: number, hMax: number) => {
    const g = new THREE.Group();
    for (let k = 0; k < n; k++) {
      const hgt = rand(hMin, hMax);
      const geo = new THREE.ConeGeometry(rand(0.025, 0.045), hgt, 3);
      geo.translate(0, hgt / 2, 0);
      const blade = new THREE.Mesh(geo, flat(pick(greens)));
      blade.position.set(rand(-0.12, 0.12), 0, rand(-0.12, 0.12));
      blade.rotation.set(rand(-0.4, 0.4), rand(0, 3), rand(-0.4, 0.4));
      g.add(blade);
    }
    sway.push({ obj: g, phase: rand(0, 6), amp: rand(0.04, 0.09), speed: rand(1.2, 1.9) });
    return g;
  };

  const reed = (hgt: number) => {
    const g = new THREE.Group();
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.024, hgt, 5), flat(0x6f8a43));
    stalk.position.y = hgt / 2;
    g.add(stalk);
    if (Math.random() < 0.55) {
      const head = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.26, 4, 8), flat(0x5a3a22));
      head.position.y = hgt - 0.28;
      g.add(head);
    }
    for (let l = 0; l < 2; l++) {
      const lh = hgt * rand(0.55, 0.85);
      const geo = new THREE.ConeGeometry(0.03, lh, 3);
      geo.translate(0, lh / 2, 0);
      const leaf = new THREE.Mesh(geo, flat(pick(greens)));
      leaf.rotation.set(rand(-0.2, 0.2), rand(0, 3), rand(-0.35, 0.35));
      g.add(leaf);
    }
    sway.push({ obj: g, phase: rand(0, 6), amp: rand(0.025, 0.05), speed: rand(0.8, 1.3) });
    return g;
  };

  // reed clumps standing in the water behind the log
  for (let c = 0; c < 9; c++) {
    const cx = -SPAN / 2 + (c + rand(0.1, 0.9)) * (SPAN / 9), cz = rand(-3.8, -1.5);
    const n = 2 + Math.floor(Math.random() * 4);
    for (let k = 0; k < n; k++) {
      const r = reed(rand(1.3, 2.6));
      r.position.set(0, WATER_Y - 0.05, cz + rand(-0.4, 0.4));
      place(r, cx + rand(-0.6, 0.6));
    }
  }

  // grass along the far shore
  for (let k = 0; k < 26; k++) {
    const t = tuft(7, 0.3, 0.75);
    t.position.set(0, WATER_Y + 0.12, SHORE - rand(0.1, 0.9));
    place(t, rand(-SPAN / 2, SPAN / 2));
  }

  // mossy stones poking out of the water, some with a tuft of grass
  for (let k = 0; k < 6; k++) {
    const g = new THREE.Group();
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rand(0.18, 0.38), 0), flat(pick([0x6d665e, 0x5c564f, 0x7a7268])));
    rock.scale.y = 0.6;
    rock.rotation.set(rand(0, 3), rand(0, 3), 0);
    g.add(rock);
    if (Math.random() < 0.6) {
      const t = tuft(5, 0.2, 0.45);
      t.position.y = 0.08;
      g.add(t);
    }
    g.position.set(0, WATER_Y + 0.02, Math.random() < 0.5 ? rand(-4, -2.2) : rand(1.8, 3.2));
    place(g, rand(-SPAN / 2, SPAN / 2));
  }

  // willow thickets along the far shore
  for (let k = 0; k < 7; k++) {
    const g = new THREE.Group();
    const n = 4 + Math.floor(Math.random() * 4);
    for (let b = 0; b < n; b++) {
      const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(rand(0.28, 0.5), 0), flat(pick([0x8a9a5a, 0x9aa86a, 0x7d8f50, 0xa3ae72])));
      leaf.scale.set(0.8, rand(1.3, 1.9), 0.8);
      leaf.position.set(rand(-0.7, 0.7), rand(0.3, 0.8), rand(-0.3, 0.3));
      g.add(leaf);
    }
    g.position.set(0, WATER_Y + 0.05, SHORE - rand(0.2, 0.9));
    place(g, rand(-SPAN / 2, SPAN / 2));
    sway.push({ obj: g, phase: rand(0, 6), amp: 0.03, speed: rand(0.7, 1.1) });
  }

  // stumps a beaver has already chewed to a point, with chips at their feet
  for (let k = 0; k < 3; k++) {
    const g = new THREE.Group();
    const r = rand(0.13, 0.2), h = rand(0.25, 0.45);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.15, h, 9), flat(0x4a3221));
    trunk.position.y = h / 2;
    g.add(trunk);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(r, r * 2.2, 9), flat(0xd4ab72));
    tip.position.y = h + r * 1.1;
    tip.rotation.z = rand(-0.15, 0.15);
    g.add(tip);
    for (let c = 0; c < 6; c++) {
      const chip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.05), flat(pick([0xd4ab72, 0xc49461])));
      chip.position.set(rand(-0.35, 0.35), 0.01, rand(-0.35, 0.35));
      chip.rotation.y = rand(0, 3);
      g.add(chip);
    }
    g.position.set(0, WATER_Y + 0.12, SHORE - rand(0.6, 1.4));
    place(g, rand(-SPAN / 2, SPAN / 2));
  }

  // a beaver lodge: a dome of sticks and mud half in the water near the far bank
  {
    const g = new THREE.Group();
    const mud = new THREE.Mesh(new THREE.SphereGeometry(1.25, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), flat(0x4a3a2c));
    mud.scale.y = 0.62;
    g.add(mud);
    const stickCols = [0x6b5a45, 0x8a775c, 0x5a4836, 0x7a6750, 0xb9a27f];
    const up = new THREE.Vector3(0, 1, 0), n = new THREE.Vector3(), t = new THREE.Vector3();
    for (let k = 0; k < 90; k++) {
      // a point on the dome, with the stick lying roughly across its surface
      const a = rand(0, Math.PI * 2), e = Math.acos(rand(0.05, 1));
      n.set(Math.sin(e) * Math.cos(a), Math.cos(e), Math.sin(e) * Math.sin(a));
      const len = rand(0.7, 1.5);
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(rand(0.025, 0.045), rand(0.03, 0.05), len, 5), flat(pick(stickCols)));
      stick.position.set(n.x * 1.22, n.y * 1.22 * 0.62, n.z * 1.22);
      t.crossVectors(n, up).normalize();
      if (t.lengthSq() < 0.01) t.set(1, 0, 0);
      t.applyAxisAngle(n, rand(-1.2, 1.2));
      stick.quaternion.setFromUnitVectors(up, t);
      g.add(stick);
    }
    g.position.set(0, WATER_Y - 0.05, SHORE + 1.0);
    g.rotation.y = rand(0, 6);
    place(g, rand(-SPAN / 2, SPAN / 2));
  }

  // granite boulders with lichen, Canadian Shield style
  for (let k = 0; k < 4; k++) {
    const g = new THREE.Group();
    const big = new THREE.Mesh(new THREE.DodecahedronGeometry(rand(0.35, 0.6), 0), flat(pick([0x8a8580, 0x7d7873, 0x948f88])));
    big.scale.set(1.3, 0.7, 1);
    big.rotation.set(rand(0, 3), rand(0, 3), 0);
    g.add(big);
    const lichen = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16, 0), flat(0x9aa06a));
    lichen.scale.y = 0.25;
    lichen.position.set(rand(-0.15, 0.15), 0.32, rand(-0.1, 0.1));
    g.add(lichen);
    g.position.set(0, WATER_Y + 0.08, SHORE + rand(-0.3, 0.6));
    place(g, rand(-SPAN / 2, SPAN / 2));
  }

  // lily pads in front, a couple with flowers
  for (let k = 0; k < 11; k++) {
    const pad = new THREE.Group();
    const leaf = new THREE.Mesh(new THREE.CircleGeometry(rand(0.22, 0.36), 24, rand(0, 6), Math.PI * 2 - 0.45), flat(pick([0x5c7d3a, 0x4f6f32, 0x6a8a42]), { side: THREE.DoubleSide }));
    leaf.rotation.x = -Math.PI / 2;
    pad.add(leaf);
    if (k % 4 === 1) {
      const petalMat = flat(0xf3e4e6);
      for (let p = 0; p < 7; p++) {
        const petal = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.16, 4), petalMat);
        const ang = (p / 7) * Math.PI * 2;
        petal.position.set(Math.cos(ang) * 0.06, 0.06, Math.sin(ang) * 0.06);
        petal.rotation.set(Math.sin(ang) * 0.7, 0, -Math.cos(ang) * 0.7);
        pad.add(petal);
      }
      const center = sphere(0.04, 0xe8c547, 6);
      center.position.y = 0.07;
      pad.add(center);
    }
    pad.position.set(0, WATER_Y + 0.012, rand(1.5, 3.6));
    place(pad, rand(-SPAN / 2, SPAN / 2), rand(0, 6));
  }

  const update = (time: number, offset: number) => {
    for (const it of items) {
      it.obj.position.x = wrapX(it.x - offset, SPAN);
      if (it.bob !== undefined) {
        it.obj.rotation.y = Math.sin(time * 0.3 + it.bob) * 0.25;
        it.obj.position.y = WATER_Y + 0.012 + Math.sin(time * 1.4 + it.bob) * 0.008;
      }
    }
    for (const sw of sway) {
      sw.obj.rotation.z = Math.sin(time * sw.speed + sw.phase) * sw.amp;
      sw.obj.rotation.x = Math.sin(time * sw.speed * 0.7 + sw.phase * 1.3) * sw.amp * 0.5;
    }
  };
  return { group, update };
}

/* ---------------- underwater (for the scroll dive) ---------------- */
/** murky river-water colour the dive fades into, close to the page background */
const MURK = 0x1f2a24;

/** Seen once the camera dips below the surface: a muddy riverbed and rising bubbles.
    `update(time, dt, under)` fades it all in with `under` (0 above water, 1 fully under). */
function makeUnderwater() {
  const group = new THREE.Group();
  const rand = (a: number, b: number) => a + Math.random() * (b - a);

  // riverbed: lumpy mud with a few stones, mostly lost in the murk
  const bedGeo = new THREE.PlaneGeometry(120, 40, 60, 20);
  bedGeo.rotateX(-Math.PI / 2);
  const bp = bedGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < bp.count; i++) bp.setY(i, rand(-0.25, 0.25) + Math.sin(bp.getX(i) * 0.4) * 0.3);
  bedGeo.computeVertexNormals();
  const bed = new THREE.Mesh(bedGeo, flat(0x3b3424, { roughness: 1 }));
  bed.position.set(0, WATER_Y - 5.5, 0);
  group.add(bed);
  for (let k = 0; k < 24; k++) {
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(rand(0.2, 0.6), 0), flat(0x4d4a40));
    stone.position.set(rand(-14, 14), WATER_Y - 5.4, rand(-6, 8));
    stone.scale.y = 0.5;
    group.add(stone);
  }

  // bubbles drifting up to the surface
  const N = 180;
  const geo = new THREE.BufferGeometry();
  const p = new Float32Array(N * 3), speed = new Float32Array(N), seed = new Float32Array(N);
  const reset = (i: number, anywhere: boolean) => {
    p[i * 3] = rand(-8, 8);
    p[i * 3 + 1] = anywhere ? rand(WATER_Y - 5.2, WATER_Y - 0.2) : WATER_Y - 5.2;
    p[i * 3 + 2] = rand(-2, 6);
    speed[i] = rand(0.35, 0.9);
    seed[i] = rand(0, 6);
  };
  for (let i = 0; i < N; i++) reset(i, true);
  geo.setAttribute("position", new THREE.BufferAttribute(p, 3));
  const bubbleMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uAlpha: { value: 0 }, uScale: { value: 1 } },
    vertexShader: `
      uniform float uScale;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.);
        gl_PointSize = uScale * 40. / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform float uAlpha;
      void main() {
        float d = length(gl_PointCoord - .5);
        if (d > .5) discard;
        float ring = smoothstep(.5, .38, d) - smoothstep(.34, .18, d) * .7;
        float glint = smoothstep(.12, 0., length(gl_PointCoord - vec2(.35, .35)));
        gl_FragColor = vec4(vec3(.85, .95, .9), (ring * .6 + glint) * uAlpha);
      }`,
  });
  const bubbles = new THREE.Points(geo, bubbleMat);
  bubbles.frustumCulled = false;
  group.add(bubbles);

  const update = (time: number, dt: number, under: number) => {
    group.visible = under > 0.001;
    if (!group.visible) return;
    bubbleMat.uniforms.uAlpha.value = under;
    for (let i = 0; i < N; i++) {
      p[i * 3 + 1] += speed[i] * dt;
      p[i * 3] += Math.sin(time * 2 + seed[i]) * 0.15 * dt;
      if (p[i * 3 + 1] > WATER_Y - 0.08) reset(i, false);
    }
    (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  };
  return { group, update, bubbleMat };
}

/* ---------------- particles ---------------- */
const CHIP_COUNT = 220;
function makeChips() {
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.09, 0.025, 0.06), flat(0xffffff, { roughness: 0.9 }), CHIP_COUNT);
  mesh.frustumCulled = false;
  const p = new Float32Array(CHIP_COUNT * 3), vel = new Float32Array(CHIP_COUNT * 3), rot = new Float32Array(CHIP_COUNT * 3), spin = new Float32Array(CHIP_COUNT * 3);
  const life = new Float32Array(CHIP_COUNT), afloat = new Uint8Array(CHIP_COUNT), floatY = WATER_Y + 0.02;
  let clock = 0;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), t = new THREE.Vector3();
  const colA = new THREE.Color(C.wood), colB = new THREE.Color(C.bark), tmp = new THREE.Color();
  let next = 0;
  for (let i = 0; i < CHIP_COUNT; i++) {
    mesh.setMatrixAt(i, m.makeScale(0, 0, 0));
    mesh.setColorAt(i, colA);
  }

  const spawn = (x: number, y: number, z: number, n: number) => {
    for (let k = 0; k < n; k++) {
      const i = next;
      next = (next + 1) % CHIP_COUNT;
      p[i * 3] = x + (Math.random() - 0.5) * 0.15;
      p[i * 3 + 1] = y + (Math.random() - 0.5) * 0.4;
      p[i * 3 + 2] = z;
      vel[i * 3] = (Math.random() - 0.5) * 3;
      vel[i * 3 + 1] = 1.5 + Math.random() * 2.8;
      vel[i * 3 + 2] = 0.8 + Math.random() * 1.8;
      for (let a = 0; a < 3; a++) { rot[i * 3 + a] = Math.random() * 6; spin[i * 3 + a] = (Math.random() - 0.5) * 18; }
      life[i] = 1.4 + Math.random() * 0.6;
      afloat[i] = 0;
      mesh.setColorAt(i, tmp.copy(colA).lerp(colB, Math.random() < 0.25 ? 0.85 : Math.random() * 0.35));
    }
    mesh.instanceColor!.needsUpdate = true;
  };

  const update = (dt: number) => {
    clock += dt;
    for (let i = 0; i < CHIP_COUNT; i++) {
      if (life[i] <= 0) continue;
      life[i] -= dt;
      const j = i * 3;
      if (afloat[i]) {
        // bob on the surface, lie flat and drift downstream
        p[j] -= 0.25 * dt;
        vel[j + 2] *= 0.96;
        p[j + 2] += vel[j + 2] * dt;
        p[j + 1] = floatY + Math.sin(clock * 3 + i) * 0.008;
        rot[j] *= 0.92; rot[j + 2] *= 0.92;
        rot[j + 1] += spin[j + 1] * 0.05 * dt;
      } else {
        vel[j + 1] -= 9.5 * dt;
        p[j] += vel[j] * dt; p[j + 1] += vel[j + 1] * dt; p[j + 2] += vel[j + 2] * dt;
        for (let a = 0; a < 3; a++) rot[j + a] += spin[j + a] * dt;
        if (p[j + 1] < floatY && p[j + 2] > 0) {
          afloat[i] = 1;
          vel[j + 2] *= 0.3;
          life[i] = 2.5 + Math.random() * 2;
        }
      }
      const k = Math.min(1, life[i] / 0.6);
      m.compose(t.set(p[j], p[j + 1], p[j + 2]), q.setFromEuler(e.set(rot[j], rot[j + 1], rot[j + 2])), s.setScalar(k));
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  return { mesh, spawn, update };
}

const DUST_COUNT = 400;
function makeDust() {
  const geo = new THREE.BufferGeometry();
  const p = new Float32Array(DUST_COUNT * 3), vel = new Float32Array(DUST_COUNT * 3), life = new Float32Array(DUST_COUNT), max = new Float32Array(DUST_COUNT);
  geo.setAttribute("position", new THREE.BufferAttribute(p, 3));
  geo.setAttribute("life", new THREE.BufferAttribute(life, 1));
  geo.setAttribute("maxLife", new THREE.BufferAttribute(max, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uColor: { value: new THREE.Color(0xeedcb5) }, uScale: { value: 1 } },
    vertexShader: `
      attribute float life; attribute float maxLife; varying float vA; uniform float uScale;
      void main() {
        vA = maxLife > 0. ? clamp(life / maxLife, 0., 1.) : 0.;
        vec4 mv = modelViewMatrix * vec4(position, 1.);
        gl_PointSize = uScale * (0.6 + vA) * 26. / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor; varying float vA;
      void main() {
        float d = length(gl_PointCoord - .5);
        if (d > .5) discard;
        gl_FragColor = vec4(uColor, vA * .7 * smoothstep(.5, .1, d));
      }`,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  let next = 0;

  const spawn = (x: number, y: number, z: number, n: number) => {
    for (let k = 0; k < n; k++) {
      const i = next;
      next = (next + 1) % DUST_COUNT;
      p[i * 3] = x + (Math.random() - 0.5) * 0.3;
      p[i * 3 + 1] = y + (Math.random() - 0.5) * 0.5;
      p[i * 3 + 2] = z + Math.random() * 0.2;
      vel[i * 3] = (Math.random() - 0.5) * 0.8;
      vel[i * 3 + 1] = 0.2 + Math.random() * 0.7;
      vel[i * 3 + 2] = 0.2 + Math.random() * 0.6;
      max[i] = life[i] = 1 + Math.random() * 1.4;
    }
    (geo.attributes.maxLife as THREE.BufferAttribute).needsUpdate = true;
  };

  const update = (dt: number) => {
    for (let i = 0; i < DUST_COUNT; i++) {
      if (life[i] <= 0) continue;
      life[i] -= dt;
      const j = i * 3;
      vel[j] *= 0.98; vel[j + 2] *= 0.98;
      p[j] += vel[j] * dt; p[j + 1] += vel[j + 1] * dt; p[j + 2] += vel[j + 2] * dt;
    }
    (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (geo.attributes.life as THREE.BufferAttribute).needsUpdate = true;
  };
  return { points, spawn, update, mat };
}

/* ---------------- scene ---------------- */
export function createBeaver(canvas: HTMLCanvasElement, name: string, reduce: boolean): ((now: number) => void) | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  } catch {
    return null;
  }
  renderer.setClearColor(HORIZON, 1);
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  // golden-hour haze: distant trees and hills fade toward the horizon colour
  scene.fog = new THREE.Fog(HORIZON, 30, 230);
  scene.add(new THREE.HemisphereLight(0xdfeaf5, 0x3a4a2a, 1.5));
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.3);
  sun.position.set(3, 6, 7);
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0xffd9a8, 0.9);
  rim.position.set(-5, 3, -4);
  scene.add(rim);

  // letters, laid out with the font's own advances; each one is revealed by a shared clipping plane
  const font = new FontLoader().parse(fontJson as never);
  const scale = TEXT_SIZE / font.data.resolution;
  const clip = new THREE.Plane(new THREE.Vector3(-1, 0, 0), -100);
  const letterMat = flat(C.wood, { clippingPlanes: [clip], roughness: 0.9 });
  const grooveMat = flat(C.groove, { clippingPlanes: [clip] });
  const letters: { mesh: THREE.Mesh; min: number; max: number; mid: number }[] = [];
  const chars = Array.from(name);
  let cursor = 0;
  const glyphs = font.data.glyphs as Record<string, { ha: number }>;
  const raw = chars.map((ch) => {
    const geo = new TextGeometry(ch, { font, size: TEXT_SIZE, depth: TEXT_DEPTH, curveSegments: 6, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.012, bevelSegments: 2 });
    geo.computeBoundingBox();
    const x = cursor;
    cursor += (glyphs[ch]?.ha ?? font.data.resolution * 0.6) * scale + 0.04;
    return { geo, x };
  });
  const textWidth = cursor - 0.04;
  const length = textWidth + 0.9;
  const textGroup = new THREE.Group();
  for (const { geo, x } of raw) {
    const mesh = new THREE.Mesh(geo, letterMat);
    const bb = geo.boundingBox!;
    const ox = x - textWidth / 2;
    mesh.position.set(ox, -TEXT_SIZE * 0.42, R - 0.07);
    textGroup.add(mesh);
    // dark groove just behind each letter so it reads as cut into the bark
    const groove = new THREE.Mesh(geo, grooveMat);
    groove.position.copy(mesh.position).add(new THREE.Vector3(0.035, -0.035, -0.04));
    groove.scale.set(1.04, 1.04, 1);
    textGroup.add(groove);
    letters.push({ mesh, min: ox + bb.min.x - 0.05, max: ox + bb.max.x + 0.05, mid: ox + (bb.min.x + bb.max.x) / 2 });
  }

  const log = makeLog(length);
  const water = makeWater(length / 2);
  const river = makeRiver();
  const land = makeLandscape(WATER_Y);
  const raft = new THREE.Group();
  raft.add(log, textGroup);
  const beaver = makeBeaver();
  const chips = makeChips();
  const dust = makeDust();
  const deep = makeUnderwater();
  raft.add(beaver.root);
  scene.add(land.group, raft, water.mesh, river.group, deep.group, chips.mesh, dust.points);

  // short near plane so the water just under the camera isn't clipped away as it skims the surface
  const camera = new THREE.PerspectiveCamera(28, 1, 0.02, 600);
  const target = new THREE.Vector3(0, 0.9, 0);
  let exitX = 20, camD = 12;
  const fit = () => {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    // render above screen resolution (on top of the 4x MSAA) so edges come out smooth; capped to keep it fast
    renderer.setPixelRatio(Math.min((devicePixelRatio || 1) * 1.5, 2.5));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const needW = length + 2.6, needH = 2 * R + 5;
    const d = Math.max(needW / (2 * tan * camera.aspect), needH / (2 * tan));
    camD = d;
    camera.position.set(0, 1.5, d);
    exitX = d * tan * camera.aspect + length / 2 + 2.5;
    camera.lookAt(target);
    camera.updateProjectionMatrix();
    dust.mat.uniforms.uScale.value = renderer.getPixelRatio() * (h / 900) * 2;
    deep.bubbleMat.uniforms.uScale.value = renderer.getPixelRatio() * (h / 900) * 2;
  };
  fit();
  addEventListener("resize", fit);

  // ----- timeline -----
  const topY = R + 0.42 * beaver.root.scale.y; // beaver standing on the log
  const startX = -length / 2 - 1.1, startY = WATER_Y - 0.5, perchX = length / 2 - 0.4, landX = -length / 2 + 0.4;
  const chewZ = R * 0.55;
  const T_LETTERS = letters.length * (T_WALK + T_CHEW);
  const T_DONE = T_ENTER + T_LETTERS + T_EXIT;

  let slap = -10, nextBlink = 2.5;
  canvas.addEventListener("pointerdown", () => {
    slap = clock;
    const bx = beaver.root.position.x - 0.6 + raft.position.x;
    chips.spawn(bx, topY - 0.2 + raft.position.y, chewZ + 0.3, 14);
    dust.spawn(bx, topY - 0.2 + raft.position.y, chewZ + 0.3, 20);
  });

  const hop = (u: number, hops: number, h: number) => Math.abs(Math.sin(u * Math.PI * hops)) * h;
  let lastSpawn = 0, splashed = false;

  /** Pose everything for time t (seconds since start). */
  const pose = (t: number, dt: number) => {
    const b = beaver.root, head = beaver.head;
    let x = perchX, y = topY, z = chewZ, yaw = -Math.PI / 2, pitch = 0, chewing = -1;

    if (t < T_ENTER) {
      // leap out of the river onto the log, with a splash
      const u = ease(t / T_ENTER);
      x = lerp(startX, landX, u);
      y = lerp(startY, topY, Math.min(1, u * 1.4)) + Math.sin(u * Math.PI) * 0.5;
      yaw = -0.35;
      if (!splashed && t > 0.08) {
        splashed = true;
        dust.spawn(startX + 0.2 + raft.position.x, WATER_Y + 0.1, chewZ + 0.2, 40);
      }
    } else if (t < T_ENTER + T_LETTERS) {
      const local = t - T_ENTER;
      const i = Math.min(letters.length - 1, Math.floor(local / (T_WALK + T_CHEW)));
      const k = local - i * (T_WALK + T_CHEW);
      const from = i === 0 ? landX : letters[i - 1].mid;
      if (k < T_WALK) {
        const u = ease(k / T_WALK);
        x = lerp(from, letters[i].mid, u);
        y = topY + hop(u, 1, 0.22);
        yaw = -0.35;
      } else {
        const u = (k - T_WALK) / T_CHEW;
        x = letters[i].mid;
        yaw = lerp(-0.35, -1.05, ease(u * 4)); // turn toward the front to bite
        pitch = 0.75 + Math.sin(u * Math.PI * 9) * 0.22;
        chewing = i;
        // reveal this letter left to right while chewing
        clip.constant = lerp(letters[i].min, letters[i].max, ease(u)) + raft.position.x;
        lastSpawn += dt;
        if (lastSpawn > 0.035) {
          lastSpawn = 0;
          chips.spawn(clip.constant, raft.position.y, R + 0.12, 3);
          dust.spawn(clip.constant, raft.position.y, R + 0.12, 5);
        }
      }
      if (chewing < 0) clip.constant = i === 0 ? -100 : letters[i - 1].max + raft.position.x;
    } else {
      clip.constant = 100;
      const u = ease((t - T_ENTER - T_LETTERS) / T_EXIT);
      const from = letters[letters.length - 1].mid;
      x = lerp(from, perchX, u);
      y = topY + (u < 1 ? hop(u, 2, 0.25) : 0);
      yaw = lerp(-0.35, -Math.PI / 2 + 0.25, u);
      if (u >= 1) {
        // idle: face the viewer, follow the pointer with the head
        const mx = state.mouse.x / innerWidth - 0.5, my = state.mouse.y / innerHeight - 0.5;
        head.rotation.y = lerp(head.rotation.y, -mx * 0.9, 0.08);
        pitch = my * 0.5;
      }
    }

    b.position.set(x, y, z);
    b.rotation.y = yaw;
    if (t < T_DONE) head.rotation.y = lerp(head.rotation.y, 0, 0.2);
    head.rotation.z = lerp(head.rotation.z, -pitch, 0.35);

    // breathing + tail
    const s = Math.sin(clock * 3);
    beaver.body.scale.set(1 + s * 0.015, 1 - s * 0.02, 1);
    const sl = clock - slap;
    beaver.tailPivot.rotation.z = sl < 0.5 ? Math.sin(sl * Math.PI * 4) * 0.7 * (1 - sl / 0.5) : Math.sin(clock * 1.7) * 0.06;
    beaver.tailPivot.rotation.y = Math.sin(clock * 2.3) * 0.25;
    // blink
    if (clock > nextBlink) nextBlink = clock + 2.5 + Math.random() * 3;
    const blink = nextBlink - clock < 0.12 ? 0.1 : 1;
    beaver.eyes.forEach((e) => (e.scale.y = blink));
  };

  // the raft bobs and rocks gently on the current
  const float = (t: number) => {
    raft.position.y = Math.sin(t * 1.3) * 0.06 + Math.sin(t * 2.1 + 1) * 0.02;
    raft.rotation.z = Math.sin(t * 0.9) * 0.025;
    raft.rotation.x = Math.sin(t * 1.1 + 0.5) * 0.02;
  };

  // as the landing screen scrolls away, the log floats off downstream, picking up speed;
  // it's gone by the time just under half the screen has scrolled past
  const hero = canvas.closest<HTMLElement>(".hero");
  const drift = () => {
    const room = (hero ? hero.offsetHeight : innerHeight) * 0.45;
    const p = Math.min(1, Math.max(0, scrollY / Math.max(1, room)));
    raft.position.x = Math.pow(p, 1.6) * exitX;
    raft.rotation.y = -p * 0.12; // swings a little as the current takes it
    water.mat.uniforms.uLogX.value = raft.position.x;
  };

  // ----- scroll dive -----
  // the scene sits fixed behind the page. As the landing screen scrolls away the camera sinks below the
  // surface into murky water, and then the whole thing fades out into the page background.
  const sstep = (a: number, b: number, x: number) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const horizon = new THREE.Color(HORIZON), murk = new THREE.Color(MURK), fog = scene.fog as THREE.Fog;
  /** returns false once the scene has fully faded out (nothing left to draw) */
  const dive = () => {
    const sc = scrollY / Math.max(1, hero ? hero.offsetHeight : innerHeight);
    const k = sstep(0.05, 0.5, sc);
    camera.position.set(0, lerp(1.5, WATER_Y - 2.3, k), lerp(camD, camD * 0.8, k));
    target.set(0, lerp(0.9, WATER_Y - 2.6, k), lerp(0, -3, k));
    camera.lookAt(target);
    // a hard cut at the surface, like a camera plunging in: above it's the sunny scene, below it's murk.
    // (any in-between blend shows a clear, oddly lit half-underwater view)
    const under = camera.position.y < WATER_Y ? 1 : 0;
    fog.color.copy(horizon).lerp(murk, under);
    fog.near = lerp(30, 0.5, under);
    fog.far = lerp(230, 11, under);
    renderer.setClearColor(fog.color, 1);
    land.group.visible = under < 0.05;
    water.mat.uniforms.uUnder.value = under;
    const fade = 1 - sstep(0.5, 0.8, sc);
    canvas.style.opacity = String(fade);
    canvas.style.visibility = fade > 0 ? "visible" : "hidden";
    canvas.style.pointerEvents = sc < 0.25 ? "auto" : "none";
    return { under, live: fade > 0 };
  };

  let clock = 0, last = performance.now(), visible = true;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(canvas);

  if (reduce) {
    // no animation: show the finished carving with the beaver perched at the end
    clock = T_DONE + 1;
    pose(T_DONE + 1, 0);
    float(0);
    river.update(0, 0);
    land.update(0, 0, 0);
    renderer.render(scene, camera);
    addEventListener("resize", () => renderer.render(scene, camera));
    addEventListener("scroll", () => {
      const sc = scrollY / Math.max(1, hero ? hero.offsetHeight : innerHeight);
      const fade = 1 - sstep(0.3, 0.8, sc);
      canvas.style.opacity = String(fade);
      canvas.style.visibility = fade > 0 ? "visible" : "hidden";
    }, { passive: true });
    return () => {};
  }

  return (now: number) => {
    const dt = Math.min((now - last) / 1000, 1 / 20);
    last = now;
    if (!visible) return;
    clock += dt;
    pose(clock, dt);
    chips.update(dt);
    dust.update(dt);
    float(clock);
    drift();
    const { under, live } = dive();
    if (!live) return;
    const offset = clock * DRIFT;
    river.update(clock, offset);
    land.update(clock, dt, offset);
    deep.update(clock, dt, under);
    water.mat.uniforms.uTime.value = clock;
    renderer.render(scene, camera);
  };
}
