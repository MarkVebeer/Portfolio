// Projects carousel: one endless row of cards. It drifts slowly on its own (pausing while hovered),
// moves sideways as the page scrolls, and can be dragged / flung or swiped with a trackpad.
// The cards are cloned enough times to always cover the view, and the offset wraps every set's width.

const AUTO = 38; // px per second of idle drift
const SCROLL_COUPLING = 0.55; // sideways px per px of page scroll
const FRICTION = 0.92; // per frame, after a fling

export function mountCarousel(reduce: boolean): (now: number) => void {
  const view = document.querySelector<HTMLElement>(".work-carousel");
  const track = document.querySelector<HTMLElement>(".work-track");
  if (!view || !track || !track.children.length) return () => {};
  const originals = Array.from(track.children) as HTMLElement[];

  let setW = 1;
  const measure = () => {
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    setW = Math.max(1, originals.reduce((w, el) => w + el.offsetWidth + gap, 0));
    // enough copies that one full set plus a screen's width is always laid out
    const sets = Math.max(2, Math.ceil((view.clientWidth + setW) / setW) + 1);
    while (track.children.length < originals.length * sets) {
      for (const o of originals) {
        const c = o.cloneNode(true) as HTMLElement;
        c.setAttribute("aria-hidden", "true");
        c.querySelectorAll("a").forEach((a) => (a.tabIndex = -1));
        if (c.hasAttribute("tabindex")) c.tabIndex = -1; // only the originals are keyboard stops
        track.appendChild(c);
      }
    }
  };
  measure();
  addEventListener("resize", measure);
  document.fonts?.ready.then(measure);

  let offset = 0, vel = 0, hovering = false, dragging = false, moved = false;
  let startX = 0, startOffset = 0, lastX = 0, lastT = 0, lastScroll = scrollY, last = performance.now();

  view.addEventListener("pointerenter", () => (hovering = true));
  view.addEventListener("pointerleave", () => (hovering = false));

  // drag / fling (mouse and touch); vertical swipes still scroll the page (touch-action: pan-y)
  view.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    dragging = true;
    moved = false;
    startX = lastX = e.clientX;
    startOffset = offset;
    lastT = performance.now();
    vel = 0;
  });
  addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    if (!moved && Math.abs(dx) > 6) {
      moved = true;
      view.classList.add("is-dragging");
    }
    if (!moved) return;
    offset = startOffset - dx;
    const now = performance.now();
    vel = (-(e.clientX - lastX) / Math.max(1, now - lastT)) * 16; // px per frame
    lastX = e.clientX;
    lastT = now;
  });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    view.classList.remove("is-dragging");
  };
  addEventListener("pointerup", end);
  addEventListener("pointercancel", end);
  // a drag shouldn't open the card it ended on
  view.addEventListener("click", (e) => {
    if (moved) {
      e.preventDefault();
      e.stopPropagation();
      moved = false;
    }
  }, true);
  view.addEventListener("dragstart", (e) => e.preventDefault());

  // sideways trackpad swipes / shift+wheel
  view.addEventListener("wheel", (e) => {
    const dx = e.deltaX || (e.shiftKey ? e.deltaY : 0);
    if (!dx || Math.abs(dx) < Math.abs(e.shiftKey ? 0 : e.deltaY)) return;
    e.preventDefault();
    offset += dx;
  }, { passive: false });

  return (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const sy = scrollY;
    if (!dragging) {
      offset += (sy - lastScroll) * SCROLL_COUPLING;
      if (Math.abs(vel) > 0.05) {
        offset += vel;
        vel *= FRICTION;
      } else if (!hovering && !reduce) offset += AUTO * dt;
    }
    lastScroll = sy;
    const x = ((offset % setW) + setW) % setW;
    track.style.transform = `translate3d(${-x}px,0,0)`;
  };
}
