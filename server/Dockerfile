FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache postgresql-client vips-dev python3 make g++

COPY package.json ./
COPY prisma ./prisma
RUN npm install --omit=dev --legacy-peer-deps && npm install -D typescript tsx prisma

COPY tsconfig.json ./
COPY src ./src
RUN npx prisma generate && npx tsc -p tsconfig.json

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node dist/src/index.js"]
