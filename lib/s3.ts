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

export type S3Folder = 'images' | 'audio' | 'lipsync' | 'merged' | 'product-images' | 'product-videos'

/**
 * Uploads a buffer to S3 under the given folder and returns a pre-signed
 * GET URL valid for 1 hour so external services (e.g. VEED) can fetch it.
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

  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: 3600 },
  )

  return url
}
