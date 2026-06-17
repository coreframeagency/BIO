import { v2 as cloudinary } from 'cloudinary';
import { logger } from '../lib/logger';

if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
}

export async function uploadImage(
  buffer: Buffer,
  folder = 'exam-platform'
): Promise<CloudinaryUploadResult> {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    logger.warn('Cloudinary not configured — returning mock URL');
    return { url: 'https://via.placeholder.com/400', publicId: 'mock' };
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder }, (err, result) => {
      if (err || !result) reject(err || new Error('Upload failed'));
      else resolve({ url: result.secure_url, publicId: result.public_id });
    });
    stream.end(buffer);
  });
}
