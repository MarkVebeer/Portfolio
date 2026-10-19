// Shared per-frame values, written by input handlers and read by the render loop.
export const state = {
  mouse: { x: innerWidth / 2, y: innerHeight / 2, tx: innerWidth / 2, ty: innerHeight / 2 },
  scrollY: 0,
  /** px per frame, signed */
  scrollVel: 0,
};

export const prefersReducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
export const finePointer = matchMedia("(pointer: fine)").matches;
