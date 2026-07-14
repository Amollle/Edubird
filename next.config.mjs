/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: true,
  images: {
    // Article images come from arbitrary, unpredictable news outlet domains
    // (via GNews), so a fixed remotePatterns allowlist isn't workable here.
    // Disabling optimization skips Next's image proxy (and its hostname
    // check) and just renders the original URL directly.
    unoptimized: true
  },
};

export default nextConfig;
