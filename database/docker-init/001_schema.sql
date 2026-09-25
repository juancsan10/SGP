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
    calificacion DECIMAL(5,2) NULL,        -- 0 a 100, la asigna el instructor al revisar
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
    fecha_edicion DATETIME NULL,
    id_remitente INT NULL,                 -- NULL = el autor fue eliminado
    id_proyecto INT NOT NULL,
    FOREIGN KEY (id_remitente) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
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
    prioridad VARCHAR(20) DEFAULT 'Media',
    leida BOOLEAN DEFAULT FALSE,
    fecha_envio DATETIME DEFAULT CURRENT_TIMESTAMP,
    id_usuario INT NOT NULL,
    id_creador INT NULL,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
    FOREIGN KEY (id_creador) REFERENCES usuarios(id_usuario)
);

-- ============================================
-- TABLA REPOSITORIOS
-- ============================================
CREATE TABLE repositorios (
    id_repositorio INT AUTO_INCREMENT PRIMARY KEY,
    url_github VARCHAR(255) NOT NULL,
    rama_principal VARCHAR(100),
    activo BOOLEAN DEFAULT TRUE,
    estado_semaforo VARCHAR(20) DEFAULT 'verde',
    ultima_actualizacion DATETIME,
    id_proyecto INT NOT NULL,
    FOREIGN KEY (id_proyecto) REFERENCES proyectos(id_proyecto)
);

-- ============================================
-- TABLA SOLICITUDES_EQUIPO
-- Un instructor no elimina directamente a un aprendiz del equipo;
-- crea una solicitud que un Administrador debe aprobar o rechazar.
-- ============================================
CREATE TABLE solicitudes_equipo (
    id_solicitud INT AUTO_INCREMENT PRIMARY KEY,
    id_equipo INT NULL,
    id_proyecto INT NOT NULL,
    id_usuario_afectado INT NOT NULL,
    motivo TEXT,
    estado VARCHAR(20) NOT NULL DEFAULT 'Pendiente',
    id_instructor_solicita INT NOT NULL,
    id_admin_resuelve INT NULL,
    observacion_admin TEXT,
    fecha_solicitud DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_resolucion DATETIME NULL,
    FOREIGN KEY (id_equipo) REFERENCES equipos_proyecto(id_equipo) ON DELETE SET NULL,
    FOREIGN KEY (id_proyecto) REFERENCES proyectos(id_proyecto),
    FOREIGN KEY (id_usuario_afectado) REFERENCES usuarios(id_usuario),
    FOREIGN KEY (id_instructor_solicita) REFERENCES usuarios(id_usuario),
    FOREIGN KEY (id_admin_resuelve) REFERENCES usuarios(id_usuario)
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
    -- Si el usuario que hizo el cambio se elimina, aquí queda su nombre y
    -- cc para que la trazabilidad no se pierda (id_usuario pasa a NULL).
    usuario_eliminado VARCHAR(250) NULL,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
);

-- ============================================
-- INSERTS (ORDEN CORRECTO)
-- ============================================

CREATE TABLE comentarios (
    id_comentario INT PRIMARY KEY AUTO_INCREMENT,
    contenido TEXT NOT NULL,
    fecha_comentario DATETIME DEFAULT CURRENT_TIMESTAMP,
    id_usuario INT NULL,                   -- NULL = el autor fue eliminado
    id_entregable INT NOT NULL,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
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
    id_usuario INT NULL,                   -- NULL = el evaluador fue eliminado
    FOREIGN KEY (id_entregable) REFERENCES entregables(id_entregable),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
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

-- ============================================
-- TABLA ELIMINACIONES_USUARIO
-- Cuestionario obligatorio que el Administrador diligencia antes de
-- eliminar a un usuario. Guarda una copia de los datos del usuario
-- (que ya no existirá) y el resumen de lo que se eliminó o reasignó.
-- ============================================
CREATE TABLE eliminaciones_usuario (
    id_eliminacion INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario_eliminado INT NOT NULL,     -- sin FK: el usuario ya no existe
    nombre_completo VARCHAR(210) NOT NULL,
    correo VARCHAR(150) NOT NULL,
    identificacion VARCHAR(30),
    rol VARCHAR(50) NOT NULL,
    motivo VARCHAR(100) NOT NULL,
    descripcion TEXT NOT NULL,
    resumen TEXT,                          -- JSON: conteos de lo eliminado/reasignado
    id_admin INT NULL,
    fecha_eliminacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_admin) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
);

CREATE TABLE eliminaciones_archivos (
    id_archivo INT AUTO_INCREMENT PRIMARY KEY,
    id_eliminacion INT NOT NULL,
    nombre_original VARCHAR(255) NOT NULL,
    ruta_archivo VARCHAR(500) NOT NULL,
    tipo_mime VARCHAR(100),
    tamano_bytes INT,
    fecha_subida DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_eliminacion) REFERENCES eliminaciones_usuario(id_eliminacion) ON DELETE CASCADE
);

-- ============================================
-- TABLA SOLICITUDES
-- Solicitudes que un Instructor o un Aprendiz dirige al Administrador
-- (actualizar datos, soporte, acceso, proyecto/equipo, otro). Se
-- gestionan desde el panel de control del Administrador.
-- ============================================
CREATE TABLE solicitudes (
    id_solicitud INT AUTO_INCREMENT PRIMARY KEY,
    id_solicitante INT NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    asunto VARCHAR(150) NOT NULL,
    descripcion TEXT NOT NULL,
    id_proyecto INT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'Pendiente',   -- Pendiente | Atendida | Rechazada
    respuesta_admin TEXT,
    id_admin_resuelve INT NULL,
    fecha_solicitud DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_resolucion DATETIME NULL,
    FOREIGN KEY (id_solicitante) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (id_proyecto) REFERENCES proyectos(id_proyecto) ON DELETE SET NULL,
    FOREIGN KEY (id_admin_resuelve) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
);
