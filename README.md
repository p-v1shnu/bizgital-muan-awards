# Muan Awards

ເວັບໄຊລາງວັນປະຈຳປີສຳລັບຜູ້ສ້າງສັນຄອນເທັນລາວ — annual awards site for Lao content creators, run by the Muan business unit at Bizgital.

Product contract: [`docs/muan-awards-prd.md`](docs/muan-awards-prd.md) (v1.4).
Design system and page mockups: [`docs/design/`](docs/design/) — open `style-guide.html` first.

---

## ເອກະສານ (Documentation)

| ໄຟລ໌ | ສຳລັບໃຜ |
|---|---|
| `docs/admin-guide.md` | **ທີມງານ Muan** — ວິທີໃຊ້ຫຼັງບ້ານ ຕັ້ງແຕ່ສ້າງປີຈົນປະກາດຜົນ (ພາສາລາວ) |
| `docs/deployment.md` | ຄົນທີ່ຂຶ້ນເຊີບເວີ — ຂັ້ນຕອນ + ເຊັກລິສຫຼັງ deploy |
| `docs/lao-copy-review.md` | **ຄົນລາວທີ່ກວດພາສາ** — ທຸກຂໍ້ຄວາມທີ່ AI ຂຽນ ແລະ ຍັງບໍ່ມີເຈົ້າຂອງພາສາກວດ |
| `docs/threat-model.md` | ບົດວິເຄາະຄວາມສ່ຽງດ້ານຄວາມປອດໄພ (STRIDE) — ສິ່ງທີ່ພົບ ແລະ ສິ່ງທີ່ຍອມຮັບຄວາມສ່ຽງໄວ້ |
| `docs/monitoring.md` | ຄົນທີ່ດູແລເຊີບເວີ — ຕັ້ງລະບົບເຕືອນເມື່ອເວັບລົ່ມ + ສິ່ງທີ່ຕ້ອງເຮັດເມື່ອມັນດັງ |
| `docs/seo.md` | ການຖືກຄົ້ນເຈີ — ສິ່ງທີ່ເຮັດແລ້ວສຳລັບ Google ແລະ AI ແລະ ສິ່ງທີ່ຈົງໃຈບໍ່ເຮັດ |
| `docs/muan-awards-prd.md` | ຂໍ້ກຳນົດທັງໝົດຂອງໂປຣເຈັກ |

## Stack

| Layer | Choice |
|---|---|
| Backend | NestJS 11, REST under `/api/v1/`, Swagger at `/api/docs` |
| Frontend | Next.js 16 App Router, Tailwind v4 |
| Database | MySQL 8.4 + Prisma 6 |
| Auth | JWT access token + refresh token in an HttpOnly cookie |
| Storage | MinIO locally, DigitalOcean Spaces in production |
| Runtime | Docker Compose behind Caddy |
| Timezone | `Asia/Vientiane` |

No Redis and no worker container: the MVP has no background jobs (PRD §9).
`submissionsCloseAt` is evaluated per request rather than by a scheduler.

---

## Local development

```bash
cp .env.example .env
# Fill in JWT_SECRET, REFRESH_TOKEN_SECRET and IP_HASH_SALT — at least 32
# characters each, and all three different. The backend refuses to start
# otherwise. IP_HASH_SALT is what makes a stored visitor address unreadable;
# docs/threat-model.md §3 has why it is not allowed to be one of the others.
openssl rand -base64 48

# MySQL + MinIO in Docker; the apps run on the host for hot reload.
docker compose -f docker-compose.local.yml up -d

cd backend
npm install
npx prisma migrate dev      # creates the schema
npm run seed                # site settings + a draft 2026 edition
npm run start:dev           # http://localhost:3001/api/docs

cd ../frontend
npm install
npm run dev                 # http://localhost:3000
```

`DATABASE_URL` in `.env` points at the `mysql` service name for Compose. When
running the backend on the host, change the host to `127.0.0.1:3306`.

### Tests

```bash
cd backend
# One-off: a throwaway schema the suite is allowed to wipe.
mysql -h 127.0.0.1 -u root -p -e "CREATE DATABASE muan_awards_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
DATABASE_URL="$TEST_DATABASE_URL" npx prisma migrate deploy

npm test
```

The suite runs against a real MySQL rather than a mocked Prisma, because
almost every rule worth testing is a database rule — unique slugs, one winner
per category, one year accepting entries at a time. It boots the actual
application with the same pipes, filters and guards as `main.ts`, so a test
cannot pass on a route production would reject.

### First admin account

There is no seeded admin — the first one is created through the app so the
password is never written into a file.

1. Keep `SETUP_ENABLED=true` in `.env`.
2. `POST /api/v1/auth/setup` with `{ email, password, name }` (min 12 characters).
3. Set `SETUP_ENABLED=false` and restart. The endpoint refuses to run twice
   regardless, but the flag closes it for good.

