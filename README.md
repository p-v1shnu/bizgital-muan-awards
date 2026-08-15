# Muan Awards

ເວັບໄຊລາງວັນປະຈຳປີສຳລັບຜູ້ສ້າງສັນຄອນເທັນລາວ — annual awards site for Lao content creators, run by the Muan business unit at Bizgital.

Product contract: [`docs/muan-awards-prd.md`](docs/muan-awards-prd.md) (v1.2).
Design system and page mockups: [`docs/design/`](docs/design/) — open `style-guide.html` first.

---

## ເອກະສານ (Documentation)

| ໄຟລ໌ | ສຳລັບໃຜ |
|---|---|
| `docs/admin-guide.md` | **ທີມງານ Muan** — ວິທີໃຊ້ຫຼັງບ້ານ ຕັ້ງແຕ່ສ້າງປີຈົນປະກາດຜົນ (ພາສາລາວ) |
| `docs/deployment.md` | ຄົນທີ່ຂຶ້ນເຊີບເວີ — ຂັ້ນຕອນ + ເຊັກລິສຫຼັງ deploy |
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
# Fill in JWT_SECRET and REFRESH_TOKEN_SECRET — at least 32 characters each.
# The backend refuses to start otherwise.
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

```bash
cp .env.example .env        # real secrets, SETUP_ENABLED=true for the first deploy only
docker compose up -d --build
sudo cp Caddyfile.example /etc/caddy/Caddyfile   # edit the domain first
sudo caddy reload --config /etc/caddy/Caddyfile
```

Migrations run automatically on container start (`prisma migrate deploy`), so a
deploy needs no manual database step.

**Read [`docs/deployment.md`](docs/deployment.md) before the first deploy.** It
carries the post-deploy checklist — the checks that catch the failures which
only appear on a real server: an image host that does not match what was baked
into the build, bucket CORS refusing the upload, a proxy that hides the
visitor's IP so one rate-limit bucket is shared by everyone. `docker compose
up` has never been run against this repository, only validated, so treat the
first deploy as an exercise to be watched rather than a formality.

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
