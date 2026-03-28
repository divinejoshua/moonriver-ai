import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3 = new S3Client({
  region: process.env.AWS_S3_REGION?.trim(),
  credentials: {
    accessKeyId: process.env.AWS_S3_ACCESS!,
    secretAccessKey: process.env.AWS_S3_SECRET!,
  },
})

const BUCKET = process.env.AWS_S3_BUCKET_NAME!
const REGION = process.env.AWS_S3_REGION?.trim()!

export type S3Folder = 'images' | 'audio' | 'lipsync' | 'merged' | 'product-images' | 'product-videos'

/**
 * Returns the plain (non-signed) S3 URL for a stored key.
 * Use this for URLs that will be persisted to the database.
 */
export function getS3Url(key: string): string {
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`
}

/**
 * Extracts the S3 object key from a pre-signed URL, or returns the value
 * unchanged if it's already a plain key (does not start with "https://").
 * Used for backward compat with rows that stored full pre-signed URLs.
 */
export function extractS3Key(urlOrKey: string): string {
  if (!urlOrKey.startsWith('https://')) return urlOrKey
  try {
    return new URL(urlOrKey).pathname.slice(1)
  } catch {
    return urlOrKey
  }
}

/**
 * Returns a fresh pre-signed GET URL for a stored S3 key.
 * Default TTL: 1 day (86 400 s).
 */
export async function getPresignedUrl(key: string, expiresIn = 86400): Promise<string> {
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn },
  )
}

/**
 * Uploads a buffer to S3 and returns the S3 key.
 * Call getPresignedUrl(key) separately when you need a URL.
 */
export async function uploadToS3(
  buffer: Buffer,
  folder: S3Folder,
  filename: string,
  contentType: string,
): Promise<string> {
  const key = `${folder}/${filename}`

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  )

  return key
}
