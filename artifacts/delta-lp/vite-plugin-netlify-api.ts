import path from "path";
import { pathToFileURL } from "url";
import type { IncomingMessage, ServerResponse } from "http";
import { loadEnv, type Plugin } from "vite";

/**
 * Serves `/api/*` during `vite dev` by invoking the same Netlify Function that
 * handles those routes in production (see the /api/* redirect in netlify.toml).
 *
 * Without this the dev server falls through to the SPA catch-all and answers
 * every /api call with index.html, which the generated API client happily
 * returns as a plain string, so `data.prices` is undefined and the app throws.
 */

type NetlifyEvent = {
  httpMethod: string;
  path: string;
  queryStringParameters: Record<string, string>;
  headers: Record<string, string>;
  body: string | null;
  isBase64Encoded: boolean;
};

type NetlifyResult = {
  statusCode: number;
  headers?: Record<string, string>;
  body?: string;
};

type NetlifyHandler = (event: NetlifyEvent) => Promise<NetlifyResult>;

const FUNCTION_PATH = path.resolve(
  import.meta.dirname,
  "..",
  "..",
  "netlify",
  "functions",
  "api.mjs",
);

function readBody(req: IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

// Captured before anything is injected, so a genuine shell variable stays
// distinguishable from one this plugin loaded out of a .env file. Parked on
// globalThis because a dev-server restart re-executes this module, and a plain
// module-level snapshot would then capture the already-injected values too.
const SHELL_ENV_CACHE = "__netlifyApiDevShellEnv";
const globalScope = globalThis as typeof globalThis & {
  [SHELL_ENV_CACHE]?: Set<string>;
};
const SHELL_ENV_KEYS: Set<string> = (globalScope[SHELL_ENV_CACHE] ??= new Set(
  Object.keys(process.env),
));

export function netlifyApiDevPlugin(): Plugin {
  return {
    name: "netlify-api-dev",
    apply: "serve",

    // The function reads plain `process.env`, which Vite does not populate from
    // .env files - those only reach the client via import.meta.env. Without
    // this, settings like RPC_URL silently fall back to the built-in default in
    // dev while working fine on Netlify, which is a confusing gap.
    //
    // Editing .env restarts the dev server but not the Node process, so values
    // injected here must be refreshed rather than left in place: a key this
    // plugin owns is always overwritten, and one deleted from .env is removed.
    // Only a real shell variable wins, matching Netlify's override order.
    configResolved(config) {
      const fileEnv = loadEnv(config.mode, config.envDir, "");

      for (const key of Object.keys(process.env)) {
        if (!SHELL_ENV_KEYS.has(key) && !(key in fileEnv)) {
          delete process.env[key];
        }
      }
      for (const [key, value] of Object.entries(fileEnv)) {
        if (!SHELL_ENV_KEYS.has(key)) {
          process.env[key] = value;
        }
      }
    },

    configureServer(server) {
      server.middlewares.use(
        async (
          req: IncomingMessage,
          res: ServerResponse,
          next: (err?: unknown) => void,
        ) => {
          const rawUrl = req.url ?? "";
          if (!rawUrl.startsWith("/api/") && rawUrl !== "/api") return next();

          const url = new URL(rawUrl, "http://localhost");

          try {
            // Re-imported per request so edits to api.mjs apply without a restart.
            const module = await server.ssrLoadModule(
              pathToFileURL(FUNCTION_PATH).href,
            );
            const handler = (module.default ??
              module.handler) as NetlifyHandler;

            const result = await handler({
              httpMethod: req.method ?? "GET",
              path: url.pathname,
              queryStringParameters: Object.fromEntries(url.searchParams),
              headers: req.headers as Record<string, string>,
              body:
                req.method === "GET" || req.method === "HEAD"
                  ? null
                  : await readBody(req),
              isBase64Encoded: false,
            });

            res.statusCode = result.statusCode;
            for (const [key, value] of Object.entries(result.headers ?? {})) {
              res.setHeader(key, value);
            }
            res.end(result.body ?? "");
          } catch (error) {
            server.config.logger.error(
              `[netlify-api-dev] ${url.pathname} failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            );
            res.statusCode = 500;
            res.setHeader("content-type", "application/json; charset=utf-8");
            res.end(
              JSON.stringify({
                error:
                  error instanceof Error
                    ? error.message
                    : "Local API handler failed.",
              }),
            );
          }
        },
      );
    },
  };
}