---

## Production

**[`docs/deployment.md`](docs/deployment.md) is the deployment procedure.** What
follows is the shape of it, not a substitute — every step below has a way of
failing that looks like something else, and that document is where each one is
written down.

```bash
cp .env.example .env        # real secrets, SETUP_ENABLED=true for the first deploy only
docker compose up -d --build
# Caddy: ADD a site block — see below before touching /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile
sudo caddy reload --config /etc/caddy/Caddyfile
```

Migrations run automatically on container start (`prisma migrate deploy`), so a
deploy needs no manual database step.

### Five things that will bite on a server that already runs something

Each of these was hit on a real first deploy, and each one presents as a
different problem than it is.

- **Never `cp Caddyfile.example /etc/caddy/Caddyfile` on a shared server.** It
  replaces the whole file, taking every other site on the machine with it. Add
  a block to the existing file instead. `Caddyfile.example` is a block to copy
  *from*, not a file to copy *over*.
- **3000 and 3001 are usually taken.** `FRONTEND_HOST_PORT` and
  `BACKEND_HOST_PORT` in `.env` move the published ports; the Caddyfile has to
  be changed to match, or every request is a 502. Note the names: `BACKEND_PORT`
  is a different variable — the port the API binds to *inside* the container,
  which stays 3001.
- **`NEXT_PUBLIC_*` is baked into the JavaScript at build time.** Editing `.env`
  and restarting does nothing; it needs `docker compose up -d --build frontend`.
  Get it wrong and the public pages look perfect — they render server-side and
  never use the value — while everything the *browser* calls fails with `Failed
  to fetch`: signing in, creating the first admin, uploading a picture, the
  public entry form.
- **`caddy reload`, not `systemctl reload caddy`.** The systemd wrapper swallows
  the error and returns 0 while Caddy rejects the new config and keeps running
  the old one. The symptom is a browser TLS error on a domain whose block looks
  correct in the file — because it was never loaded.
- **The `.cdn.` image domain does not exist until CDN is switched on.** Every
  Space answers on `<bucket>.<region>.digitaloceanspaces.com` the moment it's
  created; `<bucket>.<region>.cdn.digitaloceanspaces.com` only resolves once
  someone enables CDN for it in the dashboard. Put the `.cdn.` host into
  `S3_PUBLIC_URL` / `NEXT_PUBLIC_IMAGE_BASE_URL` before that and pictures fail
  with `DNS_PROBE_POSSIBLE`, not a permission error — worth telling apart from
  the previous point, since editing `NEXT_PUBLIC_*` needs a frontend rebuild
  either way and it is easy to reach for that fix when the domain is the one
  that's actually wrong. Start on the origin host; move to `.cdn.` only after
  CDN is confirmed on.

`docker compose up` had never been run against this repository when it was
written, only validated, so treat the first deploy on any new machine as an
exercise to be watched rather than a formality.

---

## Repository layout

```
backend/          NestJS API
  prisma/         schema.prisma — the single source of truth for the database
  src/common/     guards, filters, interceptors, decorators
  src/modules/    identity-access, editions, categories, creators, judges,
                  nominations, sponsors, submissions, site-settings, storage,
                  public-site, dashboard, audit, health
  test/           e2e specs, run against a real MySQL
frontend/         Next.js App Router
  src/app/(site)/ the seven public pages
  src/app/admin/  the ten back-office pages
  src/app/        globals.css holds the locked design tokens
  src/lib/api/    server reads and the browser client
  e2e/            Playwright specs — the browser pass
docs/             PRD, deployment guide, design system, mockups, logo assets
```

---

## Conventions worth knowing before editing

- **Design tokens are locked** in PRD §6.0.2 and mirrored in
  `frontend/src/app/globals.css`. Do not add colours outside that set; each one
  has a recorded contrast ratio against the paper background.
- **Never use the CSS `font:` shorthand.** It resets `font-family` and drops the
  Lao fallback, which renders Lao text in a mismatched face.
- **Serif** carries names and headings from 18px up; **sans** carries anything
  pressable, fillable, scannable, or under 17px.
- **`phase` and `submissionsOpen` are independent** (PRD §4). Phase is display
  state and moves forward only; the submission form is a separate switch, and
  at most one edition may hold it open.
- **"Latest edition" means three different things** (PRD §4.3.1) — the nav, the
  homepage winners strip and the timeline each have their own query in
  `EditionsService`. Don't collapse them.
- **The homepage is evergreen.** If nobody touched the site for 18 months, every
  section on it must still be correct. Per-year content belongs in
  `/awards/[year]`.
- **Every state change is audited** through `AuditService`. Application logs go
  to stdout and never into the database.
