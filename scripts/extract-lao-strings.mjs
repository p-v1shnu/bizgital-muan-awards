#!/usr/bin/env node
/**
 * Pulls every Lao string that ships — code, seed, metadata — into the review
 * tables under docs/lao-review/.
 *
 * The Lao copy on this site was written by AI with no native speaker in the
 * loop. Reviewing it by clicking through the site does not work: most of these
 * strings only appear in a state you have to engineer (an unpublished year, a
 * closed submission window, an empty list, a delete confirmation). So the
 * strings come to the reviewer instead of the reviewer hunting for them.
 *
 * Usage:
 *   node scripts/extract-lao-strings.mjs           # counts only, writes nothing
 *   node scripts/extract-lao-strings.mjs --write   # regenerate the tables
 *
 * --write overwrites the batch files, which throws away anything already filled
 * into the "แก้เป็น" column. Regenerate only from a clean checkout of them.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const LAO = /[຀-໿]/;
// A segment is a run of text with no JS/JSX punctuation in it. That splits a
// long sentence at a `{...}` interpolation, which is what we want: the reviewer
// sees the wording, not the code around it.
const SEGMENT = /[^\n"'`{}<>=]+/g;

const AREAS = [
  { key: 'public', paths: ['frontend/src/app/(site)', 'frontend/src/components/site'] },
  {
    key: 'admin',
    paths: ['frontend/src/app/admin', 'frontend/src/components/admin', 'frontend/src/components/ui'],
  },
  { key: 'frontend-other', paths: ['frontend/src'] },
  { key: 'seed', paths: ['backend/prisma/seed.ts'] },
  { key: 'backend', paths: ['backend/src'] },
];

const SKIP_DIRS = new Set(['node_modules', '.next', 'dist']);

function walk(path, out = []) {
  let stat;
  try {
    stat = statSync(path);
  } catch {
    return out;
  }
  if (stat.isFile()) {
    if (path.endsWith('.ts') || path.endsWith('.tsx')) out.push(path);
    return out;
  }
  for (const entry of readdirSync(path).sort()) {
    if (SKIP_DIRS.has(entry)) continue;
    walk(join(path, entry), out);
  }
  return out;
}

function clean(raw) {
  return raw
    .replace(/\\[nt]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^\$|\$$/g, '{…}')
    .replace(/^[\s,;:|]+|[\s,;:|]+$/g, '');
}

/** area key -> Map(text -> ["file:line", ...]) */
function collect() {
  const seen = new Set();
  const areas = new Map();
  for (const { key, paths } of AREAS) {
    const found = new Map();
    for (const path of paths) {
      for (const file of walk(path)) {
        if (seen.has(file)) continue;
        seen.add(file);
        const src = readFileSync(file, 'utf8');
        for (const match of src.matchAll(SEGMENT)) {
          if (!LAO.test(match[0])) continue;
          const text = clean(match[0]);
          if (!text) continue;
          const line = src.slice(0, match.index).split('\n').length;
          const loc = `${file}:${line}`;
          const locs = found.get(text) ?? [];
          if (!locs.includes(loc)) locs.push(loc);
          found.set(text, locs);
        }
      }
    }
    areas.set(key, found);
  }
  return areas;
}

