import type { NextConfig } from "next";

const config: NextConfig = {
  // The Onramper widget is embedded as an iframe *inside* our page, so we do not
  // need to relax our own frame-ancestors. We do need to allow the widget origin
  // as a frame-src, and allow it to open provider popups.
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
};

export default config;
