// Contact section: a big e-mail card (copy / write) and a row of profile tiles that pick up
// each service's own colour on hover.
import { siDiscord, siGithub, siSpotify, siSteam } from "simple-icons";
import { links, site } from "./content";

const ICONS: Record<string, string> = {
  github: siGithub.path,
  spotify: siSpotify.path,
  steam: siSteam.path,
  discord: siDiscord.path,
};

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const icon = (name: string) =>
  `<svg class="tile-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[name]}" fill="currentColor"/></svg>`;

export function mountLinks(): void {
  const card = document.querySelector<HTMLElement>(".mail-card");
  const tiles = document.querySelector<HTMLElement>(".tiles");
  if (!card || !tiles) return;

  card.innerHTML = `
    <span class="mail-label">E-mail</span>
    <a class="mail-addr" href="mailto:${esc(site.email)}">${esc(site.email)}</a>
    <div class="mail-actions">
      <button type="button" class="mail-btn primary" id="copyEmail">Copy address</button>
      <a class="mail-btn" href="mailto:${esc(site.email)}">Write an e-mail ↗</a>
    </div>`;

  tiles.innerHTML = links
    .map(
      (l) => `<li><a class="tile" href="${esc(l.href)}" target="_blank" rel="noopener" style="--brand:${l.color}">
        ${icon(l.icon)}
        <span class="tile-label">${esc(l.label)}</span>
        <span class="tile-note">${esc(l.note)}</span>
        <span class="tile-arrow" aria-hidden="true">↗</span>
      </a></li>`,
    )
    .join("");

  // copy the address; fall back to selecting it where the clipboard is refused
  const btn = document.getElementById("copyEmail")!;
  const addr = card.querySelector<HTMLElement>(".mail-addr")!;
  let t = 0;
  const done = (text: string) => {
    btn.textContent = text;
    btn.classList.add("is-done");
    clearTimeout(t);
    t = window.setTimeout(() => {
      btn.textContent = "Copy address";
      btn.classList.remove("is-done");
    }, 1800);
  };
  const select = () => {
    const r = document.createRange();
    r.selectNodeContents(addr);
    const s = getSelection()!;
    s.removeAllRanges();
    s.addRange(r);
    done("Selected — press Ctrl+C");
  };
  btn.addEventListener("click", () => {
    try {
      navigator.clipboard.writeText(site.email).then(() => done("Copied ✓"), select);
    } catch {
      select();
    }
  });
}
