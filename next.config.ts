import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/basic/:path*",
        destination: "/",
        permanent: true,
      },
      {
        source: "/community/:path*",
        destination: "/",
        permanent: true,
      },
      {
        source: "/rate/:path*",
        destination: "/music",
        permanent: true,
      },
      {
        source: "/user/:path*",
        destination: "/me",
        permanent: true,
      },
      {
        source: "/music/albums",
        destination: "/music?kind=album",
        permanent: true,
      },
      {
        source: "/music/artists",
        destination: "/music?kind=artist",
        permanent: true,
      },
      {
        source: "/music/songs",
        destination: "/music?kind=song",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
