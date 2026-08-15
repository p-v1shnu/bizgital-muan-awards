import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { HeadBucketCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';

/** Only formats the site actually renders. Anything else is refused. */
const ALLOWED = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/avif', 'avif'],
]);

const MAX_BYTES = 8 * 1024 * 1024;

export type UploadFolder = 'creators' | 'judges' | 'sponsors' | 'editions' | 'site';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket = process.env.S3_BUCKET ?? 'muan-awards';

  constructor() {
    this.client = new S3Client({
      region: process.env.S3_REGION ?? 'us-east-1',
      endpoint: process.env.S3_ENDPOINT,
      // MinIO serves buckets as a path, not a subdomain.
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY ?? '',
        secretAccessKey: process.env.S3_SECRET_KEY ?? '',
      },
    });
  }

  /**
   * The browser uploads straight to object storage with this URL, so image
   * bytes never pass through the API container.
   */
  async createUploadUrl(folder: UploadFolder, contentType: string, sizeBytes: number) {
    const extension = ALLOWED.get(contentType);
    if (!extension) {
      throw new BadRequestException(`Unsupported type ${contentType}. Use JPEG, PNG, WebP or AVIF.`);
    }
    if (sizeBytes > MAX_BYTES) {
      throw new BadRequestException(`File is too large. The limit is ${MAX_BYTES / 1024 / 1024} MB.`);
    }

    const key = `${folder}/${randomUUID()}.${extension}`;
    const uploadUrl = await getSignedUrl(
      this.client,
      new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType }),
      { expiresIn: 300 },
    );

    // The key is what gets stored on the record; the public URL is derived
    // from it at render time so the CDN host can change without a migration.
    return { key, uploadUrl, publicUrl: this.publicUrl(key) };
  }

  /**
   * Asks the bucket whether it is there, for the health probe.
   *
   * Nothing else in a request path notices that storage is down: signing a URL
   * is arithmetic, and the pictures are fetched by the visitor's browser, not
   * by us. Stopping MinIO left every page answering 200 with every picture
   * missing — so the only way anyone finds out is to ask on purpose.
   *
   * The five-second ceiling is the point of the abort: the SDK's own retries
   * would otherwise keep a probe waiting long past the moment the answer stops
   * being useful.
   */
  async checkBucket() {
    const abort = AbortSignal.timeout(5_000);
    await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }), { abortSignal: abort });
  }

  publicUrl(key: string | null | undefined) {
    if (!key) return null;
    const base = (process.env.S3_PUBLIC_URL ?? '').replace(/\/$/, '');
    return `${base}/${key}`;
  }
}
