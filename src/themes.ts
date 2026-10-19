// Card artwork themed after each project, drawn as one SVG at the card's 3:5 proportions (300×500)
// so it scales cleanly from the carousel up to the enlarged viewer.
// F1-Calendar and Darts-Counter borrow the colours of their live sites.

export type Theme = "f1" | "darts" | "noise";

const svg = (body: string, label: string) =>
  `<svg class="theme-art" viewBox="0 0 300 500" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${label}">${body}</svg>`;

/* ---------------- F1 Calendar: race-weekend card, red F1, green countdown, chequered flag ---------------- */
function f1(): string {
  const RED = "#e10600", GREEN = "#00d084";
  // a calendar grid of race weekends: a few days lit up red
  const lit = new Set([3, 10, 12, 19, 24, 26, 31]);
  let grid = "";
  for (let i = 0; i < 35; i++) {
    const x = 40 + (i % 7) * 32, y = 300 + Math.floor(i / 7) * 22;
    grid += `<rect x="${x}" y="${y}" width="24" height="15" rx="3" fill="${lit.has(i) ? RED : "#22222e"}"/>`;
  }
  // chequered band, skewed like a flag in motion
  let flag = "";
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 17; c++)
      if ((r + c) % 2 === 0) flag += `<rect x="${c * 20 - 10}" y="${438 + r * 20}" width="20" height="20" fill="#f4f4f6"/>`;
  return svg(`
    <rect width="300" height="500" fill="#0b0b10"/>
    <g opacity=".9"><polygon points="190,0 230,0 120,500 80,500" fill="${RED}" opacity=".16"/><polygon points="245,0 262,0 152,500 135,500" fill="${RED}" opacity=".1"/></g>
    <text x="22" y="112" font-family="Archivo, Arial, sans-serif" font-weight="900" font-style="italic" font-size="100" fill="${RED}" letter-spacing="-4">F1</text>
    <text x="26" y="146" font-family="Archivo, Arial, sans-serif" font-weight="800" font-size="25" fill="#fff" letter-spacing="5">CALENDAR</text>
    <rect x="22" y="170" width="256" height="104" rx="12" fill="#15151e" stroke="#ffffff14"/>
    <rect x="36" y="184" width="88" height="18" rx="5" fill="#ffffff12"/>
    <text x="44" y="197" font-family="Archivo, Arial, sans-serif" font-weight="700" font-size="10" fill="#c9c9d4" letter-spacing="1">NEXT WEEKEND</text>
    <text x="36" y="226" font-family="Archivo, Arial, sans-serif" font-weight="800" font-size="15" fill="#fff">UNITED STATES GP</text>
    <rect x="36" y="238" width="3" height="24" rx="1.5" fill="${RED}"/>
    <text x="46" y="256" font-family="Archivo, Arial, sans-serif" font-weight="600" font-size="12" fill="#a9a9b6">Practice</text>
    <text x="264" y="257" text-anchor="end" font-family="'IBM Plex Mono', monospace" font-weight="500" font-size="19" fill="${GREEN}">6d 18:56</text>
    ${grid}
    <g transform="skewY(-4) translate(0 10)">${flag}</g>`, "F1-Calendar");
}

