# 📘 SGP SENA — Sistema de Gestión de Proyectos

Plataforma para administrar, dar seguimiento y controlar proyectos formativos dentro del entorno educativo del SENA. Facilita la organización del trabajo colaborativo entre aprendices e instructores, desde la planificación inicial hasta la entrega final.

## 👥 Stakeholders

- 👨‍🏫 **Instructores** — supervisan avances, asignan tareas, retroalimentan proyectos.
- 👨‍🎓 **Aprendices** — registran avances, suben entregables, consultan retroalimentación.
- 📑 **Administradores** — generan reportes de seguimiento global del grupo o centro.
- 🏢 **SENA – Centro de Formación** — beneficiario institucional.

## 👨‍💻 Equipo

| Integrante | Rol principal |
|---|---|
| Rubiel Rodríguez | Backend / Base de datos |
| Juan Manuel Arcila | Frontend / UI-UX |
| Juan Carlos Sánchez | QA / Tester |

Ver más en [`docs/05-equipo/`](docs/05-equipo/).

## 📂 Estructura del repositorio

```
sgp-sena/
├── backend/                 # API REST (Node.js + Express + MySQL, JWT, bcrypt)
├── frontend/                 # App React + Vite (login, dashboard, proyectos, tareas...)
├── database/                 # Todo lo relacionado a la BD (corre en Docker)
│   ├── docker-init/           # Scripts que Docker ejecuta al iniciar
│   ├── scripts-originales/    # Borradores previos, referencia histórica
│   └── backups/               # Dumps manuales
├── docs/
│   ├── 00-general/             # Descripción general del proyecto
│   ├── 01-requisitos/          # RF/RNF, reglas de negocio, restricciones, casos de uso, entrevistas
│   ├── 02-arquitectura/        # Diagramas UML/DER, modelo de datos, módulos ER
│   ├── 03-api/                 # Especificación de la API REST
│   ├── 04-gestion-proyecto/    # Sprints, backlog, impedimentos
│   └── 05-equipo/              # Información del equipo
├── docker-compose.yml
├── .env.example
└── README.md
```

## 🐳 Base de datos (Docker)

No se requiere MySQL instalado localmente. Todo corre en un contenedor:

```bash
cp .env.example .env
docker compose up -d
```

Más detalles en [`database/README.md`](database/README.md).

## 🚀 Levantar todo el proyecto (BD + backend + frontend)

```bash
# 1. Base de datos
cp .env.example .env
docker compose up -d

# 2. Backend
cd backend
cp .env.example .env
npm install
node database/seed.js   # datos de prueba (usuarios, proyectos...)
npm run dev              # http://localhost:3000

# 3. Frontend (en otra terminal)
cd frontend
npm install
npm run dev               # http://localhost:5173
```

Cuentas de prueba disponibles tras el seed en [`backend/README.md`](backend/README.md).

## 🌱 Flujo de ramas (Git Flow simplificado)

- **`main`** — código estable y entregable.
- **`develop`** — rama de integración de trabajo en curso.
- **`feature/*`** — una rama por tarea/módulo, creada desde `develop`
  (ej. `feature/backend-api`, `feature/frontend-ui`, `feature/db-docker`).

Flujo: `feature/*` → merge a `develop` cuando está probado → merge a `main` cuando es una versión estable.

## 📚 Documentación

Toda la documentación funcional y técnica del proyecto está en [`docs/`](docs/), organizada por tema y numerada en el orden lógico de lectura (requisitos → arquitectura → API → gestión de proyecto → equipo).