const LABELS = {
  'frontend/src/app/(site)/page.tsx': 'หน้าแรก',
  'frontend/src/app/(site)/about/page.tsx': 'หน้า /about (เกี่ยวกับงาน)',
  'frontend/src/app/(site)/submit/page.tsx': 'หน้า /submit (เสนอชื่อ)',
  'frontend/src/app/(site)/submit/submit-form.tsx': 'ฟอร์มเสนอชื่อ',
  'frontend/src/app/(site)/awards/[year]/page.tsx': 'หน้างานรายปี',
  'frontend/src/app/(site)/awards/[year]/[category]/page.tsx': 'หน้าสาขา',
  'frontend/src/app/(site)/creators/[slug]/page.tsx': 'หน้าโปรไฟล์ผู้สร้างสรรค์',
  'frontend/src/app/(site)/winners/page.tsx': 'หน้าทำเนียบผู้ชนะ',
  'frontend/src/components/site/chrome.tsx': 'แถบบน + footer (ทุกหน้า)',
  'frontend/src/components/site/shell.tsx': 'โครงหน้าเว็บ (ทุกหน้า)',
  'frontend/src/components/site/not-found-body.tsx': 'หน้า 404',
  'frontend/src/components/site/primitives.tsx': 'ชิ้นส่วนหน้าเว็บ',
  'backend/prisma/seed.ts': 'ค่าตั้งต้นในฐานข้อมูล',
  'frontend/src/app/layout.tsx': 'metadata ของเว็บ (แท็บ/แชร์ลิงก์)',
  'frontend/src/lib/structured-data.tsx': 'structured data ให้ Google',
  'frontend/src/app/llms.txt/route.ts': 'ไฟล์ llms.txt',
  'frontend/src/app/admin/(shell)/site/page.tsx': 'หลังบ้าน · ตั้งค่าเว็บ',
  'frontend/src/app/admin/(shell)/page.tsx': 'หลังบ้าน · หน้าแรก',
  'frontend/src/app/admin/(shell)/submissions/page.tsx': 'หลังบ้าน · รายชื่อที่ส่งเข้ามา',
  'frontend/src/app/admin/(shell)/audit/page.tsx': 'หลังบ้าน · ประวัติการแก้ไข',
  'frontend/src/app/admin/(shell)/users/page.tsx': 'หลังบ้าน · ผู้ใช้',
  'frontend/src/app/admin/(shell)/editions/page.tsx': 'หลังบ้าน · รายการปี',
  'frontend/src/app/admin/(shell)/editions/[id]/page.tsx': 'หลังบ้าน · หน้าปี',
  'frontend/src/app/admin/(shell)/editions/[id]/tabs.tsx': 'หลังบ้าน · แท็บของปี',
  'frontend/src/app/admin/(shell)/editions/[id]/details-tab.tsx': 'หลังบ้าน · ปี > รายละเอียด',
  'frontend/src/app/admin/(shell)/editions/[id]/categories-tab.tsx': 'หลังบ้าน · ปี > สาขา',
  'frontend/src/app/admin/(shell)/editions/[id]/nominees-tab.tsx': 'หลังบ้าน · ปี > ผู้เข้าชิง',
  'frontend/src/app/admin/(shell)/editions/[id]/judges-tab.tsx': 'หลังบ้าน · ปี > กรรมการ',
  'frontend/src/app/admin/(shell)/editions/[id]/sponsors-tab.tsx': 'หลังบ้าน · ปี > สปอนเซอร์',
  'frontend/src/app/admin/(shell)/editions/[id]/publish-panel.tsx': 'หลังบ้าน · ปี > เผยแพร่',
  'frontend/src/app/admin/(shell)/creators/page.tsx': 'หลังบ้าน · ผู้สร้างสรรค์',
  'frontend/src/app/admin/(shell)/judges/page.tsx': 'หลังบ้าน · คลังกรรมการ',
  'frontend/src/app/admin/setup/page.tsx': 'หลังบ้าน · ตั้งค่าครั้งแรก',
  'frontend/src/app/admin/login/page.tsx': 'หลังบ้าน · เข้าสู่ระบบ',
  'frontend/src/components/admin/sidebar.tsx': 'หลังบ้าน · เมนูข้าง',
  'frontend/src/components/admin/preview-link.tsx': 'หลังบ้าน · ปุ่มพรีวิว',
  'frontend/src/components/admin/creator-picker.tsx': 'หลังบ้าน · ช่องเลือกผู้สร้างสรรค์',
  'frontend/src/components/admin/phase-steps.tsx': 'หลังบ้าน · แถบสถานะของปี',
  'frontend/src/components/admin/image-upload.tsx': 'หลังบ้าน · อัปโหลดรูป',
  'frontend/src/components/admin/gallery-editor.tsx': 'หลังบ้าน · คลังภาพ',
  'frontend/src/components/admin/entry-list-editor.tsx': 'หลังบ้าน · ตัวแก้รายการ (FAQ/ขั้นตอน)',
  'frontend/src/components/admin/pager.tsx': 'หลังบ้าน · แถบแบ่งหน้า',
  'frontend/src/components/admin/page-header.tsx': 'หลังบ้าน · หัวหน้าจอ',
  'frontend/src/components/ui/dialog.tsx': 'หลังบ้าน · กล่องโต้ตอบ',
  'frontend/src/components/ui/badge.tsx': 'หลังบ้าน · ป้ายสถานะ',
  'frontend/src/components/ui/feedback.tsx': 'หลังบ้าน · ข้อความแจ้งผล',
  'backend/src/modules/site-settings/dto/site-settings.dto.ts': 'ตัวอย่างในเอกสาร API — ตั้งค่าเว็บ',
  'backend/src/modules/judges/dto/judge.dto.ts': 'ตัวอย่างในเอกสาร API — กรรมการ',
  'backend/src/modules/categories/dto/category.dto.ts': 'ตัวอย่างในเอกสาร API — สาขา',
  'backend/src/modules/creators/dto/creator.dto.ts': 'ตัวอย่างในเอกสาร API — ผู้สร้างสรรค์',
  'backend/src/modules/editions/dto/create-edition.dto.ts': 'ตัวอย่างในเอกสาร API — ปีการประกวด',
  'backend/src/modules/sponsors/dto/sponsor-tier.dto.ts': 'ตัวอย่างในเอกสาร API — หมวดสปอนเซอร์',
  'backend/src/modules/public-site/public-site.service.ts': 'ชื่อตัวอย่างในคอมเมนต์ (ไม่ขึ้นหน้าเว็บ)',
  'backend/src/modules/submissions/submissions.service.ts': 'ชื่อตัวอย่างในคอมเมนต์ (ไม่ขึ้นหน้าเว็บ)',
};

