-- Migración para bases YA creadas (sin borrar datos). Ejecutar una sola vez:
--   docker compose exec -T db sh -c 'mysql -u root -p"$MYSQL_ROOT_PASSWORD" $MYSQL_DATABASE' < database/migracion_recuperacion_contrasena.sql
DROP TABLE IF EXISTS password_reset_tokens;
CREATE TABLE password_reset_tokens (
    id_token INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    token_hash CHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    intentos TINYINT UNSIGNED NOT NULL DEFAULT 0,
    verificado_at DATETIME NULL,
    sesion_hash CHAR(64) NULL,
    sesion_expires_at DATETIME NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    ip VARCHAR(64) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_prt_usuario (id_usuario),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);
