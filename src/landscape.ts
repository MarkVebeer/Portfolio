// Backdrop for the beaver scene: a golden-hour sky with a sun, drifting clouds and birds,
// a meadow on the far bank with a boreal tree line, and snow-capped mountains on the horizon.
// It all scrolls past and wraps around, so the log seems to drift down the river forever.
import * as THREE from "three";

export const HORIZON = 0xf0d9b2;

const flat = (color: number, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9, metalness: 0, ...extra });
const rgb = (h: number) => new THREE.Vector3((h >> 16) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255);
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

/* ---------------- sky ---------------- */
function makeSky() {
  const sunDir = new THREE.Vector3(-0.55, 0.22, -1).normalize();
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uZenith: { value: rgb(0x4f86bd) },
      uMid: { value: rgb(0x9cc4df) },
      uHorizon: { value: rgb(HORIZON) },
      uBelow: { value: rgb(0x1d3437) },
      uSun: { value: rgb(0xfff1cf) },
      uSunDir: { value: sunDir },
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
      }`,
    fragmentShader: `
      uniform vec3 uZenith, uMid, uHorizon, uBelow, uSun, uSunDir;
      varying vec3 vDir;
      void main() {
        float h = vDir.y;
        vec3 col = mix(uHorizon, uMid, smoothstep(-.02, .22, h));
        col = mix(col, uZenith, smoothstep(.22, .75, h));
        float s = max(dot(normalize(vDir), uSunDir), 0.);
        col += uSun * (pow(s, 900.) * 1.4 + pow(s, 24.) * .35 + pow(s, 4.) * .12);
        // below the horizon the dome is deep water, so any gap under the waterline never shows as beige sky
        col = mix(col, uBelow, smoothstep(-.005, -.04, h));
        gl_FragColor = vec4(col, 1.);
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(260, 32, 16), mat);
  sky.renderOrder = -1;
  return sky;
}

/* ---------------- clouds ---------------- */
/** Wraps x into [-span/2, span/2), so things that scroll off one side come back on the other. */
export const wrapX = (x: number, span: number) => ((((x + span / 2) % span) + span) % span) - span / 2;

function makeClouds() {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xd9cfc2, emissiveIntensity: 0.55, flatShading: true, roughness: 1, fog: false });
  const clouds: { obj: THREE.Object3D; x: number; speed: number }[] = [];
  for (let i = 0; i < 9; i++) {
    const cloud = new THREE.Group();
    const puffs = 4 + Math.floor(Math.random() * 4);
    for (let k = 0; k < puffs; k++) {
      const r = rand(1.6, 3.2);
      const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), mat);
      puff.position.set((k - puffs / 2) * rand(1.8, 2.6), rand(-0.4, 0.8) + (k % 2) * 0.6, rand(-1, 1));
      puff.scale.y = rand(0.55, 0.75);
      cloud.add(puff);
    }
    cloud.position.set(0, rand(9, 19), rand(-110, -70));
    cloud.scale.setScalar(rand(0.9, 1.6));
    group.add(cloud);
    clouds.push({ obj: cloud, x: rand(-110, 110), speed: rand(0.6, 1.4) });
  }
  const update = (dt: number, offset: number) => {
    for (const c of clouds) {
      c.x += c.speed * dt;
      c.obj.position.x = wrapX(c.x - offset, 220);
    }
  };
  return { group, update };
}

/* ---------------- birds ---------------- */
function makeBirds() {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0x2b2119, side: THREE.DoubleSide });
  const wingGeo = new THREE.BufferGeometry();
  // one swept-back wing, hinged at the body (x = 0)
  wingGeo.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0.12, 0, 0, -0.1, 0.75, 0, -0.32], 3));
  const birds: { root: THREE.Object3D; l: THREE.Object3D; r: THREE.Object3D; x: number; phase: number; speed: number; flap: number; baseY: number }[] = [];
  const flock = (cx: number, cy: number, cz: number, n: number) => {
    for (let i = 0; i < n; i++) {
      const root = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.3, 2, 6), mat);
      body.rotation.x = Math.PI / 2;
      root.add(body);
      const l = new THREE.Mesh(wingGeo, mat), r = new THREE.Mesh(wingGeo, mat);
      r.scale.x = -1;
      root.add(l, r);
      // loose V formation
      const row = Math.ceil(i / 2), side = i % 2 ? 1 : -1;
      root.position.set(0, cy - row * 0.35 + rand(-0.15, 0.15), cz + side * row * 0.9);
      root.rotation.y = -Math.PI / 2; // fly toward +x
      group.add(root);
      birds.push({ root, l, r, x: cx - row * 1.1, phase: rand(0, 6), speed: 2.6, flap: rand(7, 9), baseY: root.position.y });
    }
  };
  flock(-22, 6, -24, 5);
  flock(14, 7.5, -34, 3);
  const update = (time: number, dt: number, offset: number) => {
    for (const b of birds) {
      b.x += b.speed * dt;
      b.root.position.x = wrapX(b.x - offset, 90);
      b.root.position.y = b.baseY + Math.sin(time * 0.6 + b.phase) * 0.4;
      // flap, with an occasional glide
      const glide = Math.sin(time * 0.35 + b.phase) > 0.6;
      const a = glide ? 0.12 : Math.sin(time * b.flap + b.phase) * 0.65;
      b.l.rotation.z = a;
      b.r.rotation.z = -a;
    }
  };
  return { group, update };
}

