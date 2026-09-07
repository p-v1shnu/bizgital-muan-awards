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

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * What the file actually is, read from its first bytes.
 *
 * The type used to come from `file.mimetype`, which is not a fact about the
 * file: it is the `Content-Type` the sender wrote on the multipart part, and a
 * sender picks it freely. Anything at all — a script, an HTML page, a zip —
 * could be sent labelled `image/png` and was then stored under a `.png` key,
 * served `Content-Type: image/png`, and world-readable on the bucket the
 * public site loads from. Answering with a type nobody can execute is most of
 * what keeps that harmless, and it was the *sender's* claim deciding it.
 *
 * The bytes decide now, and the declared type is not consulted at all: the
 * extension on the key and the `Content-Type` the CDN will answer with both
 * come from this, so the two can never disagree with the content.
 */
function sniffImageType(buffer: Buffer): string | null {
  // JPEG — SOI marker, then the start of the first segment.
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  // PNG — the 8-byte signature, chosen by the format to survive bad transfers.
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return 'image/png';
  }
  // WebP — a RIFF container whose form type is WEBP.
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  // AVIF — an ISO base media file whose brand says AVIF. The major brand sits
  // at 8; `avis` is the image-sequence sibling, and both are read by the same
  // decoders the site relies on.
  if (buffer.length >= 12 && buffer.toString('ascii', 4, 8) === 'ftyp') {
    const brand = buffer.toString('ascii', 8, 12);
    if (brand === 'avif' || brand === 'avis') return 'image/avif';
  }
  return null;
}

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
    // The bytes, not the sender's `Content-Type` — see `sniffImageType`.
    const mimetype = sniffImageType(file.buffer);
    const extension = mimetype && ALLOWED.get(mimetype);
    if (!mimetype || !extension) {
      throw new BadRequestException(
        'That file is not a JPEG, PNG, WebP or AVIF image. Re-save it as one and try again.',
      );
    }

    const key = `${folder}/${randomUUID()}.${extension}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: mimetype,
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
