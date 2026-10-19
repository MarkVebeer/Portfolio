// Project viewer: clicking (or Enter/Space on) a card that has an image or a description opens it large
// (the photo, or the card's own artwork), with the title, description and links in a panel beside it.
// Esc, the × or the backdrop close it.
import { animate } from "motion";
import { projects } from "./content";
import { posterHTML } from "./render";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function mountLightbox(reduce: boolean): void {
  const box = document.createElement("div");
  box.className = "lb";
  box.hidden = true;
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-modal", "true");
  box.setAttribute("aria-labelledby", "lb-title");
  box.innerHTML = `
    <div class="lb-backdrop"></div>
    <div class="lb-panel">
      <figure class="lb-media"></figure>
      <div class="lb-info">
        <h3 id="lb-title"></h3>
        <p class="lb-desc"></p>
        <div class="lb-links">
          <a class="lb-link lb-live" target="_blank" rel="noopener">Visit site ↗</a>
          <a class="lb-link lb-src" target="_blank" rel="noopener">Source on GitHub ↗</a>
        </div>
      </div>
      <button class="lb-close" type="button" aria-label="Close">×</button>
    </div>`;
  document.body.appendChild(box);
  const panel = box.querySelector<HTMLElement>(".lb-panel")!;
  const backdrop = box.querySelector<HTMLElement>(".lb-backdrop")!;
  const media = box.querySelector<HTMLElement>(".lb-media")!;
  const title = box.querySelector<HTMLElement>("#lb-title")!;
  const desc = box.querySelector<HTMLElement>(".lb-desc")!;
  const live = box.querySelector<HTMLAnchorElement>(".lb-live")!;
  const src = box.querySelector<HTMLAnchorElement>(".lb-src")!;
  const closeBtn = box.querySelector<HTMLButtonElement>(".lb-close")!;
  let returnFocus: HTMLElement | null = null;

  const open = (i: number, from: HTMLElement) => {
    const p = projects[i];
    media.innerHTML = p.image ? `<img src="${esc(p.image)}" alt="${esc(p.title)}">` : posterHTML(p, i);
    media.classList.toggle("is-art", !p.image);
    title.textContent = p.title;
    desc.textContent = p.description ?? "";
    live.hidden = !p.live;
    if (p.live) live.href = p.live;
    src.hidden = !p.href;
    if (p.href) src.href = p.href;
    returnFocus = from;
    box.hidden = false;
    document.documentElement.classList.add("lb-open");
    closeBtn.focus({ preventScroll: true });
    if (!reduce) {
      animate(backdrop, { opacity: [0, 1] }, { duration: 0.25 });
      animate(panel, { opacity: [0, 1], scale: [0.94, 1], y: [16, 0] }, { type: "spring", stiffness: 260, damping: 24 });
    }
  };

  const close = async () => {
    if (box.hidden) return;
    if (!reduce) {
      animate(backdrop, { opacity: 0 }, { duration: 0.2 });
      await animate(panel, { opacity: 0, scale: 0.96, y: 10 }, { duration: 0.18 });
    }
    box.hidden = true;
    document.documentElement.classList.remove("lb-open");
    returnFocus?.focus({ preventScroll: true });
  };

  const cardIndex = (el: Element | null) => {
    const card = el?.closest<HTMLElement>(".card[data-project]");
    if (!card) return null;
    const i = Number(card.dataset.project);
    const p = projects[i];
    return p && (p.image || p.description) ? { i, card } : null;
  };

  // clicks on cards (the carousel already swallows the click that ends a drag)
  document.addEventListener("click", (e) => {
    const hit = cardIndex(e.target as Element);
    if (!hit) return;
    e.preventDefault();
    open(hit.i, hit.card);
  });
  document.addEventListener("keydown", (e) => {
    if (!box.hidden && e.key === "Escape") return void close();
    if (e.key !== "Enter" && e.key !== " ") return;
    const hit = cardIndex(document.activeElement);
    if (!hit) return;
    e.preventDefault();
    open(hit.i, hit.card);
  });
  backdrop.addEventListener("click", close);
  closeBtn.addEventListener("click", close);

  // keep the page (and its smooth scroll) still behind the viewer
  for (const type of ["wheel", "touchmove"] as const) {
    box.addEventListener(type, (e) => {
      e.stopPropagation();
      if (!(e.target as Element).closest(".lb-info")) e.preventDefault();
    }, { passive: false });
  }
}
