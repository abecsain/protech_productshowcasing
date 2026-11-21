import sharp, { type Sharp } from 'sharp';

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB
export const MAX_FULL_BYTES = 60 * 1024; // 60 KB target
export const MAX_THUMB_BYTES = 10 * 1024; // 10 KB target
export const FULL_MAX_DIM = 800;
export const THUMB_MAX_DIM = 300;

// Magic bytes for JPG, PNG, WebP
const MAGIC: Array<[number[], string]> = [
  [[0xff, 0xd8, 0xff], 'image/jpeg'],
  [[0x89, 0x50, 0x4e, 0x47], 'image/png'],
  [[0x52, 0x49, 0x46, 0x46], 'image/webp'],
];

export function detectMimeType(buffer: Buffer): string | null {
  for (const [bytes, mime] of MAGIC) {
    if (bytes.every((b, i) => buffer[i] === b)) {
      if (mime === 'image/webp') {
        const tag = buffer.subarray(8, 12).toString('ascii');
        if (tag !== 'WEBP') continue;
      }
      return mime;
    }
  }
  return null;
}

export interface ProcessedImages {
  full: Buffer;
  thumb: Buffer;
  mimeType: string;
  fullSize: number;
  thumbSize: number;
}

async function compressWebP(
  pipeline: Sharp,
  maxDim: number,
  targetBytes: number
): Promise<Buffer> {
  let quality = 75;
  let result: Buffer;

  do {
    result = await pipeline
      .clone()
      .rotate()
      .resize(maxDim, maxDim, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();

    if (result.byteLength <= targetBytes || quality <= 50) break;
    quality -= 5;
  } while (quality >= 50);

  return result;
}

export async function processImages(inputBuffer: Buffer): Promise<ProcessedImages> {
  const mimeType = detectMimeType(inputBuffer);
  if (!mimeType) {
    throw new Error('Invalid image format. Only JPG, PNG, and WebP are accepted.');
  }

  if (inputBuffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error(`File too large. Maximum size is ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`);
  }

  const base = sharp(inputBuffer, { failOn: 'error' }).rotate().withMetadata({ orientation: undefined });

  const full = await compressWebP(base, FULL_MAX_DIM, MAX_FULL_BYTES);
  const thumb = await compressWebP(base, THUMB_MAX_DIM, MAX_THUMB_BYTES);

  return {
    full,
    thumb,
    mimeType: 'image/webp',
    fullSize: full.byteLength,
    thumbSize: thumb.byteLength,
  };
}