/* ---------------- far bank: meadow, trees, mountains ---------------- */
// North American beaver country: boreal / northern forest. Spruce and fir dominate, with pines,
// stands of white-barked aspen and birch (a few already turning gold), and mountains on the horizon.
type TreeKind = "spruce" | "pine" | "aspen";
const matCache = new Map<number, THREE.MeshStandardMaterial>();
const shared = (color: number) => {
  let m = matCache.get(color);
  if (!m) matCache.set(color, (m = flat(color)));
  return m;
};

function makeTree(kind: TreeKind, s: number) {
  const tree = new THREE.Group();
  if (kind === "spruce") {
    // tall and narrow, five tiers tapering to a spire
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.12, 0.6, 6), shared(0x3e2a1c));
    trunk.position.y = 0.3;
    tree.add(trunk);
    const greens = [0x1f3527, 0x24402d, 0x2a4732, 0x2f4f37, 0x34573c];
    for (let k = 0; k < 5; k++) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.62 - k * 0.11, 1.0, 7), shared(greens[k]));
      cone.position.y = 0.75 + k * 0.55;
      cone.rotation.y = rand(0, 3);
      tree.add(cone);
    }
    tree.scale.set(s * 0.9, s * rand(1.1, 1.35), s * 0.9);
  } else if (kind === "pine") {
    // taller bare trunk, a looser crown up top
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.13, 1.6, 6), shared(0x5a3a26));
    trunk.position.y = 0.8;
    tree.add(trunk);
    const greens = [0x2f4a2a, 0x37552e, 0x3f5f33];
    for (let k = 0; k < 3; k++) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.75 - k * 0.18, 0.9, 7), shared(greens[k]));
      cone.position.y = 1.6 + k * 0.5;
      cone.rotation.y = rand(0, 3);
      tree.add(cone);
    }
    tree.scale.setScalar(s);
  } else {
    // aspen / birch: slim white trunk with dark marks, small rounded crown; some in autumn gold
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 2.1, 6), shared(0xe6e1d5));
    trunk.position.y = 1.05;
    tree.add(trunk);
    for (let k = 0; k < 4; k++) {
      const mark = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.035, 0.11), shared(0x2a2420));
      mark.position.set(0, rand(0.3, 1.8), 0);
      mark.rotation.y = rand(0, 3);
      tree.add(mark);
    }
    const autumn = Math.random() < 0.25;
    const leaves = autumn ? [0xd9a93a, 0xe0b84a, 0xc98f2e] : [0x7f9a3e, 0x93a84a, 0x6f8c3a, 0xa4b04a];
    for (let k = 0; k < 4; k++) {
      const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(rand(0.32, 0.48), 0), shared(pick(leaves)));
      blob.scale.y = 1.3;
      blob.position.set(rand(-0.25, 0.25), 2.0 + rand(-0.1, 0.55), rand(-0.25, 0.25));
      tree.add(blob);
    }
    tree.scale.setScalar(s);
  }
  tree.rotation.y = rand(0, 6);
  return tree;
}
const pickKind = (): TreeKind => {
  const r = Math.random();
  return r < 0.5 ? "spruce" : r < 0.68 ? "pine" : "aspen";
};

export const SHORE = -4.6;
/** The meadow repeats every TILE units along x, so it can scroll forever without a seam. */
const TILE = 60, STEP = 2.5;
const hash = (i: number, j: number) => {
  const v = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
  return v - Math.floor(v);
};

