// One-time Spotify login: run `npm run spotify:auth`.
// Reads SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET from .env, opens the Spotify login page,
// catches the redirect on http://127.0.0.1:8888/callback and saves SPOTIFY_REFRESH_TOKEN into .env.
import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync, renameSync, unlinkSync } from "node:fs";
import { exec } from "node:child_process";
import { randomBytes } from "node:crypto";

const ENV = ".env";
const REDIRECT = "http://127.0.0.1:8888/callback";
const SCOPES = "user-read-currently-playing user-read-playback-state";

const readEnv = () =>
  existsSync(ENV)
    ? Object.fromEntries(
        readFileSync(ENV, "utf8")
          .split(/\r?\n/)
          .filter((l) => l.trim() && !l.trim().startsWith("#") && l.includes("="))
          .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
      )
    : {};

const env = readEnv();
const id = env.SPOTIFY_CLIENT_ID, secret = env.SPOTIFY_CLIENT_SECRET;
if (!id || !secret) {
  console.error("Put SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env first (see .env.example).");
  process.exit(1);
}

const state = randomBytes(12).toString("hex");
const authUrl =
  "https://accounts.spotify.com/authorize?" +
  new URLSearchParams({ client_id: id, response_type: "code", redirect_uri: REDIRECT, scope: SCOPES, state });

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", REDIRECT);
  if (url.pathname !== "/callback") return res.writeHead(404).end();
  if (url.searchParams.get("state") !== state || !url.searchParams.get("code")) {
    res.writeHead(400).end("Login failed or was cancelled. You can close this tab.");
    return finish(1, "Spotify did not return a login code.");
  }
  try {
    const r = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ grant_type: "authorization_code", code: url.searchParams.get("code"), redirect_uri: REDIRECT }),
    });
    const j = await r.json();
    if (!r.ok || !j.refresh_token) throw new Error(j.error_description ?? j.error ?? `status ${r.status}`);

    // write/replace SPOTIFY_REFRESH_TOKEN in .env
    let text = existsSync(ENV) ? readFileSync(ENV, "utf8") : "";
    const line = `SPOTIFY_REFRESH_TOKEN=${j.refresh_token}`;
    text = /^SPOTIFY_REFRESH_TOKEN=.*$/m.test(text) ? text.replace(/^SPOTIFY_REFRESH_TOKEN=.*$/m, line) : `${text.trimEnd()}\n${line}\n`;
    const tempEnv = `${ENV}.tmp`;
    try {
      writeFileSync(tempEnv, text, { encoding: "utf8", flag: "w" });
      renameSync(tempEnv, ENV);
    } catch (writeError) {
      if (existsSync(tempEnv)) unlinkSync(tempEnv);
      if (writeError?.code === "EPERM" || writeError?.code === "EACCES") {
        throw new Error(
          `Could not update ${ENV}. Close any program using the file (including an editor or sync tool), then run npm run spotify:auth again.`,
        );
      }
      throw writeError;
    }

    res.writeHead(200, { "Content-Type": "text/plain" }).end("Done. Your Spotify refresh token is saved in .env. You can close this tab.");
    finish(0, "Saved SPOTIFY_REFRESH_TOKEN to .env. Now add all three SPOTIFY_* values to Vercel's environment variables.");
  } catch (err) {
    res.writeHead(500).end("Token exchange failed, see the terminal.");
    finish(1, `Token exchange failed: ${err.message}`);
  }
});

function finish(code, msg) {
  (code ? console.error : console.log)(msg);
  server.close(() => process.exit(code));
}

server.listen(8888, "127.0.0.1", () => {
  console.log("Opening the Spotify login page. If it doesn't open, visit:\n" + authUrl);
  const opener = process.platform === "win32" ? `start "" "${authUrl}"` : process.platform === "darwin" ? `open "${authUrl}"` : `xdg-open "${authUrl}"`;
  exec(opener);
});
