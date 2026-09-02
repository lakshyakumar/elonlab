import type { NextConfig } from "next";

/**
 * `BUILD_STATIC=true` produces the GitHub Pages build: a static export of the
 * storefront alone (`/` and `/checkout`), served from the repo subpath.
 *
 * The export cannot contain route handlers or dynamically rendered pages, so
 * the workflow deletes `src/app/{api,pay,complete,mock,dev}` from its checkout
 * before building. Those routes still run under `npm run dev` and on any Node
 * host — they are excluded from Pages, not from the repo.
 */
const staticExport = process.env.BUILD_STATIC === "true";

/** Project Pages live at /<repo>; a user/org or custom-domain site lives at /. */
const basePath = process.env.PAGES_BASE_PATH ?? "/elonlab";

const config: NextConfig = {
  ...(staticExport
    ? {
        output: "export",
        basePath,
        // Pages serves `/checkout/index.html` for `/checkout/`.
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),

  // The Onramper widget is embedded as an iframe *inside* our page, so we do not
  // need to relax our own frame-ancestors. We do need to allow the widget origin
  // as a frame-src, and allow it to open provider popups.
  //
  // A static export cannot send headers — Pages controls them — so this block is
  // skipped there. It stays authoritative for `npm run dev` and Node hosting.
  ...(staticExport
    ? {}
    : {
        async headers() {
          const widgetOrigins = "https://buy.onramper.dev https://buy.onramper.com";
          // Next's dev server compiles React Fast Refresh through `eval`, so without
          // this nothing hydrates under `npm run dev` and every button is inert.
          // Production builds need no such allowance.
          const scriptSrc =
            process.env.NODE_ENV === "production"
              ? "script-src 'self' 'unsafe-inline'"
              : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";
          return [
            {
              source: "/(.*)",
              headers: [
                {
                  key: "Content-Security-Policy",
                  value: [
                    "default-src 'self'",
                    scriptSrc,
                    "style-src 'self' 'unsafe-inline'",
                    "connect-src 'self' https://api.onramper.dev https://api.onramper.com",
                    // 'self' covers the local mock widget; the two origins cover the
                    // real widget in sandbox and production.
                    `frame-src 'self' ${widgetOrigins}`,
                    "img-src 'self' data:",
                  ].join("; "),
                },
              ],
            },
          ];
        },
      }),
};

export default config;
