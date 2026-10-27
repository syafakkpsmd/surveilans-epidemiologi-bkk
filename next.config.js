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
  // Sertakan file logo di fungsi server (Vercel) agar ppt.ts bisa membacanya lewat fs
    outputFileTracingIncludes: {
    '/**/*': ['./public/logo-*.png', './public/ornamen-*.png'],
  },
};

module.exports = nextConfig;