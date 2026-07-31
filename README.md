# RiseNext Enterprise Admin

Complete enterprise admin dashboard + headless CMS for **risenext.in**.
Brand system: cream `#F5F2E8`, ink `#14110C`, ember accent `#C2571F`, moss `#3F4A34`.

## Stack
- **Frontend** — Next.js 14 (App Router), React 18, TypeScript, TailwindCSS, Framer Motion, Socket.io client, Recharts
- **Backend** — Node.js, Express, TypeScript, Prisma, PostgreSQL, Redis, Socket.io, JWT, Cloudinary, Nodemailer
- **Infra** — Docker / docker-compose, Render (API), Vercel (web)

## Monorepo
```
RiseNext-Enterprise-Admin/
├── server/          Express + Prisma API
│   ├── prisma/      schema.prisma, seed.ts
│   └── src/
│       ├── lib/         prisma, redis, cloudinary, socket, mailer, whatsapp, backup
│       ├── middleware/  auth, rbac, upload, audit, error, rateLimit
│       └── modules/     one router per domain (auth, cms, blog, crm, hrms, ads…)
└── web/             Next.js admin
    ├── app/(auth)/login       cinematic office entrance
    ├── app/(admin)/*          40+ module screens
    ├── components/            ui kit, entrance, uploader, charts
    └── lib/                   api client, auth, socket, theme, resources config
```

## Quick start
```bash
cp .env.example .env
docker compose up -d db redis
npm install
npm --workspace server run prisma:push
npm --workspace server run seed
npm run dev            # api :4000  web :3000
```
Seed admin: `admin@risenext.in` / `RiseNext@2026`

## Roles
`SUPER_ADMIN` · `ADMIN` · `EDITOR` · `HR` · `MARKETING` · `SALES` · `EMPLOYEE` · `VIEWER`
Permissions are resource:action strings resolved in `server/src/middleware/rbac.ts`.

## Login experience
1. `Admin` button → cinematic office entrance (lobby dolly-in, security guard greeting)
2. Glass doors part → premium glass login card
3. Success → reception welcome → dashboard boot
4. 5 failed attempts → login disabled for 15 seconds (server + client enforced)

## Uploads
Images, video, PDF, Word, Excel, PowerPoint, SVG, ZIP. Drag & drop, previews, progress,
image compression (sharp), background queue, replace, delete. Storage: Cloudinary
(fallback: local `server/uploads`).

## Deploy
- API → Render via `render.yaml` (Docker) — set env vars from `.env.example`
- Web → Vercel via `vercel.json` — set `NEXT_PUBLIC_API_URL`