function makeFarBank(waterY: number) {
  const group = new THREE.Group();
  const k = (Math.PI * 2) / TILE;
  // height in the meadow's own (repeating) coordinates
  const groundY = (x: number, z: number) => {
    const back = Math.max(0, SHORE - z); // 0 at the shoreline, grows going back
    const lift = Math.min(1, back / 3) * 0.45 + Math.max(0, back - 20) * 0.04;
    return waterY - 0.12 + lift + Math.sin(x * k * 4) * 0.15 * Math.min(1, back / 4) + Math.sin(x * k + z * 0.1) * 0.5 * Math.min(1, back / 15);
  };

  // meadow: a wide low-poly sheet that rises gently away from the shore; jitter and colour repeat per tile
  const W = 300, cols = W / STEP;
  const geo = new THREE.PlaneGeometry(W, 100, cols, 30);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0, SHORE - 50);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors: number[] = [];
  const c = new THREE.Color(), tones = [0x5a7338, 0x66803c, 0x50693a, 0x748c4a, 0x62743a];
  const per = TILE / STEP;
  for (let i = 0; i < pos.count; i++) {
    const ix = Math.round((pos.getX(i) + W / 2) / STEP) % per, iz = Math.round(pos.getZ(i) * 10);
    const z = pos.getZ(i);
    const edge = z > SHORE - 0.5;
    const x = pos.getX(i) + (edge ? 0 : (hash(ix, iz) - 0.5) * 0.6);
    pos.setXYZ(i, x, groundY(x, z) + (hash(ix + 7, iz) - 0.5) * 0.12, z + (edge ? 0 : (hash(ix, iz + 3) - 0.5) * 0.6));
    c.setHex(z > SHORE - 0.8 ? 0x4a3524 : tones[Math.floor(hash(ix + 3, iz + 1) * tones.length)]); // muddy lip at the water's edge
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const meadow = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }));
  group.add(meadow);

  // tree line set back from the water, plus a few nearer trees that sweep past closer
  const trees: { obj: THREE.Object3D; x: number; z: number }[] = [];
  for (let i = 0; i < 95; i++) {
    const near = i < 8;
    const z = near ? SHORE - rand(2, 6) : SHORE - rand(14, 60);
    const s = rand(1.1, 2.1) * (1 + Math.max(0, -z - 25) * 0.012);
    const tree = makeTree(pickKind(), s);
    tree.position.z = z;
    group.add(tree);
    trees.push({ obj: tree, x: near ? rand(-40, 40) : rand(-70, 70), z });
  }

  // forested foothills, then snow-capped mountains on the horizon (fog tints them toward the sky)
  const hills: { obj: THREE.Object3D; x: number; span: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const hill = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), shared(pick([0x2a4430, 0x30503a, 0x263d2c])));
    hill.scale.set(rand(18, 34), rand(6, 12), rand(10, 16));
    hill.position.set(0, waterY - 1.5, rand(-95, -80));
    group.add(hill);
    hills.push({ obj: hill, x: -105 + i * 30 + rand(-8, 8), span: 210 });
  }
  // far enough that fog would flatten them to the horizon colour, so they get their own blue distance tone instead
  const rock = new THREE.MeshStandardMaterial({ color: 0x8796a8, flatShading: true, roughness: 1, fog: false });
  const snow = new THREE.MeshStandardMaterial({ color: 0xf2f5fa, emissive: 0x9aa6b8, emissiveIntensity: 0.25, flatShading: true, roughness: 0.8, fog: false });
  for (let i = 0; i < 9; i++) {
    const m = new THREE.Group();
    const h = rand(26, 46), r = h * rand(0.7, 1.0);
    const peak = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7, 3), rock);
    peak.position.y = h / 2;
    m.add(peak);
    // snow cap: the top third, a hair wider so it sits over the rock
    const capH = h * rand(0.3, 0.4);
    const cap = new THREE.Mesh(new THREE.ConeGeometry((r * capH) / h + 0.15, capH, 7, 1, true), snow); // open bottom: no flat underside
    cap.position.y = h - capH / 2 + 0.05;
    m.add(cap);
    m.rotation.y = rand(0, 3);
    m.position.set(0, waterY - 4, rand(-175, -150));
    group.add(m);
    hills.push({ obj: m, x: -160 + i * 40 + rand(-10, 10), span: 360 });
  }

  const update = (offset: number) => {
    const shift = ((offset % TILE) + TILE) % TILE;
    meadow.position.x = -shift;
    for (const t of trees) {
      const x = wrapX(t.x - offset, 140);
      t.obj.position.x = x;
      t.obj.position.y = groundY(x + offset, t.z) - 0.05; // sit on the meadow wherever it has scrolled to
    }
    for (const h of hills) h.obj.position.x = wrapX(h.x - offset, h.span);
  };
  return { group, update };
}

/** Everything behind the river. `update(time, dt, offset)` scrolls it all by `offset` (how far the log has drifted),
    drifts the clouds and flies the birds. */
export function makeLandscape(waterY: number) {
  const group = new THREE.Group();
  const clouds = makeClouds(), birds = makeBirds(), bank = makeFarBank(waterY);
  group.add(makeSky(), clouds.group, birds.group, bank.group);
  const update = (time: number, dt: number, offset: number) => {
    clouds.update(dt, offset);
    birds.update(time, dt, offset);
    bank.update(offset);
  };
  return { group, update };
}
