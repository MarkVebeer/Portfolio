// Is WebGL actually running on a GPU? With hardware acceleration turned off, browsers still offer WebGL
// but draw it on the CPU (SwiftShader, llvmpipe, ...), and the 3D scenes crawl. In that case we skip them.
//
// `?gpu=off` / `?gpu=on` in the URL forces either path, for testing.

const SOFTWARE = /swiftshader|llvmpipe|softpipe|software|basic render|mesa offscreen|microsoft basic/i;

function detect(): boolean {
  const force = new URLSearchParams(location.search).get("gpu");
  if (force === "off") return false;
  if (force === "on") return true;

  const canvas = document.createElement("canvas");
  // the browser refuses this context when it would only be emulating the GPU in software
  const gl = canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: true }) ?? canvas.getContext("webgl", { failIfMajorPerformanceCaveat: true });
  if (!gl) return false;

  // belt and braces: some browsers still hand out a software context, so check what it reports itself as
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  const renderer = String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
  gl.getExtension("WEBGL_lose_context")?.loseContext();
  return !SOFTWARE.test(renderer);
}

export const hasGpu = detect();
