import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@napi-rs/canvas', 'ffmpeg-static', 'ffprobe-static'],
  experimental: {
    proxyClientMaxBodySize: '100mb',
  },
};

export default nextConfig;
