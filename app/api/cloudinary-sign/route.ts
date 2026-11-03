// app/api/cloudinary-sign/route.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: Request) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      {
        error:
          'Env Cloudinary belum terbaca di server: ' +
          [
            !cloudName && 'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME',
            !apiKey && 'CLOUDINARY_API_KEY',
            !apiSecret && 'CLOUDINARY_API_SECRET',
          ]
            .filter(Boolean)
            .join(', '),
      },
      { status: 500 }
    );
  }

  const { folder } = await req.json();
  const timestamp = Math.round(Date.now() / 1000);

  const toSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = crypto
    .createHash('sha1')
    .update(toSign + apiSecret)
    .digest('hex');

  return NextResponse.json({ timestamp, signature, apiKey, cloudName });
}