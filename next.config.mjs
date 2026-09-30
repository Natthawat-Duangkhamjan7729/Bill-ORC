const isDev = process.env.NODE_ENV === "development";

// Content-Security-Policy.
//
// - 'unsafe-inline' for scripts is required by Next's inline bootstrap and
//   hydration data; moving to nonces would mean giving up static rendering.
// - 'unsafe-eval' is dev-only (React Refresh needs it); production drops it.
// - Supabase is reached for auth, data and signed image URLs.
// - data: and blob: images cover the client-side receipt preview, which is
//   produced from a canvas before upload.
// - Any future in-browser OCR (Tesseract.js worker + language data) must be
//   served from this origin, or its CDN added to script-src/connect-src here.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "worker-src 'self' blob:",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            // The app uses the camera through a file input, not getUserMedia.
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
