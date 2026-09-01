# Auditoría de dependencias

## Instalación reproducible

```bash
pnpm install --frozen-lockfile --ignore-scripts
```

## Vulnerabilidades

```bash
pnpm audit --audit-level=low
pnpm audit --json > audit-$(date +%F).json
```

## Versiones pinadas

```bash
grep -nE '"[^"]+": *"[\^~*]' backend/package.json frontend/package.json
```

La ausencia de salida indica que no existen comodines de versión.

## Dependencias sin usar

```bash
pnpm dlx depcheck
```

## Lockfile

```bash
git diff origin/develop -- pnpm-lock.yaml
```

Cadencia: auditoría en cada PR hacia `develop` y revisión completa antes de cada merge a `main`.
