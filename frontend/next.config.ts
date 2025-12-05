import type { NextConfig } from "next";
import path from 'path';

const nextConfig: NextConfig = {
  /* config options here */
  // Explicitly set Turbopack root directory relative to repo root to avoid workspace root inference
  // This helps when multiple lockfiles are present at repo and subproject roots.
  turbopack: {
    // Use absolute path for Turbopack root. Resolve `frontend` directory safely.
    root: path.resolve(__dirname),
  },
  // Proxy API calls to backend server in development
  rewrites: async () => {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5050/api/:path*',
      },
    ];
  },
};

export default nextConfig;
