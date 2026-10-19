// Everything personal lives here. Edit this file to make the site yours.
import parkingPhoto from "./assets/parking.webp";
import type { Theme } from "./themes";

export type Ink = "accent" | "accent-deep" | "bg" | "fg";

export interface Project {
  title: string;
  /** Poster colours: background, text, main blob. */
  inks: [bg: Ink, fg: Ink, blob: Ink];
  /** Artwork themed after the project (themes.ts). Replaces the generated poster art. */
  theme?: Theme;
  /** Optional cover image (imported asset or URL). Replaces the generated poster art. */
  image?: string;
  /** Shown beside the enlarged card. Cards with an image or a description open in the viewer when clicked. */
  description?: string;
  /** Source link (e.g. the GitHub repo). */
  href?: string;
  /** Live site, if the project has one. */
  live?: string;
}

export const site = {
  /** Giant hero type. Leave heroBottom empty for a single centred line. */
  heroTop: "Mark",
  heroBottom: "",
  fullName: "Mark",
  email: "mark@markveber.hu",
  spotifyProfile: "https://open.spotify.com/user/21gmnm2wz43zsxetknuljr26y",
};

/** Contact tiles, in the order they're listed. `icon` picks the brand icon in links.ts, `color` is its hover colour. */
export const links = [
  { label: "GitHub", icon: "github", note: "@MarkVebeer", color: "#f2e6d3", href: "https://github.com/MarkVebeer" },
  { label: "Spotify", icon: "spotify", note: "My music", color: "#1ed760", href: "https://open.spotify.com/user/21gmnm2wz43zsxetknuljr26y" },
  { label: "Steam", icon: "steam", note: "Add me", color: "#66c0f4", href: "https://steamcommunity.com/profiles/76561198833045139" },
  { label: "Discord", icon: "discord", note: "Send a message", color: "#5865f2", href: "https://discord.com/users/1013502143967281264" },
];

export const projects: Project[] = [
  // Mark's own public repos on github.com/MarkVebeer (forks left out), most recently worked on first
  {
    title: "F1-Calendar", inks: ["accent", "bg", "accent-deep"], theme: "f1",
    description: "A calendar application for Formula 1 enthusiasts to track sessions with built-in Discord integration for notifications.",
    href: "https://github.com/MarkVebeer/F1-Calendar", live: "https://f1.markveber.hu",
  },
  { title: "parking job", inks: ["fg", "fg", "fg"], image: parkingPhoto, description: "professional parking job" },
  {
    title: "Darts-Counter", inks: ["accent", "fg", "accent-deep"], theme: "darts",
    description: "A sleek, static but fully responsive darts score tracker for 301/501 matches, with the current state saved in your own browser.",
    href: "https://github.com/MarkVebeer/Darts-Counter", live: "https://darts.markveber.hu",
  },
  {
    title: "Noise-Generator", inks: ["fg", "accent-deep", "accent"], theme: "noise",
    description: "A simple sound generator that runs in the system tray, playing a continuous tone at a configurable frequency and volume.",
    href: "https://github.com/MarkVebeer/Noise-Generator",
  },
];
