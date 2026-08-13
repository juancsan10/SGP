-- ROLES
INSERT INTO roles (nombre_rol, descripcion) VALUES
('Administrador','Control total'),
('Instructor','Encargado'),
('Aprendiz','Estudiante');

-- USUARIOS (IDs 1–10 garantizados)
INSERT INTO usuarios (nombres, apellidos, correo, contrasena, ficha, programa_formacion, id_rol) VALUES
('Juan','Perez','juan@mail.com','123','001','ADSO',1),
('Maria','Gomez','maria@mail.com','123','002','ADSO',2),
('Carlos','Lopez','carlos@mail.com','123','003','ADSO',3),
('Ana','Martinez','ana@mail.com','123','004','ADSO',3),
('Luis','Rodriguez','luis@mail.com','123','005','ADSO',2),
('Sofia','Hernandez','sofia@mail.com','123','006','ADSO',3),
('Pedro','Ramirez','pedro@mail.com','123','007','ADSO',3),
('Laura','Torres','laura@mail.com','123','008','ADSO',2),
('Diego','Flores','diego@mail.com','123','009','ADSO',3),
('Valentina','Castro','vale@mail.com','123','010','ADSO',3);

-- PROYECTOS
INSERT INTO proyectos (nombre, descripcion, fecha_inicio, estado, id_instructor) VALUES
('Sistema Web','Proyecto web','2025-01-01','Activo',2),
('App Movil','App','2025-02-01','Activo',2),
('IA','IA','2025-03-01','Planeado',5);

-- FASES
INSERT INTO fases_proyecto (nombre_fase, id_proyecto) VALUES
('Analisis',1),
('Diseño',1),
('Desarrollo',2);

-- ENTREGABLES
INSERT INTO entregables (nombre, fecha_entrega, id_fase) VALUES
('Doc','2025-01-10',1),
('Mockup','2025-01-20',2),
('API','2025-03-01',3);

-- TAREAS
INSERT INTO tareas (titulo, id_proyecto, id_asignado) VALUES
('Login',1,3),
('Registro',1,4),
('API',2,6);

-- MENSAJES
INSERT INTO mensajes (contenido, id_remitente, id_proyecto) VALUES
('Hola',3,1),
('Avance',4,1);

-- NOTIFICACIONES
INSERT INTO notificaciones (titulo, id_usuario) VALUES
('Alerta',3),
('Aviso',4);

-- REPOSITORIOS
INSERT INTO repositorios (url_github, id_proyecto) VALUES
('https://github.com/proy1',1),
('https://github.com/proy2',2);

-- EQUIPOS
INSERT INTO equipos_proyecto (id_proyecto, id_usuario) VALUES
(1,3),
(1,4),
(2,6);

-- HISTORIAL (AHORA SÍ FUNCIONA)
INSERT INTO historial_cambios (tabla_afectada, id_registro, accion, id_usuario) VALUES
('usuarios',1,'INSERT',1),
('proyectos',1,'UPDATE',2),
('tareas',1,'INSERT',3);


-- SELECT * FROM usuarios WHERE nombres LIKE 'J%';

-- SELECT * FROM usuarios WHERE correo LIKE '%mail.com';

SELECT * FROM proyectos
WHERE fecha_inicio BETWEEN '2026-02-02' AND '2025-04-14';

SELECT * FROM tareas
WHERE porcentaje_avance BETWEEN 50 AND 100;

SELECT * FROM usuarios
WHERE id_rol IN (1,2);

SELECT * FROM proyectos
WHERE estado IN ('Activo','Planeado');

SELECT * FROM proyectos -- Auditoria
WHERE fecha_fin IS NULL;

SELECT * FROM entregables -- Auditoria 
WHERE fecha_entregado IS NOT NULL;

SELECT * FROM usuarios
WHERE nombres LIKE 'A%' AND programa_formacion = 'ADSO';

SELECT * FROM tareas
WHERE id_proyecto IN (1,2)
