-- Migración para bases YA creadas (sin borrar datos). Ejecutar UNA sola vez:
--   docker compose exec -T db sh -c 'mysql -u root -p"$MYSQL_ROOT_PASSWORD" $MYSQL_DATABASE' < database/migracion_roles_equipo.sql
-- Roles de equipo con etiquetas de color (punto 4, issue #19).
-- MySQL 8 no admite ADD COLUMN IF NOT EXISTS: si ya se ejecutó, el ALTER falla
-- con "Duplicate column name" y el resto no se ve afectado.
CREATE TABLE IF NOT EXISTS roles_equipo (
    id_rol_equipo INT AUTO_INCREMENT PRIMARY KEY,
    id_instructor INT NOT NULL,                  -- dueño del rol personalizado
    nombre VARCHAR(60) NOT NULL,
    color CHAR(7) NOT NULL,                      -- color sólido de la paleta (#rrggbb)
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_rol_equipo_instructor (id_instructor, nombre),
    FOREIGN KEY (id_instructor) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

ALTER TABLE equipos_proyecto ADD COLUMN color_rol CHAR(7) NULL AFTER rol_en_equipo;
