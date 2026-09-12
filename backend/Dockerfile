FROM node:20.19.5-alpine3.21 AS production
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod --ignore-scripts
COPY . .
# NUEVO: crea la carpeta de uploads con el dueño correcto ANTES de cambiar
# a USER node. Así, cuando docker-compose monte el volumen "uploads_data"
# sobre /app/uploads, Docker copia el contenido/permisos de esta carpeta
# (vacía, pero ya con dueño "node") en vez de dejarla como root — si no se
# hiciera esto, el proceso (que corre como "node") no podría escribir los
# archivos subidos por los usuarios.
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads
USER node
EXPOSE 3000
CMD ["node","server.js"]
