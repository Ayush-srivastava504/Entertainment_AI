/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Set to 'export' only if you deploy the static build to Cloudflare Pages / Netlify
  // WITHOUT using Next's Node/Edge runtime for /app/api routes (see README:
  // "Deploying without a Node server").
  // output: 'export',
};

module.exports = nextConfig;
