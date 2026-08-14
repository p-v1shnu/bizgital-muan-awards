# Muan Awards

ເວັບໄຊລາງວັນປະຈຳປີສຳລັບຜູ້ສ້າງສັນຄອນເທັນລາວ — annual awards site for Lao content creators, run by the Muan business unit at Bizgital.

Product contract: [`docs/muan-awards-prd.md`](docs/muan-awards-prd.md) (v1.2).
Design system and page mockups: [`docs/design/`](docs/design/) — open `style-guide.html` first.

---

## Stack

| Layer | Choice |
|---|---|
| Backend | NestJS 11, REST under `/api/v1/`, Swagger at `/api/docs` |
| Frontend | Next.js 15 App Router, Tailwind v4, shadcn/ui |
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

---

## Repository layout

```
backend/          NestJS API
  prisma/         schema.prisma — the single source of truth for the database
  src/common/     guards, filters, interceptors, decorators
  src/modules/    identity-access, editions, audit, health
frontend/         Next.js App Router
  src/app/        routes; globals.css holds the locked design tokens
  src/lib/api/    typed fetch client
docs/             PRD, design system, mockups, logo assets
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
