import type { NextConfig } from 'next';

/**
 * Allow embedding from any http(s) site, local file previews, and same-origin.
 * Bare `frame-ancestors *` is rejected by Chromium for some parent schemes
 * (e.g. file:) — network schemes must be listed explicitly.
 */
const FRAME_ANCESTORS =
  "frame-ancestors http: https: file: data: blob: 'self'";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse', '@napi-rs/canvas'],
  async headers() {
    return [
      {
        source: '/embed/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: FRAME_ANCESTORS },
        ],
      },
      {
        source: '/widget-demo/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: FRAME_ANCESTORS },
        ],
      },
      {
        source: '/embed-widget.js',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=60',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
