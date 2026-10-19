// The toy at the bottom of the page: the hero's beaver, spinning slowly on the spot forever.
// Click it for a burst of spin. Grab it and it lifts off the page; throw it and it bounces around the
// screen like a ping-pong ball (gravity, bouncy walls, a little tumble), then hops back home once it settles.
import * as THREE from "three";
import { makeBeaver } from "./beaver";

const SPIN = 1.5; // radians per second: one full turn about every 4 seconds
const CLICK_BOOST = 14, BOOST_FADE = 0.95; // extra spin from a click, and how fast it winds down (per frame)
// px/s²; share of speed kept per wall bounce, and per (softer) floor bounce; air drag; rolling grip
const GRAVITY = 2400, BOUNCE = 0.8, FLOOR_BOUNCE = 0.7, AIR = 0.12, FLOOR_FRICTION = 0.955;
const MAX_THROW = 4800; // px/s
const REST_BEFORE_HOME = 1.4, HOME_TIME = 0.75; // s

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

export function createSpinner(canvas: HTMLCanvasElement, reduce: boolean): ((now: number) => void) | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch {
    return null;
  }
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xfff4e6, 0x2c2218, 1.6));
  const key = new THREE.DirectionalLight(0xfff1dc, 2.4);
  key.position.set(3, 5, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffd9a8, 1.1);
  rim.position.set(-4, 2, -5);
  scene.add(rim);

  // centre the beaver (head to tail, feet to ears) on the spin axis
  const beaver = makeBeaver();
  beaver.root.position.set(0.17, -0.1, 0);
  const turntable = new THREE.Group();
  turntable.add(beaver.root);
  scene.add(turntable);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  // far enough that snout and tail (about ±1.35 units) stay inside the frame when it's side-on or tumbling
  camera.position.set(0, 0.4, 5.8);
  camera.lookAt(0, 0, 0);

  const fit = () => {
    const w = canvas.clientWidth || 200, h = canvas.clientHeight || 200;
    renderer.setPixelRatio(Math.min((devicePixelRatio || 1) * 1.5, 2.5));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  fit();
  // re-measure whenever the box changes (including right after it switches to its beaver size)
  new ResizeObserver(() => {
    fit();
    if (reduce) renderer.render(scene, camera);
  }).observe(canvas);

  let visible = false, last = performance.now(), clock = 0, boost = 0;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(canvas);

  const pose = (dt: number) => {
    clock += dt;
    turntable.rotation.y += (SPIN + boost) * dt;
    boost *= Math.pow(BOOST_FADE, dt * 60);
    // a little life while it spins: breathing, a tail swish, the odd blink
    const s = Math.sin(clock * 3);
    beaver.body.scale.set(1 + s * 0.015, 1 - s * 0.02, 1);
    beaver.tailPivot.rotation.y = Math.sin(clock * 2.3) * 0.25;
    beaver.eyes.forEach((e) => (e.scale.y = clock % 3.2 < 0.12 ? 0.1 : 1));
  };

  if (reduce) {
    // no endless motion and no throwing: a still three-quarter view
    turntable.rotation.y = -0.6;
    renderer.render(scene, camera);
    return () => {};
  }

  /* ---------------- grab, throw, bounce ---------------- */
  const el = canvas.parentElement as HTMLElement;
  let flying = false, held = false, returning = false, moved = false;
  let size = 0, cx = 0, cy = 0, vx = 0, vy = 0, ang = 0, angV = 0, rest = 0;
  let slot: HTMLElement | null = null;
  let downX = 0, downY = 0, offX = 0, offY = 0, lastX = 0, lastY = 0, lastT = 0, pvx = 0, pvy = 0;
  let homeT = 0, fromX = 0, fromY = 0, fromAng = 0;

  const place = () => {
    el.style.transform = `translate(${cx - size / 2}px, ${cy - size / 2}px) rotate(${ang}deg)`;
  };

  // lift it off the page: it goes fixed over the viewport, and a same-sized slot holds its place
  const liftOff = () => {
    const r = el.getBoundingClientRect();
    size = r.width;
    cx = r.left + r.width / 2;
    cy = r.top + r.height / 2;
    slot = document.createElement("div");
    slot.className = "magnet-slot";
    slot.style.width = `${r.width}px`;
    slot.style.height = `${r.height}px`;
    el.before(slot);
    el.style.width = el.style.height = `${size}px`;
    el.classList.add("is-flying");
    flying = true;
    place();
  };

  const land = () => {
    el.classList.remove("is-flying");
    el.style.transform = el.style.width = el.style.height = "";
    slot?.remove();
    slot = null;
    flying = returning = false;
    ang = angV = 0;
  };

  el.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    el.setPointerCapture(e.pointerId);
    held = true;
    moved = false;
    downX = lastX = e.clientX;
    downY = lastY = e.clientY;
    lastT = performance.now();
    pvx = pvy = 0;
  });

  el.addEventListener("pointermove", (e) => {
    if (!held) return;
    if (!moved) {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) < 6) return;
      moved = true;
      if (!flying) liftOff();
      returning = false;
      offX = e.clientX - cx;
      offY = e.clientY - cy;
      el.classList.add("is-held");
    }
    // follow the pointer and keep a smoothed estimate of its velocity for the throw
    const now = performance.now(), dt = Math.max(1, now - lastT) / 1000;
    pvx = pvx * 0.6 + ((e.clientX - lastX) / dt) * 0.4;
    pvy = pvy * 0.6 + ((e.clientY - lastY) / dt) * 0.4;
    lastX = e.clientX;
    lastY = e.clientY;
    lastT = now;
    cx = e.clientX - offX;
    cy = e.clientY - offY;
    vx = vy = 0;
    place();
  });

  const release = () => {
    if (!held) return;
    held = false;
    el.classList.remove("is-held");
    if (!moved) {
      boost += CLICK_BOOST; // a plain click: spin burst
      return;
    }
    // a throw; if the pointer had stopped before letting go, it's more of a drop
    const still = performance.now() - lastT > 80;
    const sp = Math.hypot(pvx, pvy), k = sp > MAX_THROW ? MAX_THROW / sp : 1;
    vx = pvx * k * (still ? 0.15 : 1);
    vy = pvy * k * (still ? 0.15 : 1);
    angV = vx * 0.12;
    boost += Math.min(26, Math.hypot(vx, vy) / 180);
    rest = 0;
  };
  el.addEventListener("pointerup", release);
  el.addEventListener("pointercancel", release);

  const physics = (dt: number) => {
    if (returning) {
      // hop back to its slot along a little arc
      homeT = Math.min(1, homeT + dt / HOME_TIME);
      const r = slot!.getBoundingClientRect(), t = ease(homeT);
      cx = fromX + (r.left + r.width / 2 - fromX) * t;
      cy = fromY + (r.top + r.height / 2 - fromY) * t - Math.sin(t * Math.PI) * 140;
      ang = fromAng * (1 - t);
      place();
      if (homeT >= 1) land();
      return;
    }
    if (held) return;

    vy += GRAVITY * dt;
    vx *= 1 - AIR * dt;
    vy *= 1 - AIR * dt;
    cx += vx * dt;
    cy += vy * dt;

    // walls: the beaver's body is smaller than its square box
    const hx = size * 0.3, hy = size * 0.27, W = innerWidth, H = innerHeight;
    if (cx - hx < 0) { cx = hx; vx = Math.abs(vx) * BOUNCE; angV = -angV * 0.8 + vy * 0.05; }
    if (cx + hx > W) { cx = W - hx; vx = -Math.abs(vx) * BOUNCE; angV = -angV * 0.8 - vy * 0.05; }
    if (cy - hy < 0) { cy = hy; vy = Math.abs(vy) * BOUNCE; }
    let onFloor = false;
    if (cy + hy >= H) {
      cy = H - hy;
      vy = -Math.abs(vy) * FLOOR_BOUNCE;
      if (Math.abs(vy) < 160) vy = 0; // small hops die out instead of buzzing
      vx *= Math.pow(FLOOR_FRICTION, dt * 60);
      angV = vx * 0.12; // roll along the floor
      onFloor = true;
    }
    ang += angV * dt;
    angV *= 1 - 0.8 * dt;
    place();

    // once it has come to rest on the bottom edge for a moment, send it home
    rest = onFloor && vy === 0 && Math.abs(vx) < 30 ? rest + dt : 0;
    if (rest > REST_BEFORE_HOME) {
      returning = true;
      homeT = 0;
      fromX = cx;
      fromY = cy;
      fromAng = ang % 360;
    }
  };

  return (now: number) => {
    const dt = Math.min((now - last) / 1000, 1 / 20);
    last = now;
    if (flying) physics(dt);
    if (!visible && !flying) return;
    pose(dt);
    renderer.render(scene, camera);
  };
}
