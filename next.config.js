/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Trailer illustrations are served from /public — no remote loaders needed.
    unoptimized: false,
  },
  // If you ever want a fully-static export to drop into an object store:
  //   output: 'export',
  // (Leave off for now so we can use the PDF-generation + MP4-export routes.)
};

module.exports = nextConfig;
