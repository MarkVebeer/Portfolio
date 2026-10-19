import { animate, inView, scroll, stagger } from "motion";
import { finePointer } from "./state";

type ScrollOptions = NonNullable<Parameters<typeof scroll>[1]>;

const EXPO = [0.16, 1, 0.3, 1] as const;

const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const $$ = <T extends Element = HTMLElement>(sel: string) => Array.from(document.querySelectorAll<T>(sel));

/* ---------------- hero entrance ---------------- */
export function runIntro(): void {
  heroIn(0.15);
}

function heroIn(d: number): void {
  // Park the letters fully below their masks right now (synchronously, before the first paint),
  // so no ascender peeks out while each letter waits for its stagger delay
  $$(".g1 .ch").forEach((c) => (c.style.transform = "translateY(150%)"));
  animate(".g1 .ch", { y: ["150%", "0%"] }, { duration: 1.1, delay: stagger(0.07, { startDelay: d }), ease: EXPO });
  if (document.querySelector(".g2")) animate(".g2 .ch", { y: ["-105%", "0%"] }, { duration: 1.1, delay: stagger(0.07, { startDelay: d + 0.15, from: "last" }), ease: EXPO });
  // scroll cue: fades in after the name lands, then bobs gently
  $$<SVGElement>(".scroll-cue svg").forEach((el) => (el.style.opacity = "0"));
  animate(".scroll-cue svg", { opacity: [0, 1] }, { duration: 0.8, delay: d + 0.9 });
  animate(".scroll-cue svg", { y: [0, 7, 0] }, { duration: 1.6, repeat: Infinity, ease: "easeInOut", delay: d + 0.9 });
}

/* ---------------- scroll-driven ---------------- */
export function runScroll(): void {
  // Hero
  const hero = $(".hero");
  const heroOpt: ScrollOptions = { target: hero, offset: ["start start", "end start"] };
  if (document.querySelector(".g2")) scroll(animate(".g2", { x: ["0%", "18%"] }, { ease: "linear" }), heroOpt);
  // page progress bar on the right edge
  const bar = $(".progress i");
  scroll((p: number) => (bar.style.transform = `scaleY(${p})`));

  // the scroll cue gets out of the way as soon as you start scrolling
  scroll(animate(".scroll-cue", { opacity: [1, 0] }, { ease: "linear" }), { target: hero, offset: ["start start", "0.15 start"] });


}


/* ---------------- in-view reveals ---------------- */
export function runReveals(): void {
  $$(".sec-head h2, .work-title").forEach((h) =>
    inView(h, () => {
      animate(h, { clipPath: ["inset(0 0 100% 0)", "inset(0 0 0% 0)"], y: [60, 0] }, { duration: 1, ease: EXPO });
    }, { amount: 0.3 }),
  );
}

/* ---------------- pointer-driven springs ---------------- */
export function runHovers(): void {
  if (!finePointer) return;

  // Poster tilt + blob parallax
  $$(".card .poster").forEach((pst) => {
    const blobs = pst.querySelectorAll(".blob");
    pst.addEventListener("pointermove", (e) => {
      const r = pst.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5;
      const ny = (e.clientY - r.top) / r.height - 0.5;
      animate(pst, { rotateY: nx * 14, rotateX: -ny * 14, scale: 1.03 }, { type: "spring", stiffness: 200, damping: 20 });
      animate(blobs, { x: nx * 30, y: ny * 30 }, { type: "spring", stiffness: 120, damping: 14 });
    });
    pst.addEventListener("pointerleave", () => {
      animate(pst, { rotateY: 0, rotateX: 0, scale: 1 }, { type: "spring", stiffness: 160, damping: 18 });
      animate(blobs, { x: 0, y: 0 }, { type: "spring", stiffness: 120, damping: 14 });
    });
  });

}
