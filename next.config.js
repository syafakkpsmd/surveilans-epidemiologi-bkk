/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  env: {
    TZ: 'Asia/Makassar',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
};

module.exports = nextConfig;