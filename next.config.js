/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  env: {
    TZ: 'Asia/Makassar',
    // Satu saklar: DATA_BACKEND=mariadb di .env.local berlaku untuk server dan browser.
    NEXT_PUBLIC_DATA_BACKEND: process.env.DATA_BACKEND ?? '',
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