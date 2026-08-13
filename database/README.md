# Base de datos — SGP SENA

Toda la base de datos corre **exclusivamente en Docker**. No se requiere instalar MySQL de forma local.

## Cómo levantarla

Desde la raíz del repositorio:

```bash
cp .env.example .env   # si no existe aún; ajusta las claves
docker compose up -d
```

Al primer arranque, MySQL 8 ejecuta automáticamente, en orden, todo lo que está en `docker-init/`:

1. `001_schema.sql` — crea la base de datos y las 16 tablas (sin datos)
2. `002_seed_data.sql` — inserta datos de ejemplo para desarrollo/pruebas

## Reiniciar la base de datos desde cero

```bash
docker compose down -v   # -v borra también el volumen de datos
docker compose up -d
```

## Estructura

```
database/
├── docker-init/            # scripts que Docker ejecuta automáticamente
│   ├── 001_schema.sql
│   └── 002_seed_data.sql
├── scripts-originales/      # borradores/versiones previas, solo como referencia histórica
└── backups/                 # dumps manuales (ignorado por git, excepto .gitkeep)
```

## Nota sobre `scripts-originales/`

Se conservan como referencia los 3 scripts SQL del proyecto original:
- `BASE_DE_DATOS_OFICIAL_CON_inserciones.sql` — fuente usada para generar `001_schema.sql` y `002_seed_data.sql`
- `script_base_datos_TABLAS_ESQUEMA.sql` — versión previa del esquema (equivalente, sin datos)
- `script_MER.sql` — borrador más antiguo, incompleto (11 de 16 tablas), se deja solo con fines históricos

No se usan directamente en Docker; el flujo oficial es `docker-init/`.
