FROM node:18
WORKDIR /usr/src/app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
RUN pnpm build
EXPOSE 5675
CMD pnpm prisma migrate deploy && pnpm start:prod
