/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value:
          'camera=(), geolocation=(), payment=(), usb=(), microphone=(self "https://*.daily.co")',
      },
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      },
    ];
    const privateCacheHeaders = [
      {
        key: "Cache-Control",
        value: "private, no-store, max-age=0, must-revalidate",
      },
    ];
    const privateRoutes = [
      "/dashboard/:path*",
      "/chat/:path*",
      "/analytics/:path*",
      "/settings/:path*",
      "/profile/:path*",
      "/sessions/:path*",
      "/counsellor/:path*",
      "/admin/:path*",
      "/onboarding/:path*",
    ];

    return [
      { source: "/:path*", headers: securityHeaders },
      ...privateRoutes.map((source) => ({
        source,
        headers: privateCacheHeaders,
      })),
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "plus.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "media.istockphoto.com",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/sign/**",
      },
    ],
  },
};

module.exports = nextConfig;
