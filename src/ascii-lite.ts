// CPU stand-in for the ASCII fluid background (ascii-bg.ts), for browsers without GPU acceleration.
// Same glyphs, colours and density mapping, but the "fluid" is cheap domain-warped value noise plus a few
// drifting blobs and a pointer trail, drawn with a plain 2D canvas at ~20 fps. Only non-empty cells are drawn,
// from a pre-tinted glyph atlas, so a frame is a few thousand drawImage calls.

const BG = "#2b2119";
const DEEP = [0x7a, 0x52, 0x33], ACCENT = [0xc9, 0x8a, 0x45];
const RAMP = " .:-=+*#%@";
const CELL = 12; // glyph size in CSS px (a touch bigger than the GPU version: fewer cells to draw)
const FPS = 20;
const DENSITY_FLOOR = 0.25, CONTRAST = 1.85, DITHER = 0.3, LIFT = 0.35, STRENGTH = 0.55;
const LEVELS = 8; // brightness/colour steps baked into the atlas

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

/* value noise on a 256-wide lattice */
const PERM = new Uint8Array(512);
{
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
}
const lattice = (x: number, y: number) => PERM[(PERM[x & 255] + y) & 511] / 255;
function noise(x: number, y: number): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  let fx = x - xi, fy = y - yi;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  const a = lattice(xi, yi), b = lattice(xi + 1, yi), c = lattice(xi, yi + 1), d = lattice(xi + 1, yi + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
const fbm = (x: number, y: number) => noise(x, y) * 0.62 + noise(x * 2.03 + 17.1, y * 2.03 + 3.7) * 0.38;
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function createAsciiLite(canvas: HTMLCanvasElement, reduce: boolean): (now: number) => void {
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return () => {};

  let dpr = 1, tile = CELL, cols = 1, rows = 1;
  let atlas: HTMLCanvasElement | null = null;

  // glyph atlas: one row per brightness level, one column per ramp glyph, each already tinted and faded
  const buildAtlas = () => {
    const cv = document.createElement("canvas");
    cv.width = tile * RAMP.length;
    cv.height = tile * LEVELS;
    const g = cv.getContext("2d")!;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = `500 ${Math.round(tile * 0.95)}px "IBM Plex Mono", ui-monospace, monospace`;
    for (let lv = 0; lv < LEVELS; lv++) {
      const l = (lv + 0.5) / LEVELS;
      const m = smooth(0.15, 0.85, l);
      const c = DEEP.map((d, i) => Math.round(d + (ACCENT[i] - d) * m));
      g.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${(LIFT + (1 - LIFT) * l) * STRENGTH})`;
      for (let k = 1; k < RAMP.length; k++) g.fillText(RAMP[k], k * tile + tile / 2, lv * tile + tile / 2 + tile * 0.04);
    }
    atlas = cv;
  };

  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.max(1, Math.floor(innerWidth * dpr));
    canvas.height = Math.max(1, Math.floor(innerHeight * dpr));
    tile = Math.max(8, Math.round(CELL * dpr));
    cols = Math.ceil(canvas.width / tile);
    rows = Math.ceil(canvas.height / tile);
    buildAtlas();
  };
  resize();
  addEventListener("resize", () => {
    resize();
    if (reduce) draw(20);
  });
  document.fonts?.ready.then(buildAtlas);

  // pointer trail: recent positions (in cells) that stir up density and fade
  const trail: { x: number; y: number; t: number }[] = [];
  let lastPush = 0;
  addEventListener("pointermove", (e) => {
    const now = performance.now();
    if (now - lastPush < 30) return;
    lastPush = now;
    trail.push({ x: (e.clientX * dpr) / tile, y: (e.clientY * dpr) / tile, t: now / 1000 });
    if (trail.length > 40) trail.shift();
  }, { passive: true });

  const blobs = [
    { ax: 0.11, ay: 0.17, px: 0.0, py: 1.3, rx: 0.36, ry: 0.3 },
    { ax: 0.07, ay: 0.13, px: 2.1, py: 0.4, rx: 0.42, ry: 0.34 },
    { ax: 0.15, ay: 0.09, px: 4.2, py: 2.7, rx: 0.3, ry: 0.36 },
  ];

  const draw = (time: number) => {
    const a = atlas;
    if (!a) return;
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const bx = blobs.map((b) => (0.5 + b.rx * Math.sin(time * b.ax + b.px)) * cols);
    const by = blobs.map((b) => (0.5 + b.ry * Math.sin(time * b.ay + b.py)) * rows);
    const blobR2 = (Math.min(cols, rows) * 0.16) ** 2;
    const now = performance.now() / 1000;
    const live = trail.filter((p) => now - p.t < 1.4);
    const trailR2 = 9;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        // flowing noise: warp the lookup by a second, slower noise so it swirls instead of sliding
        const w = noise(x * 0.035 - time * 0.05, y * 0.035 + time * 0.02) * 3.2;
        let d = smooth(0.52, 0.8, fbm(x * 0.07 + w + time * 0.07, y * 0.07 - time * 0.05 + w * 0.6)) * 0.85;
        for (let i = 0; i < 3; i++) {
          const dx = x - bx[i], dy = (y - by[i]) * 1.6;
          const r2 = dx * dx + dy * dy;
          if (r2 < blobR2 * 4) d += Math.exp(-r2 / blobR2) * 0.75 * (0.55 + 0.45 * noise(x * 0.2 + time, y * 0.2));
        }
        for (const p of live) {
          const dx = x - p.x, dy = y - p.y, r2 = dx * dx + dy * dy;
          if (r2 < trailR2 * 4) d += Math.exp(-r2 / trailR2) * 0.7 * (1 - (now - p.t) / 1.4);
        }
        const k = Math.max(d - DENSITY_FLOOR, 0) / (1 - DENSITY_FLOOR);
        if (k <= 0) continue;
        const l = 1 - Math.exp(-k * CONTRAST);
        const dither = (BAYER[(x & 3) + 4 * (y & 3)] - 0.5) * DITHER * smooth(0.03, 0.12, l);
        const idx = Math.floor(Math.min(0.9999, Math.max(0, l + dither)) * RAMP.length);
        if (idx === 0) continue;
        const lv = Math.min(LEVELS - 1, Math.floor(l * LEVELS));
        ctx.drawImage(a, idx * tile, lv * tile, tile, tile, x * tile, y * tile, tile, tile);
      }
    }
  };

  if (reduce) {
    draw(20);
    return () => {};
  }
  let last = 0;
  return (now: number) => {
    if (now - last < 1000 / FPS) return;
    last = now;
    draw(now / 1000);
  };
}
