// Live "now playing" widget pinned to the top of the screen: spinning record, cover and song name.
// Reads /api/spotify (a Vercel function, see api/spotify.ts) every few seconds.
// Where that endpoint doesn't exist (vite dev without `vercel dev`, the artifact preview) it
// simply shows "Nothing on" with a link to the profile.
import { animate } from "motion";
import { site } from "./content";
import type { NowPlaying } from "../api/spotify";

const ENDPOINT: string = import.meta.env.VITE_NOW_PLAYING_URL ?? "/api/spotify";
const POLL_MS = 5000;

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function mountSpotify(reduce: boolean): void {
  const card = document.querySelector<HTMLElement>(".np");
  if (!card) return;
  const disk = card.querySelector<HTMLElement>(".np-disk")!;
  const art = card.querySelector<HTMLElement>(".np-art")!;
  const song = card.querySelector<HTMLElement>(".np-song")!;
  const artist = card.querySelector<HTMLElement>(".np-artist")!;

  // the record turns while a song plays, and stops when paused
  const spin = reduce ? null : animate(disk, { rotate: [0, 360] }, { duration: 4, repeat: Infinity, ease: "linear" });
  spin?.pause();

  let current: NowPlaying | null = null;

  const show = (next: NowPlaying | null) => {
    const hasSong = !!next?.title;
    const changed = next?.title !== current?.title || next?.artist !== current?.artist;
    current = hasSong ? next : null;
    card.classList.toggle("is-playing", hasSong && !!next!.isPlaying);
    card.classList.toggle("is-paused", hasSong && !next!.isPlaying);

    if (!hasSong) {
      song.textContent = "Nothing on";
      artist.innerHTML = `<a href="${esc(site.spotifyProfile)}" target="_blank" rel="noopener">My Spotify ↗</a>`;
      art.innerHTML = "";
      spin?.pause();
      return;
    }

    const n = next!;
    if (changed) {
      song.innerHTML = n.url ? `<a href="${esc(n.url)}" target="_blank" rel="noopener">${esc(n.title)}</a>` : esc(n.title);
      artist.textContent = n.artist;
      art.innerHTML = n.albumArt ? `<img src="${esc(n.albumArt)}" alt="${esc(n.album)} cover">` : "";
      if (!reduce) animate(card.querySelector(".np-media")!, { scale: [0.94, 1], opacity: [0.4, 1] }, { type: "spring", stiffness: 260, damping: 18 });
    }
    if (n.isPlaying) spin?.play();
    else spin?.pause();
  };

  show(null);

  let failures = 0;
  const poll = async () => {
    try {
      const res = await fetch(ENDPOINT, { cache: "no-store" });
      if (!res.ok && res.status !== 502 && res.status !== 500) throw new Error(String(res.status));
      const data = (await res.json()) as NowPlaying;
      failures = 0;
      show(data);
    } catch {
      // no endpoint here (or offline): back off and keep the "not playing" state
      failures++;
    }
    setTimeout(poll, failures ? Math.min(60_000, POLL_MS * 2 ** failures) : POLL_MS);
  };
  poll();
}