/* ---------------- Darts Counter: neon-cyan dartboard, a dart, glowing 501 ---------------- */
function darts(): string {
  const NEON = "#00ffcc", cx = 150, cy = 198;
  const ring = (r0: number, r1: number, a0: number, a1: number) => {
    const p = (r: number, a: number) => `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
    return `M${p(r0, a0)} L${p(r1, a0)} A${r1},${r1} 0 0 1 ${p(r1, a1)} L${p(r0, a1)} A${r0},${r0} 0 0 0 ${p(r0, a0)}Z`;
  };
  let board = "";
  for (let s = 0; s < 20; s++) {
    const a0 = ((s - 0.5) / 20) * Math.PI * 2 - Math.PI / 2, a1 = ((s + 0.5) / 20) * Math.PI * 2 - Math.PI / 2;
    const even = s % 2 === 0;
    board += `<path d="${ring(14, 112, a0, a1)}" fill="${even ? "#161616" : "#222"}"/>`;
    // doubles and trebles light up alternately, like the site's neon accent
    board += `<path d="${ring(102, 112, a0, a1)}" fill="${even ? NEON : "#0b5c4d"}"/>`;
    board += `<path d="${ring(62, 71, a0, a1)}" fill="${even ? NEON : "#0b5c4d"}"/>`;
  }
  return svg(`
    <defs><filter id="neon-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect width="300" height="500" fill="#0d0d0d"/>
    <circle cx="${cx}" cy="${cy}" r="130" fill="none" stroke="${NEON}" stroke-opacity=".18" stroke-width="2"/>
    <circle cx="${cx}" cy="${cy}" r="120" fill="#111"/>
    <g>${board}</g>
    <circle cx="${cx}" cy="${cy}" r="14" fill="#0b5c4d"/>
    <circle cx="${cx}" cy="${cy}" r="7" fill="${NEON}" filter="url(#neon-glow)"/>
    <g transform="rotate(-38 ${cx + 30} ${cy - 22})">
      <line x1="${cx + 30}" y1="${cy - 22}" x2="${cx + 30}" y2="${cy - 112}" stroke="#d9d9d9" stroke-width="5" stroke-linecap="round"/>
      <line x1="${cx + 30}" y1="${cy - 22}" x2="${cx + 30}" y2="${cy - 34}" stroke="#888" stroke-width="2"/>
      <path d="M${cx + 30},${cy - 98} l-14,-26 l14,8 l14,-8 z" fill="${NEON}"/>
    </g>
    <text x="150" y="398" text-anchor="middle" font-family="Poppins, Archivo, Arial, sans-serif" font-weight="800" font-size="78" fill="${NEON}" filter="url(#neon-glow)">501</text>
    <text x="150" y="436" text-anchor="middle" font-family="Poppins, Archivo, Arial, sans-serif" font-weight="700" font-size="15" fill="#e6e6e6" letter-spacing="4">DARTS COUNTER</text>
    <text x="150" y="460" text-anchor="middle" font-family="Poppins, Archivo, Arial, sans-serif" font-weight="500" font-size="12" fill="#8a8a8a" letter-spacing="2">301 · 501</text>`, "Darts-Counter");
}

/* ---------------- Noise Generator: stacked sine waves, a frequency readout, a tray bar ---------------- */
function noise(): string {
  const AMBER = "#ffb547";
  const wave = (y0: number, amp: number, cycles: number, phase: number) => {
    let d = "";
    for (let x = 0; x <= 300; x += 4) {
      const y = y0 + Math.sin((x / 300) * Math.PI * 2 * cycles + phase) * amp;
      d += `${x === 0 ? "M" : "L"}${x},${y.toFixed(1)}`;
    }
    return d;
  };
  return svg(`
    <rect width="300" height="500" fill="#0f1216"/>
    <text x="24" y="70" font-family="Archivo, Arial, sans-serif" font-weight="900" font-size="44" fill="#fff" letter-spacing="-1">Noise</text>
    <text x="24" y="108" font-family="Archivo, Arial, sans-serif" font-weight="300" font-size="38" fill="${AMBER}" letter-spacing="-1">Generator</text>
    <path d="${wave(210, 46, 2.5, 0)}" fill="none" stroke="${AMBER}" stroke-width="3.5" stroke-linecap="round"/>
    <path d="${wave(210, 30, 4, 1.2)}" fill="none" stroke="${AMBER}" stroke-opacity=".45" stroke-width="2"/>
    <path d="${wave(210, 18, 7, 2.4)}" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="1.5"/>
    <line x1="0" y1="210" x2="300" y2="210" stroke="#ffffff10"/>
    <text x="24" y="330" font-family="'IBM Plex Mono', monospace" font-weight="500" font-size="48" fill="${AMBER}">440<tspan font-size="24" fill="#c9cdd3"> Hz</tspan></text>
    <text x="24" y="368" font-family="Archivo, Arial, sans-serif" font-weight="700" font-size="11" fill="#7d858f" letter-spacing="2">VOLUME</text>
    <rect x="24" y="380" width="252" height="6" rx="3" fill="#232a33"/>
    <rect x="24" y="380" width="164" height="6" rx="3" fill="${AMBER}"/>
    <circle cx="188" cy="383" r="9" fill="#fff"/>
    <rect y="452" width="300" height="48" fill="#171c22"/>
    <rect x="16" y="466" width="20" height="20" rx="4" fill="#2a313a"/><rect x="44" y="466" width="20" height="20" rx="4" fill="#2a313a"/><rect x="72" y="466" width="20" height="20" rx="4" fill="#2a313a"/>
    <rect x="232" y="466" width="20" height="20" rx="5" fill="${AMBER}"/>
    <path d="M238,472 h4 l5,-4 v12 l-5,-4 h-4z" fill="#0f1216"/>
    <text x="284" y="481" text-anchor="end" font-family="'IBM Plex Mono', monospace" font-size="10" fill="#7d858f">21:04</text>`, "Noise-Generator");
}

export const THEMES: Record<Theme, () => string> = { f1, darts, noise };
