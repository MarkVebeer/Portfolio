import Lenis from "lenis";
import { state } from "./state";

/**
 * Smooth wheel scrolling on the window, with a safety net: if the window turns out not to be
 * the real scroll container (some embeds scroll an outer frame or the body instead), Lenis would
 * only move its own virtual position, so we tear it down and fall back to native scrolling.
 */
export function createSmoothScroll(enabled: boolean): { raf(now: number): void; scrollTo(target: Element | number): void } {
  let lenis: Lenis | null = null;
  let lastY = window.scrollY;
  let mismatches = 0;

  const native = {
    raf() {},
    scrollTo(target: Element | number) {
      const top = typeof target === "number" ? target : target.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top, behavior: enabled ? "smooth" : "auto" });
    },
  };

  const windowScrolls = () => document.documentElement.scrollHeight > innerHeight + 4;

  if (enabled && windowScrolls()) {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true, autoRaf: false });
    lenis.on("scroll", () => {
      if (!lenis) return;
      // Lenis thinks it moved but the window did not: it isn't driving the real scroller.
      if (Math.abs(lenis.animatedScroll - window.scrollY) > 40) {
        if (++mismatches > 3) {
          lenis.destroy();
          lenis = null;
          console.info("Smooth scroll disabled: window is not the scroll container here.");
        }
      } else mismatches = 0;
    });
  }

  document.addEventListener("click", (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute("href")!;
    const el = id === "#top" ? 0 : document.querySelector(id);
    if (el === null) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(el as HTMLElement | number, { duration: 1.4 });
    else native.scrollTo(el);
  });

  return {
    raf(now: number) {
      lenis?.raf(now);
      // Always read the real window position so the background can never drift from the page.
      const y = window.scrollY;
      state.scrollVel = y - lastY;
      state.scrollY = y;
      lastY = y;
    },
    scrollTo(target) {
      if (lenis) lenis.scrollTo(target as HTMLElement | number);
      else native.scrollTo(target);
    },
  };
}
