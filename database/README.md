# Base de datos

La fuente única de verdad del esquema de producción es:

`database/docker-init/001_schema.sql`

Los archivos de `scripts-originales/` se conservan únicamente como referencia histórica y no deben usarse para desplegar la aplicación.

Para desarrollo con Docker:

```bash
cp ../.env.example ../.env
docker compose up -d
```

El contenedor MySQL permanece en la red interna de Compose y no publica el puerto al host.
