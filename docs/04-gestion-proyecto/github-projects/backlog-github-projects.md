# 📋 Backlog para GitHub Projects — SGP SENA

Clasificación de las 23 Historias de Usuario (`../../01-requisitos/historias-usuario/historias-usuario.md`)
en las 4 columnas que pide el profesor: **Backlog · En progreso · Pruebas · Hecho**.

Criterio de clasificación (honesto, no aspiracional):
- **Hecho** = endpoint existente, ya usado/demostrado en un sprint anterior (ver `../sprints/`).
- **Pruebas** = módulo construido y verificado por mí con pruebas end-to-end reales
  (MariaDB + servidor corriendo + `curl` contra los endpoints), pero **todavía sin
  un humano del equipo probándolo a través de la interfaz** en el navegador.
- **En progreso** = existe una parte del endpoint, pero la funcionalidad completa
  de la HU no está terminada (ej. se guarda la referencia de un archivo pero no
  el archivo físico).
- **Backlog** = no existe código todavía.

---

## 🟦 Backlog (4)

| HU | Título | Por qué está aquí |
|---|---|---|
| HU-16 | Recuperación de contraseña | No existe ningún endpoint de recuperación todavía |
| HU-28 | Notificaciones en tiempo real | Falta WebSockets o polling; hoy requiere recargar |
| HU-32 | Ver la línea de tiempo del proyecto | No existe una vista unificada de línea de tiempo |
| HU-35 | Exportar reportes del proyecto | No existe generación de PDF/Excel |

## 🟨 En progreso (3)

| HU | Título | Qué falta |
|---|---|---|
| HU-25 | Recibir alertas de entregas próximas o vencidas | Falta un job automático por fecha; hoy solo se notifica al programar reuniones |
| HU-33 | Vincular mi cuenta de GitHub | El CRUD ya existe; falta consumir la API real de GitHub (commits/ramas) |
| HU-34 | Adjuntar archivos a un entregable | Se guarda nombre+ruta; falta la subida física del binario |

## 🟧 Pruebas (4)

> Código nuevo, verificado por mí con pruebas end-to-end reales (login + JWT +
> MariaDB real + `curl`), pendiente de que un integrante del equipo lo pruebe
> manualmente desde el navegador antes de pasarlo a "Hecho".

| HU | Título | Verificación ya realizada |
|---|---|---|
| HU-23 | Comentar el avance de un entregable | `POST/GET /comentarios` probado con datos reales (RN-015) |
| HU-24 | Calificar un entregable | `POST /evaluaciones` probado en ambos sentidos: rechaza (400) si el proyecto no está "En Revisión", acepta (201) si sí lo está (RN-016) |
| HU-27 | Comentar dentro de una fase o entregable | Mismo endpoint que HU-23, ya probado |
| HU-31 | Programar reuniones del proyecto | `POST/GET /reuniones` probado; confirmé que notifica automáticamente a todo el equipo (RN-021) |

## 🟩 Hecho (12)

| HU | Título |
|---|---|
| HU-13 | Registro de usuarios |
| HU-14 | Inicio de sesión seguro |
| HU-15 | Acceso diferenciado por rol |
| HU-17 | Crear proyecto |
| HU-18 | Asignar aprendices al equipo del proyecto |
| HU-19 | Definir entregables por fase |
| HU-20 | Historial de cambios del proyecto |
| HU-21 | Ver el estado actual del proyecto |
| HU-22 | Ver el porcentaje de avance |
| HU-26 | Enviar mensajes dentro del proyecto |
| HU-29 | Asignar tareas a un integrante |
| HU-30 | Actualizar el estado de una tarea |

---

## Cómo crear el tablero (dos formas)

### Opción A — Manual (≈5 minutos, sin instalar nada)

1. En tu repo en GitHub: pestaña **Projects** → **New project** → plantilla **Board**.
2. Renombra las 4 columnas por defecto a: `Backlog`, `En progreso`, `Pruebas`, `Hecho`.
3. En cada columna, botón **+ Add item** → **+ Draft issue**, y pega el título de
   cada HU de la tabla correspondiente de arriba (23 tarjetas en total).
4. Opcional: abre cada tarjeta y en la descripción pega el link a su sección en
   `historias-usuario.md` para no duplicar contenido.

### Opción B — Automática con GitHub CLI (`gh`)

Si tienes `gh` instalado y autenticado (`gh auth login`), corre el script
[`crear-github-project.sh`](./crear-github-project.sh) desde la raíz del repo:

```bash
chmod +x docs/04-gestion-proyecto/github-projects/crear-github-project.sh
./docs/04-gestion-proyecto/github-projects/crear-github-project.sh
```

El script crea el proyecto, las 4 columnas y las 23 tarjetas automáticamente
usando tu propia sesión de `gh` (nadie más que tú necesita dar permisos).
Revisa el script antes de correrlo — es buena práctica no ejecutar scripts de
terceros sin leerlos primero.
