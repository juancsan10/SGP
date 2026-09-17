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

-- CORREGIDO (bug crítico): esta tabla se creaba pero nunca se sembraba con
-- datos. Todo el backend referencia los roles por ID fijo (id_rol=1
-- Administrador, 2 Instructor, 3 Aprendiz — ver auth.controller.js,
-- equipos.controller.js, etc.), así que sin este INSERT cualquier intento
-- de registro/login/creación de usuario fallaba con
-- ER_NO_REFERENCED_ROW_2 (violación de llave foránea) en toda instalación
-- nueva (docker-compose up desde cero).
INSERT INTO roles (id_rol, nombre_rol, descripcion) VALUES
(1, 'Administrador', 'Control total del sistema'),
(2, 'Instructor', 'Responsable de proyectos y evaluación'),
(3, 'Aprendiz', 'Estudiante asignado a proyectos');

-- ============================================
-- TABLA USUARIOS
-- ============================================
CREATE TABLE usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    correo VARCHAR(150) NOT NULL UNIQUE,
    identificacion VARCHAR(30) UNIQUE,
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
-- TABLA ENTREGAS DE TAREAS
-- ============================================
CREATE TABLE entregas_tareas (
    id_entrega INT AUTO_INCREMENT PRIMARY KEY,
    id_tarea INT NOT NULL UNIQUE,
    id_aprendiz INT NOT NULL,
    comentario_aprendiz TEXT,
    url_entrega VARCHAR(500),
    ruta_archivo VARCHAR(500),
    estado VARCHAR(50) NOT NULL DEFAULT 'Entregada',
    fecha_entrega DATETIME DEFAULT CURRENT_TIMESTAMP,
    observacion_instructor TEXT,
    fecha_revision DATETIME NULL,
    FOREIGN KEY (id_tarea) REFERENCES tareas(id_tarea),
    FOREIGN KEY (id_aprendiz) REFERENCES usuarios(id_usuario)
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

CREATE TABLE password_reset_tokens (
    id_token INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    token VARCHAR(128) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
);

CREATE TABLE github_integration (
    id_integration INT PRIMARY KEY AUTO_INCREMENT,
    github_username VARCHAR(100) NOT NULL,
    github_token VARCHAR(255) NOT NULL,
    fecha_integracion DATETIME DEFAULT CURRENT_TIMESTAMP,
    id_usuario INT NOT NULL,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
);

