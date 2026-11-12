-- Migración para bases YA creadas (sin borrar datos). Ejecutar una sola vez:
--   docker compose exec -T db sh -c 'mysql -u root -p"$MYSQL_ROOT_PASSWORD" $MYSQL_DATABASE' < database/migracion_solicitudes_aprendiz.sql
-- Crea la tabla de solicitudes de creación de aprendices (punto 10, issue #19).
CREATE TABLE IF NOT EXISTS solicitudes_aprendiz (
    id_solicitud_aprendiz INT AUTO_INCREMENT PRIMARY KEY,
    id_instructor INT NOT NULL,
    id_proyecto INT NULL,                              -- equipo al que entra al aprobarse
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    correo VARCHAR(150) NOT NULL,
    identificacion VARCHAR(30) NOT NULL,
    ficha VARCHAR(50) NOT NULL,
    programa_formacion VARCHAR(150) NOT NULL,
    contrasena_hash VARCHAR(255) NOT NULL,             -- contraseña temporal ya cifrada (bcrypt)
    estado VARCHAR(20) NOT NULL DEFAULT 'Pendiente',   -- Pendiente | Aprobada | Rechazada
    respuesta_admin TEXT,
    id_admin_resuelve INT NULL,
    id_usuario_creado INT NULL,
    fecha_solicitud DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_resolucion DATETIME NULL,
    INDEX idx_sa_estado (estado),
    FOREIGN KEY (id_instructor) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (id_proyecto) REFERENCES proyectos(id_proyecto) ON DELETE SET NULL,
    FOREIGN KEY (id_admin_resuelve) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    FOREIGN KEY (id_usuario_creado) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
);
