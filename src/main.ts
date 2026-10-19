import "./style.css";
import { render } from "./render";
import { prefersReducedMotion as reduce, state } from "./state";
import { site } from "./content";
import { createAsciiBg } from "./ascii-bg";
import { createAsciiLite } from "./ascii-lite";
import { createBeaver } from "./beaver";
import { createSpinner } from "./spinner";
import { hasGpu } from "./gpu";
import { createSmoothScroll } from "./smooth";
import { mountLinks } from "./links";
import { mountCarousel } from "./carousel";
import { mountLightbox } from "./lightbox";
import { mountSpotify } from "./spotify";
import { runHovers, runIntro, runReveals, runScroll } from "./animations";

render();
// clone the project cards for the endless row now, so the hover effects below attach to every copy
const drawCarousel = mountCarousel(reduce);
mountLightbox(reduce);

addEventListener("pointermove", (e) => {
  state.mouse.tx = e.clientX;
  state.mouse.ty = e.clientY;
}, { passive: true });

// Both backgrounds are WebGL. Without GPU acceleration they'd run on the CPU and drag the whole page down,
// so then the ASCII background switches to a light 2D-canvas version and the landing screen shows the plain giant type.
const bgCanvas = document.querySelector<HTMLCanvasElement>("#bg")!, beaverCanvas = document.querySelector<HTMLCanvasElement>("#beaver")!;
const drawBg = hasGpu ? createAsciiBg(bgCanvas, reduce) : createAsciiLite(bgCanvas, reduce);
// 3D beaver carves the name into a log; the plain giant type stays as the fallback without WebGL
const drawBeaver = hasGpu ? createBeaver(beaverCanvas, site.heroTop, reduce) : null;
if (drawBeaver) document.documentElement.classList.add("has-beaver");
else beaverCanvas.remove();
// the toy at the bottom: the same beaver spinning forever; without a GPU it stays the plain bubble
const spinCanvas = document.querySelector<HTMLCanvasElement>(".spinner")!;
const drawSpinner = hasGpu ? createSpinner(spinCanvas, reduce) : null;
if (drawSpinner) document.getElementById("magnet")!.classList.add("has-spinner");
else spinCanvas.remove();
const smooth = createSmoothScroll(!reduce);
mountLinks();
mountSpotify(reduce);

if (reduce) {
} else {
  runIntro();
  runScroll();
  runReveals();
  runHovers();
}

const loop = (now: number) => {
  smooth.raf(now);
  state.mouse.x += (state.mouse.tx - state.mouse.x) * 0.08;
  state.mouse.y += (state.mouse.ty - state.mouse.y) * 0.08;
  drawBg(now);
  drawBeaver?.(now);
  drawSpinner?.(now);
  drawCarousel(now);
  requestAnimationFrame(loop);
};
requestAnimationFrame(loop);
