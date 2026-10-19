import { defineConfig, loadEnv, type Plugin } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

/**
 * In `npm run dev`, answer /api/* with the same functions Vercel runs in production (api/*.ts),
 * using the SPOTIFY_* values from .env. In production Vercel serves these itself.
 */
function localApi(): Plugin {
  return {
    name: "local-api",
    apply: "serve",
    configureServer(server) {
      const env = loadEnv(server.config.mode, server.config.root, "SPOTIFY_");
      Object.assign(process.env, env);
      server.middlewares.use(async (req, res, next) => {
        const name = req.url?.match(/^\/api\/([\w-]+)/)?.[1];
        if (!name || req.method !== "GET") return next();
        try {
          const mod = await server.ssrLoadModule(`/api/${name}.ts`);
          const out: Response = await mod.GET(new Request(`http://localhost${req.url}`));
          res.statusCode = out.status;
          out.headers.forEach((v, k) => res.setHeader(k, v));
          res.end(await out.text());
        } catch (err) {
          server.config.logger.error(`[local-api] /api/${name}: ${(err as Error).message}`);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: (err as Error).message }));
        }
      });
    },
  };
}

// One self-contained HTML file, so the build can be published as an artifact.
export default defineConfig({
  plugins: [localApi(), viteSingleFile()],
  build: { target: "es2022" },
  // Listen on all network interfaces so other devices on the LAN can open the site.
  server: { host: true },
  preview: { host: true },
});
