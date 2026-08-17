import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { HeadBucketCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';

/** Only formats the site actually renders. Anything else is refused. */
const ALLOWED = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/avif', 'avif'],
]);

/** Also the ceiling multer is configured with, in storage.controller.ts. */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

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
   * The file passes through this container rather than going straight from
   * the browser to storage, which is not how this started. A presigned PUT
   * URL was the first design — bytes never touching the API — but it cannot
   * make the object it creates readable: DigitalOcean Spaces silently drops
   * an ACL grant signed into a presigned URL's query string, on a key scoped
   * to one bucket, even though that exact key can grant the exact same ACL
   * when it makes the PutObject call itself, authenticated the ordinary way.
   * Confirmed both halves against the real bucket, not assumed. Query-string
   * auth and header auth are evidently not treated alike here, and the
   * request has to be the second kind — which only this process, not the
   * browser, can make.
   *
   * The alternative was a Full Access (all-buckets) key kept just for
   * granting ACLs after the fact. That key would reach every other Bizgital
   * bucket on the same account, not just this one, for a problem this file
   * upload solves without needing it at all.
   */
  async uploadFile(file: Express.Multer.File, folder: UploadFolder) {
    const extension = ALLOWED.get(file.mimetype);
    if (!extension) {
      throw new BadRequestException(`Unsupported type ${file.mimetype}. Use JPEG, PNG, WebP or AVIF.`);
    }

    const key = `${folder}/${randomUUID()}.${extension}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ContentLength: file.size,
        ACL: 'public-read',
      }),
    );

    // The key is what gets stored on the record; the public URL is derived
    // from it at render time so the CDN host can change without a migration.
    return { key, publicUrl: this.publicUrl(key) };
  }

  /**
   * Asks the bucket whether it is there, for the health probe.
   *
   * A visitor's browser fetches pictures straight from the public URL, not
   * through this container, so stopping MinIO left every page answering 200
   * with every picture missing — the only way anyone finds out is to ask on
   * purpose. Uploading now goes through this container too (uploadFile
   * above), so a down bucket also surfaces there, as an upload that fails.
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
