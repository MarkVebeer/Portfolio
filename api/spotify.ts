// Vercel serverless function: GET /api/spotify
// Returns what's playing on your Spotify account right now, as JSON the now-playing card understands.
// Needs three environment variables in Vercel (Project → Settings → Environment Variables):
//   SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN  (get the last one with `npm run spotify:auth`)

export interface NowPlaying {
  isPlaying: boolean;
  title: string;
  artist: string;
  album: string;
  albumArt: string | null;
  url: string | null;
  progressMs: number;
  durationMs: number;
  /** server time the progress was read at (ms since epoch), so the page can keep counting */
  at: number;
}

let cached: { token: string; expires: number } | null = null;

async function accessToken(): Promise<string> {
  if (cached && Date.now() < cached.expires - 30_000) return cached.token;
  const { SPOTIFY_CLIENT_ID: id, SPOTIFY_CLIENT_SECRET: secret, SPOTIFY_REFRESH_TOKEN: refresh } = process.env;
  if (!id || !secret || !refresh) throw new Error("Spotify environment variables are missing");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${id}:${secret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refresh }),
  });
  if (!res.ok) throw new Error(`token refresh failed (${res.status})`);
  const j = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: j.access_token, expires: Date.now() + j.expires_in * 1000 };
  return j.access_token;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      // Vercel's edge cache holds a response for a few seconds, so many visitors = few Spotify calls
      "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10",
    },
  });

export async function GET(): Promise<Response> {
  try {
    const token = await accessToken();
    const res = await fetch("https://api.spotify.com/v1/me/player/currently-playing?additional_types=track,episode", {
      headers: { Authorization: `Bearer ${token}` },
    });
    // 204 = nothing playing
    if (res.status === 204 || res.status === 202) return json({ isPlaying: false });
    if (!res.ok) return json({ isPlaying: false, error: `spotify ${res.status}` }, 502);

    const j = await res.json();
    const item = j.item;
    if (!item) return json({ isPlaying: false });
    const isTrack = item.type === "track";
    const now: NowPlaying = {
      isPlaying: !!j.is_playing,
      title: item.name,
      artist: isTrack ? item.artists.map((a: { name: string }) => a.name).join(", ") : item.show?.name ?? "",
      album: isTrack ? item.album.name : item.show?.name ?? "",
      albumArt: (isTrack ? item.album.images : item.images)?.[0]?.url ?? null,
      url: item.external_urls?.spotify ?? null,
      progressMs: j.progress_ms ?? 0,
      durationMs: item.duration_ms ?? 0,
      at: Date.now(),
    };
    return json(now);
  } catch (err) {
    return json({ isPlaying: false, error: (err as Error).message }, 500);
  }
}
