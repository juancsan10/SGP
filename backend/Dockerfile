FROM node:20.19.5-alpine3.21 AS production
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod --ignore-scripts
COPY . .
USER node
EXPOSE 3000
CMD ["node","server.js"]
