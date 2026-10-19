// Optical spacing for a word split into one box per letter (the hero name).
// Letter shapes differ (an "r"'s arm sticks out, a "b"'s bowl is round), so equal advances look
// uneven. This measures each letter's inked edges and nudges the boxes so the visible gap between
// every pair of letters is the same: GAP times the font size.

/** visible gap between letters, as a fraction of the font size */
const GAP = 0.05;

export function kernSplit(container: HTMLElement): void {
  const masks = Array.from(container.querySelectorAll<HTMLElement>(".mask"));
  if (masks.length < 2) return;
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return;

  const apply = () => {
    masks.forEach((m) => (m.style.marginLeft = ""));
    const cs = getComputedStyle(container);
    // canvas only takes keyword stretches; the hero uses semi-expanded (112.5%) to match exactly
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} semi-expanded ${cs.fontSize} ${cs.fontFamily}`;

    const letters = masks.map((m) => m.firstElementChild as HTMLElement);
    const x = letters.map((l) => l.getBoundingClientRect().left);
    const ink = letters.map((l) => {
      const m = ctx.measureText(l.textContent ?? "");
      return { left: -m.actualBoundingBoxLeft, right: m.actualBoundingBoxRight };
    });

    const gaps: number[] = [];
    for (let i = 0; i < letters.length - 1; i++) gaps.push(x[i + 1] + ink[i + 1].left - (x[i] + ink[i].right));
    const target = parseFloat(cs.fontSize) * GAP;

    const base = getComputedStyle(masks[0]).marginLeft;
    gaps.forEach((g, i) => {
      masks[i + 1].style.marginLeft = `calc(${base} + ${(target - g).toFixed(2)}px)`;
    });
  };

  // measure once the real font has loaded, and again whenever the size changes
  (document.fonts?.ready ?? Promise.resolve()).then(apply);
  let t = 0;
  addEventListener("resize", () => {
    clearTimeout(t);
    t = window.setTimeout(apply, 120);
  });
}