// The public batch is ordered the way a visitor meets the site, not the way the
// filesystem sorts. Everything else falls back to path order.
const PUBLIC_ORDER = [
  'frontend/src/app/(site)/page.tsx',
  'frontend/src/app/(site)/about/page.tsx',
  'frontend/src/app/(site)/submit/page.tsx',
  'frontend/src/app/(site)/submit/submit-form.tsx',
  'frontend/src/app/(site)/awards/[year]/page.tsx',
  'frontend/src/app/(site)/awards/[year]/[category]/page.tsx',
  'frontend/src/app/(site)/winners/page.tsx',
  'frontend/src/app/(site)/creators/[slug]/page.tsx',
  'frontend/src/components/site/chrome.tsx',
  'frontend/src/components/site/shell.tsx',
];

function render(entries, { prefix, title, intro, order }) {
  const rows = [...entries].map(([text, locs]) => {
    const at = locs[0].lastIndexOf(':');
    return { file: locs[0].slice(0, at), line: Number(locs[0].slice(at + 1)), text, locs };
  });
  const rank = (file) => (order ? (order.indexOf(file) + 1 || 999) : 0);
  rows.sort((a, b) => rank(a.file) - rank(b.file) || a.file.localeCompare(b.file) || a.line - b.line);

  const out = [`# ${title}`, '', intro, '', '---', ''];
  let n = 0;
  let current = null;
  for (const row of rows) {
    if (row.file !== current) {
      current = row.file;
      out.push(
        '',
        `## ${LABELS[row.file] ?? row.file}`,
        '',
        '`' + row.file + '`',
        '',
        '| ID | ข้อความตอนนี้ | บรรทัด | แก้เป็น |',
        '|---|---|---|---|',
      );
    }
    n += 1;
    const repeats = row.locs.length > 1 ? ` _(ซ้ำ ${row.locs.length} จุด)_` : '';
    const id = `${prefix}-${String(n).padStart(3, '0')}`;
    out.push(`| ${id} | ${row.text.replace(/\|/g, '\\|')}${repeats} | ${row.line} |  |`);
  }
  out.push('', '---', '', `**รวม ${n} รายการ**`, '');
  return { body: out.join('\n') + '\n', count: n };
}

const areas = collect();
const rest = new Map(areas.get('frontend-other'));
for (const [text, locs] of areas.get('backend')) {
  rest.set(text, [...(rest.get(text) ?? []), ...locs]);
}

const BATCHES = [
  {
    file: 'docs/lao-review/01-public-site.md',
    entries: areas.get('public'),
    prefix: 'P',
    order: PUBLIC_ORDER,
    title: 'ชุดที่ 1 — ข้อความที่คนทั่วไปเห็น (หน้าเว็บสาธารณะ)',
    intro:
      'เรียงตามหน้า · ช่อง **แก้เป็น** ว่างไว้ให้เติมภาษาลาวที่ถูกต้อง · ถ้าอันไหนถูกอยู่แล้วใส่ `OK`',
  },
  {
    file: 'docs/lao-review/02-seed-defaults.md',
    entries: areas.get('seed'),
    prefix: 'S',
    title: 'ชุดที่ 2 — ค่าตั้งต้นในฐานข้อมูล (seed)',
    intro:
      'ข้อความชุดนี้ถูกเขียนลงฐานข้อมูลตอนติดตั้งครั้งแรก และทีมแก้เองได้ที่ `/admin/site` · ' +
      'แก้ที่นี่ = แก้ค่าตั้งต้นของการติดตั้งครั้งต่อไป ส่วนเว็บที่รันอยู่ต้องอัปเดตในหลังบ้านด้วย',
  },
  {
    file: 'docs/lao-review/03-admin.md',
    entries: areas.get('admin'),
    prefix: 'A',
    title: 'ชุดที่ 3 — ข้อความในหลังบ้าน (เห็นเฉพาะทีมงาน)',
    intro:
      'ส่วนใหญ่เป็นปุ่ม ป้ายกำกับ และคำอธิบายใต้ช่องกรอก · ความสำคัญรองจากชุดที่ 1 และ 2',
  },
  {
    file: 'docs/lao-review/04-metadata-backend.md',
    entries: rest,
    prefix: 'B',
    title: 'ชุดที่ 4 — metadata, structured data และฝั่งเซิร์ฟเวอร์',
    intro:
      'ข้อความที่ไม่ได้อยู่บนหน้าเว็บโดยตรง แต่ไปโผล่ที่แท็บเบราว์เซอร์ ผลค้นหา Google และตัวอย่างในเอกสาร API · '
      + 'ส่วนที่เขียนว่า “ในคอมเมนต์” เป็นชื่อตัวอย่างในโค้ด ไม่มีใครเห็นบนเว็บ ตรวจแค่ว่าเป็นชื่อลาวที่ดูธรรมชาติพอ',
  },
];

const write = process.argv.includes('--write');
let total = 0;
for (const batch of BATCHES) {
  const { body, count } = render(batch.entries, batch);
  total += count;
  if (write) writeFileSync(batch.file, body);
  console.log(`${String(count).padStart(4)}  ${batch.file}`);
}
console.log(`${String(total).padStart(4)}  total${write ? ' (written)' : ' (dry run — pass --write)'}`);
