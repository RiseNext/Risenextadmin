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
- API → Railway using `server/railway.json` and `server/Dockerfile`. Set the service root directory to `/server` and config file path to `/server/railway.json`. Set `DATABASE_URL` to the existing Neon connection string and `WEB_ORIGIN=https://admin.risenext.in` in Railway variables. Keep Neon credentials out of source control.
- Web/admin → Vercel using `vercel.json`. Set `NEXT_PUBLIC_API_URL` to the deployed Railway API URL at build time, then assign `admin.risenext.in` to the Vercel project.
- Keep `risenext.in` and `www.risenext.in` pointed at the company website. The website integration is a later step; when ready, add its origin to Railway's `WEB_ORIGIN` and connect it to the public CMS API.
