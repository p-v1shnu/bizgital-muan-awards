#!/usr/bin/env node
/**
 * Grants public-read on every image in the bucket that does not already have
 * it — the step DigitalOcean Spaces will not let the app do for itself.
 *
 * Spaces has no working bucket policy (PutBucketPolicy answers 403 even with
 * a fully-privileged key) and a bucket-wide `public-read` ACL only grants
 * ListBucket, not GetObject on the objects inside it — confirmed against the
 * real bucket, not assumed. The only thing that actually makes a file
 * readable is a per-object ACL, and Spaces access keys scoped to one bucket
 * only ever offer "Read" or "Read/Write/Delete" — neither includes the right
 * to grant an ACL. Only an All-Buckets (Full Access) key can, and that key
 * reaches every bucket in the account, this system's and every other
 * Bizgital project's alike.
 *
 * So it stays out of the app entirely. storage.service.ts signs uploads with
 * the bucket-scoped key the way it always has, and never touches this one.
 * This script is the only thing that ever holds the privileged key, and only
 * for as long as one invocation takes — passed in on the command line by
 * whatever runs it (cron, or a person after uploading), never written into
 * .env or docker-compose.yml. See docs/deployment.md for how it is wired up.
 *
 * Run inside the backend container so it can reuse its own aws-sdk:
 *   docker compose exec -T \
 *     -e S3_ADMIN_ACCESS_KEY=... -e S3_ADMIN_SECRET_KEY=... \
 *     backend node scripts/grant-public-read.js
 */
const {
  S3Client,
  ListObjectsV2Command,
  GetObjectAclCommand,
  PutObjectAclCommand,
} = require('@aws-sdk/client-s3');

const ALL_USERS_GROUP = 'http://acs.amazonaws.com/groups/global/AllUsers';

function isAlreadyPublic(grants) {
  return (grants ?? []).some(
    (grant) => grant.Grantee?.URI === ALL_USERS_GROUP && grant.Permission === 'READ',
  );
}

async function main() {
  const accessKeyId = process.env.S3_ADMIN_ACCESS_KEY;
  const secretAccessKey = process.env.S3_ADMIN_SECRET_KEY;
  if (!accessKeyId || !secretAccessKey) {
    console.error('Set S3_ADMIN_ACCESS_KEY and S3_ADMIN_SECRET_KEY — a Full Access Spaces key.');
    process.exitCode = 1;
    return;
  }

  const bucket = process.env.S3_BUCKET;
  const client = new S3Client({
    region: process.env.S3_REGION,
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
  });

  let granted = 0;
  let alreadyPublic = 0;
  let failed = 0;
  let continuationToken;

  do {
    const page = await client.send(
      new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: continuationToken }),
    );

    for (const object of page.Contents ?? []) {
      try {
        const acl = await client.send(new GetObjectAclCommand({ Bucket: bucket, Key: object.Key }));
        if (isAlreadyPublic(acl.Grants)) {
          alreadyPublic += 1;
          continue;
        }
        await client.send(
          new PutObjectAclCommand({ Bucket: bucket, Key: object.Key, ACL: 'public-read' }),
        );
        granted += 1;
        console.log(`granted: ${object.Key}`);
      } catch (caught) {
        failed += 1;
        console.error(`failed: ${object.Key} — ${caught instanceof Error ? caught.message : caught}`);
      }
    }

    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);

  console.log(`done — granted ${granted}, already public ${alreadyPublic}, failed ${failed}`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((caught) => {
  console.error(caught);
  process.exitCode = 1;
});
