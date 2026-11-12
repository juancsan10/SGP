-- Migración para bases YA creadas (sin borrar datos). Ejecutar UNA sola vez:
--   docker compose exec -T db sh -c 'mysql -u root -p"$MYSQL_ROOT_PASSWORD" $MYSQL_DATABASE' < database/migracion_mensajes_enriquecidos.sql
-- Mensajes enriquecidos: respuestas, firma, avisos fijados y encuestas (punto 6, issue #19).
ALTER TABLE usuarios ADD COLUMN firma VARCHAR(150) NULL AFTER programa_formacion;
ALTER TABLE mensajes
  ADD COLUMN tipo VARCHAR(20) NOT NULL DEFAULT 'texto',
  ADD COLUMN id_respuesta_a INT NULL,
  ADD COLUMN firma VARCHAR(150) NULL,
  ADD COLUMN fijado BOOLEAN NOT NULL DEFAULT FALSE,
  ADD CONSTRAINT fk_mensajes_respuesta FOREIGN KEY (id_respuesta_a) REFERENCES mensajes(id_mensaje) ON DELETE SET NULL;
CREATE TABLE IF NOT EXISTS encuesta_opciones (
    id_opcion INT AUTO_INCREMENT PRIMARY KEY,
    id_mensaje INT NOT NULL,
    texto VARCHAR(150) NOT NULL,
    orden TINYINT UNSIGNED NOT NULL,
    FOREIGN KEY (id_mensaje) REFERENCES mensajes(id_mensaje) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS encuesta_votos (
    id_voto INT AUTO_INCREMENT PRIMARY KEY,
    id_mensaje INT NOT NULL,
    id_opcion INT NOT NULL,
    id_usuario INT NOT NULL,
    fecha_voto DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_voto_usuario (id_mensaje, id_usuario),   -- un voto por persona (puede cambiarlo)
    FOREIGN KEY (id_mensaje) REFERENCES mensajes(id_mensaje) ON DELETE CASCADE,
    FOREIGN KEY (id_opcion) REFERENCES encuesta_opciones(id_opcion) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);
