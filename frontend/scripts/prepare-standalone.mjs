import { cp, access } from 'node:fs/promises';

/**
 * `output: 'standalone'` emits a server bundle without the static assets
 * beside it, so `node .next/standalone/server.js` serves a page with no CSS
 * and no fonts. Copying them here means `npm start` behaves the same as the
 * container, instead of being a trap that looks like a styling bug.
 */
const copies = [
  ['.next/static', '.next/standalone/.next/static'],
  ['public', '.next/standalone/public'],
];

for (const [from, to] of copies) {
  try {
    await access(from);
  } catch {
    continue; // public/ may be empty on a fresh checkout
  }
  await cp(from, to, { recursive: true, force: true });
}
