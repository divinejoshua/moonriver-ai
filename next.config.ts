import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@napi-rs/canvas', 'ffmpeg-static', 'ffprobe-static'],
};

export default nextConfig;
