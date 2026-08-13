-- ============================================
-- CREAR BASE DE DATOS
-- ============================================
DROP DATABASE IF EXISTS SistemaGestionProyectosSENA;
CREATE DATABASE SistemaGestionProyectosSENA;
USE SistemaGestionProyectosSENA;

-- ============================================
-- TABLA ROLES
-- ============================================
CREATE TABLE roles (
    id_rol INT AUTO_INCREMENT PRIMARY KEY,
    nombre_rol VARCHAR(50) NOT NULL,
    descripcion VARCHAR(255)
);

-- ============================================
-- TABLA USUARIOS
-- ============================================
CREATE TABLE usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    correo VARCHAR(150) NOT NULL UNIQUE,
    contrasena VARCHAR(255) NOT NULL,
    ficha VARCHAR(50),
    programa_formacion VARCHAR(150),
    id_rol INT NOT NULL,
    estado BOOLEAN DEFAULT TRUE,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_rol) REFERENCES roles(id_rol)
);

-- ============================================
-- TABLA PROYECTOS
-- ============================================
CREATE TABLE proyectos (
    id_proyecto INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,
    porcentaje_avance DECIMAL(5,2) DEFAULT 0.00,
    estado VARCHAR(50),
    id_instructor INT NOT NULL,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_instructor) REFERENCES usuarios(id_usuario)
);

-- ============================================
-- TABLA EQUIPOS_PROYECTO
-- ============================================
CREATE TABLE equipos_proyecto (
    id_equipo INT AUTO_INCREMENT PRIMARY KEY,
    id_proyecto INT NOT NULL,
    id_usuario INT NOT NULL,
    rol_en_equipo VARCHAR(100),
    FOREIGN KEY (id_proyecto) REFERENCES proyectos(id_proyecto),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
);

-- ============================================
-- TABLA FASES_PROYECTO
-- ============================================
CREATE TABLE fases_proyecto (
    id_fase INT AUTO_INCREMENT PRIMARY KEY,
    nombre_fase VARCHAR(100) NOT NULL,
    descripcion TEXT,
    fecha_inicio DATE,
    fecha_fin DATE,
    porcentaje_avance DECIMAL(5,2) DEFAULT 0.00,
    id_proyecto INT NOT NULL,
    FOREIGN KEY (id_proyecto) REFERENCES proyectos(id_proyecto)
);

-- ============================================
-- TABLA ENTREGABLES
-- ============================================
CREATE TABLE entregables (
    id_entregable INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    fecha_entrega DATE NOT NULL,
    fecha_entregado DATE,
    estado VARCHAR(50),
    url_drive VARCHAR(255),
    version VARCHAR(50),
    id_fase INT NOT NULL,
    FOREIGN KEY (id_fase) REFERENCES fases_proyecto(id_fase)
);

-- ============================================
-- TABLA TAREAS
-- ============================================
CREATE TABLE tareas (
    id_tarea INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    descripcion TEXT,
    fecha_inicio DATE,
    fecha_vencimiento DATE,
    estado VARCHAR(50),
    prioridad VARCHAR(50),
    porcentaje_avance DECIMAL(5,2) DEFAULT 0.00,
    id_proyecto INT NOT NULL,
    id_asignado INT NOT NULL,
    FOREIGN KEY (id_proyecto) REFERENCES proyectos(id_proyecto),
    FOREIGN KEY (id_asignado) REFERENCES usuarios(id_usuario)
);

-- ============================================
-- TABLA MENSAJES
-- ============================================
CREATE TABLE mensajes (
    id_mensaje INT AUTO_INCREMENT PRIMARY KEY,
    contenido TEXT NOT NULL,
    fecha_envio DATETIME DEFAULT CURRENT_TIMESTAMP,
    id_remitente INT NOT NULL,
    id_proyecto INT NOT NULL,
    FOREIGN KEY (id_remitente) REFERENCES usuarios(id_usuario),
    FOREIGN KEY (id_proyecto) REFERENCES proyectos(id_proyecto)
);

-- ============================================
-- TABLA NOTIFICACIONES
-- ============================================
CREATE TABLE notificaciones (
    id_notificacion INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(150),
    mensaje TEXT,
    tipo VARCHAR(50),
    leida BOOLEAN DEFAULT FALSE,
    fecha_envio DATETIME DEFAULT CURRENT_TIMESTAMP,
    id_usuario INT NOT NULL,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
);

-- ============================================
-- TABLA REPOSITORIOS
-- ============================================
CREATE TABLE repositorios (
    id_repositorio INT AUTO_INCREMENT PRIMARY KEY,
    url_github VARCHAR(255) NOT NULL,
    rama_principal VARCHAR(100),
    ultima_actualizacion DATETIME,
    id_proyecto INT NOT NULL,
    FOREIGN KEY (id_proyecto) REFERENCES proyectos(id_proyecto)
);

-- ============================================
-- TABLA HISTORIAL_CAMBIOS
-- ============================================
CREATE TABLE historial_cambios (
    id_historial INT AUTO_INCREMENT PRIMARY KEY,
    tabla_afectada VARCHAR(100),
    id_registro INT,
    accion VARCHAR(50),
    fecha_cambio DATETIME DEFAULT CURRENT_TIMESTAMP,
    id_usuario INT,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
);

-- ============================================
-- INSERTS (ORDEN CORRECTO)
-- ============================================

CREATE TABLE comentarios (
    id_comentario INT PRIMARY KEY AUTO_INCREMENT,
    contenido TEXT NOT NULL,
    fecha_comentario DATETIME DEFAULT CURRENT_TIMESTAMP,
    id_usuario INT NOT NULL,
    id_entregable INT NOT NULL,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
    FOREIGN KEY (id_entregable) REFERENCES entregables(id_entregable)
);

CREATE TABLE archivos (
    id_archivo INT PRIMARY KEY AUTO_INCREMENT,
    nombre_archivo VARCHAR(255) NOT NULL,
    ruta_archivo VARCHAR(255) NOT NULL,
    fecha_subida DATETIME DEFAULT CURRENT_TIMESTAMP,
    id_entregable INT NOT NULL,
    FOREIGN KEY (id_entregable) REFERENCES entregables(id_entregable)
);
CREATE TABLE evaluaciones (
    id_evaluacion INT PRIMARY KEY AUTO_INCREMENT,
    calificacion DECIMAL(5,2) NOT NULL,
    comentarios TEXT,
    fecha_evaluacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    id_entregable INT NOT NULL,
    id_usuario INT NOT NULL,
    FOREIGN KEY (id_entregable) REFERENCES entregables(id_entregable),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
);
CREATE TABLE reuniones (
    id_reunion INT PRIMARY KEY AUTO_INCREMENT,
    titulo VARCHAR(150) NOT NULL,
    descripcion TEXT,
    fecha_reunion DATETIME NOT NULL,
    lugar VARCHAR(255),
    id_proyecto INT NOT NULL,
    FOREIGN KEY (id_proyecto) REFERENCES proyectos(id_proyecto)
);

CREATE TABLE GITHUB_INTEGRATION (
    id_integration INT PRIMARY KEY AUTO_INCREMENT,
    github_username VARCHAR(100) NOT NULL,
    github_token VARCHAR(255) NOT NULL,
    fecha_integracion DATETIME DEFAULT CURRENT_TIMESTAMP,
    id_usuario INT NOT NULL,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
);

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
AND fecha_vencimiento BETWEEN '2025-01-01' AND '2025-06-01';