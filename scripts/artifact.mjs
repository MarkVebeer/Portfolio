// The artifact host wraps pages in its own <html>/<head>/<body>,
// so strip ours from the single-file build.
import { readFileSync, writeFileSync } from "node:fs";

const html = readFileSync("dist/index.html", "utf8");
const out = html
  .replace(/<!doctype html>/i, "")
  .replace(/<\/?html[^>]*>/gi, "")
  .replace(/<\/?head>/gi, "")
  .replace(/<\/?body[^>]*>/gi, "")
  .replace(/<meta charset[^>]*>/i, "")
  .replace(/<meta name="viewport"[^>]*>/i, "")
  .trim();
writeFileSync("dist/artifact.html", out + "\n");
console.log("wrote dist/artifact.html", (out.length / 1024).toFixed(1) + " KB");
