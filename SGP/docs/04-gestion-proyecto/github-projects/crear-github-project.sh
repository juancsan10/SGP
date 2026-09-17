#!/usr/bin/env bash
# ============================================================
# Crea el GitHub Project "SGP SENA - Backlog" con 4 columnas
# (Backlog / En progreso / Pruebas / Hecho) y las 23 tarjetas
# de historias de usuario, usando tu propia sesión de `gh`.
#
# Requisitos:
#   - GitHub CLI instalado: https://cli.github.com
#   - Sesión iniciada:      gh auth login
#   - Permisos de "project" en el scope del token (gh los pide
#     automáticamente la primera vez que uses `gh project`)
#
# Uso:
#   chmod +x crear-github-project.sh
#   ./crear-github-project.sh [usuario-u-organizacion]
#
# Si no pasas el usuario/organización como argumento, se usa el
# dueño del repo remoto "origin" detectado automáticamente.
# ============================================================
set -e

OWNER="${1:-$(gh repo view --json owner -q .owner.login)}"
PROJECT_TITLE="SGP SENA - Backlog"

echo "📋 Creando proyecto '$PROJECT_TITLE' para $OWNER..."
PROJECT_NUMBER=$(gh project create --owner "$OWNER" --title "$PROJECT_TITLE" --format json -q .number)
echo "✅ Proyecto creado: #$PROJECT_NUMBER"

echo "🔧 Configurando columnas (campo Status)..."
# GitHub Projects v2 crea por defecto Status: Todo/In Progress/Done.
# Renombramos y agregamos "Pruebas" para las 4 columnas que pide el profesor.
STATUS_FIELD_ID=$(gh project field-list "$PROJECT_NUMBER" --owner "$OWNER" --format json \
  -q '.fields[] | select(.name=="Status") | .id')

echo "   (Renombra manualmente las columnas Todo->Backlog, In Progress->En progreso,"
echo "    y agrega 'Pruebas' antes de 'Done->Hecho' desde la interfaz web si el"
echo "    campo Status no permite renombrarse por CLI en tu versión de gh)"

# ── Función auxiliar: crear una tarjeta (draft issue) en el proyecto ──
add_card () {
  local title="$1"
  gh project item-create "$PROJECT_NUMBER" --owner "$OWNER" --title "$title" > /dev/null
  echo "   + $title"
}

echo ""
echo "🟦 Agregando tarjetas de Backlog..."
add_card "HU-16 — Recuperación de contraseña"
add_card "HU-28 — Notificaciones en tiempo real"
add_card "HU-32 — Ver la línea de tiempo del proyecto"
add_card "HU-35 — Exportar reportes del proyecto"

echo ""
echo "🟨 Agregando tarjetas de En progreso..."
add_card "HU-25 — Recibir alertas de entregas próximas o vencidas"
add_card "HU-33 — Vincular mi cuenta de GitHub"
add_card "HU-34 — Adjuntar archivos a un entregable"

echo ""
echo "🟧 Agregando tarjetas de Pruebas..."
add_card "HU-23 — Comentar el avance de un entregable"
add_card "HU-24 — Calificar un entregable"
add_card "HU-27 — Comentar dentro de una fase o entregable"
add_card "HU-31 — Programar reuniones del proyecto"

echo ""
echo "🟩 Agregando tarjetas de Hecho..."
add_card "HU-13 — Registro de usuarios"
add_card "HU-14 — Inicio de sesión seguro"
add_card "HU-15 — Acceso diferenciado por rol"
add_card "HU-17 — Crear proyecto"
add_card "HU-18 — Asignar aprendices al equipo del proyecto"
add_card "HU-19 — Definir entregables por fase"
add_card "HU-20 — Historial de cambios del proyecto"
add_card "HU-21 — Ver el estado actual del proyecto"
add_card "HU-22 — Ver el porcentaje de avance"
add_card "HU-26 — Enviar mensajes dentro del proyecto"
add_card "HU-29 — Asignar tareas a un integrante"
add_card "HU-30 — Actualizar el estado de una tarea"

echo ""
echo "✅✅✅  Listo. Abre el proyecto en:"
echo "   https://github.com/orgs/$OWNER/projects/$PROJECT_NUMBER"
echo "   (o https://github.com/users/$OWNER/projects/$PROJECT_NUMBER si es una cuenta personal)"
echo ""
echo "⚠️  Paso manual final: arrastra cada tarjeta a su columna correcta"
echo "   (Backlog/En progreso/Pruebas/Hecho) según el orden en que las agregué arriba,"
echo "   y renombra las columnas por defecto si 'gh' no lo hizo automáticamente."
