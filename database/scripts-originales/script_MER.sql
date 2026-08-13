/* ============================================
   CREACIÓN DE BASE DE DATOS
============================================ */
CREATE DATABASE SistemaGestionProyectosSENA;
USE SistemaGestionProyectosSENA;

/* ============================================
   TABLA ROLES
============================================ */
CREATE TABLE roles (
    id_rol INT AUTO_INCREMENT PRIMARY KEY,
    nombre_rol VARCHAR(50) NOT NULL,
    descripcion VARCHAR(255)
);

/* ============================================
   TABLA USUARIOS
============================================ */
CREATE TABLE usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    correo VARCHAR(150) NOT NULL UNIQUE,
    contrasena VARCHAR(255) NOT NULL,
    ficha VARCHAR(50),
    programa_formacion VARCHAR(150),
    estado BOOLEAN DEFAULT TRUE,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    id_rol INT NOT NULL,
    FOREIGN KEY (id_rol) REFERENCES roles(id_rol)
);

/* ============================================
   TABLA PROYECTOS
============================================ */
CREATE TABLE proyectos (
    id_proyecto INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,
    porcentaje_avance DECIMAL(5,2) DEFAULT 0.00,
    estado VARCHAR(50),
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    id_instructor INT NOT NULL,
    FOREIGN KEY (id_instructor) REFERENCES usuarios(id_usuario)
);

/* ============================================
   TABLA EQUIPOS_PROYECTO
============================================ */
CREATE TABLE equipos_proyecto (
    id_equipo INT AUTO_INCREMENT PRIMARY KEY,
    id_proyecto INT NOT NULL,
    id_usuario INT NOT NULL,
    rol_en_equipo VARCHAR(100),
    FOREIGN KEY (id_proyecto) REFERENCES proyectos(id_proyecto),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
    UNIQUE (id_proyecto, id_usuario)
);

/* ============================================
   TABLA FASES_PROYECTO
============================================ */
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

/* ============================================
   TABLA ENTREGABLES
============================================ */
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

/* ============================================
   TABLA TAREAS
============================================ */
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

/* ============================================
   TABLA MENSAJES
============================================ */
CREATE TABLE mensajes (
    id_mensaje INT AUTO_INCREMENT PRIMARY KEY,
    contenido TEXT NOT NULL,
    fecha_envio DATETIME DEFAULT CURRENT_TIMESTAMP,
    id_remitente INT NOT NULL,
    id_proyecto INT NOT NULL,
    FOREIGN KEY (id_remitente) REFERENCES usuarios(id_usuario),
    FOREIGN KEY (id_proyecto) REFERENCES proyectos(id_proyecto)
);

/* ============================================
   TABLA NOTIFICACIONES
============================================ */
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

/* ============================================
   TABLA REPOSITORIOS
============================================ */
CREATE TABLE repositorios (
    id_repositorio INT AUTO_INCREMENT PRIMARY KEY,
    url_github VARCHAR(255) NOT NULL,
    rama_principal VARCHAR(100),
    ultima_actualizacion DATETIME,
    id_proyecto INT NOT NULL UNIQUE,
    FOREIGN KEY (id_proyecto) REFERENCES proyectos(id_proyecto)
);

/* ============================================
   TABLA HISTORIAL DE CAMBIOS
============================================ */
CREATE TABLE historial_cambios (
    id_historial INT AUTO_INCREMENT PRIMARY KEY,
    tabla_afectada VARCHAR(100),
    id_registro INT,
    accion VARCHAR(50),
    fecha_cambio DATETIME DEFAULT CURRENT_TIMESTAMP,
    id_usuario INT,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
);