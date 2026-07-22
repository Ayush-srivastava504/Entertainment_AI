/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Set to 'export' only if you deploy the static build to Cloudflare Pages / Netlify
  // WITHOUT using Next's Node/Edge runtime for /app/api routes (see README:
  // "Deploying without a Node server").
  // output: 'export',

  async headers() {
    return [
      {
        // Applies to every route, including /api/*.
        source: "/:path*",
        headers: [
          // Prevents this site from being embedded in an iframe elsewhere
          // (clickjacking protection).
          { key: "X-Frame-Options", value: "DENY" },
          // Stops browsers from MIME-sniffing a response away from its
          // declared Content-Type.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Don't leak the full referring URL (which may contain a
          // search query or other detail) to third-party origins.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Disable browser features this site never uses.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // Force HTTPS on repeat visits once you're confident TLS is
          // always available (Vercel terminates TLS by default).
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
