FROM node:22-alpine
WORKDIR /usr/src/app
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY tsconfig.json ./
RUN DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder" \
    DIRECT_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder" \
    pnpm prisma generate
COPY . .
RUN pnpm build
ENV NODE_ENV=production
EXPOSE 8030
CMD ["sh", "-c", "pnpm prisma migrate deploy && pnpm start:prod"]
