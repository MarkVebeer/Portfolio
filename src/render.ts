import { kernSplit } from "./kern";
import { projects, site, type Ink, type Project } from "./content";
import { THEMES } from "./themes";

const ink = (i: Ink) => `var(--${i})`;

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// Shapes for the tall cards, sized in cqw/cqh (card width/height) so they keep their proportions,
// kept mostly to the top and bottom so the project name across the middle stays clear.
const LAYOUTS = [
  `<span class="blob" style="width:105cqw;height:52cqh;left:28cqw;top:58cqh"></span><span class="circle" style="width:72cqw;height:72cqw;left:44cqw;top:-10cqh"></span>`,
  `<span class="blob" style="width:95cqw;height:48cqh;left:30cqw;top:-14cqh"></span><span class="blob alt" style="width:46cqw;height:42cqw;left:62cqw;top:72cqh"></span>`,
  `<span class="blob" style="width:115cqw;height:44cqh;left:-28cqw;top:64cqh"></span><span class="circle" style="width:84cqw;height:84cqw;left:34cqw;top:-6cqh"></span>`,
  `<span class="blob" style="width:80cqw;height:40cqh;left:-22cqw;top:-8cqh"></span><span class="blob alt" style="width:70cqw;height:34cqh;left:48cqw;top:70cqh"></span>`,
];

export function posterHTML(p: Project, i: number): string {
  // themed cards are one self-contained artwork, title included
  if (p.theme) return `<div class="poster poster-theme">${THEMES[p.theme]()}</div>`;
  const [bg, fg, blob] = p.inks;
  const art = p.image
    ? `<img class="cover" src="${esc(p.image)}" alt="" loading="lazy">`
    : LAYOUTS[i % LAYOUTS.length];
  // photo cards carry the name as a caption along the bottom instead of across the middle
  const label = p.image ? `<span class="cap">${esc(p.title)}</span>` : `<span class="lat">${esc(p.title)}</span>`;
  return `<div class="poster" style="--pbg:${ink(bg)};--pfg:${ink(fg)};--pblob:${ink(blob)};--palt:${ink(fg)}">
    ${art}
    ${label}
  </div>`;
}

const splitChars = (word: string) =>
  Array.from(word).map((c) => `<span class="mask"><span class="ch">${esc(c)}</span></span>`).join("");

export function render(): void {
  const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector<T>(sel)!;

  $("#heroTitle").setAttribute("aria-label", site.fullName);
  $(".g1").innerHTML = splitChars(site.heroTop);
  kernSplit($(".g1"));
  if (site.heroBottom) $(".g2").innerHTML = splitChars(site.heroBottom);
  else {
    $(".g2").remove();
    $(".hero").classList.add("single");
  }


  // Projects
  $(".work-track").innerHTML = projects
    .map(
      (p, i) => {
        // cards with an image or description open in the viewer (lightbox.ts) instead of following a link
        const opens = !!(p.image || p.description);
        const attrs = opens ? ` tabindex="0" role="button" aria-label="Open ${esc(p.title)}"` : "";
        const link = !opens && p.href;
        return `<article class="card" data-project="${i}"${attrs}>
        ${link ? `<a href="${esc(p.href!)}" target="_blank" rel="noopener">` : ""}${posterHTML(p, i)}${link ? "</a>" : ""}
      </article>`;
      },
    )
    .join("");



}
