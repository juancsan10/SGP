# DOCUMENTACIÓN TÉCNICA

## Base de Datos -- Sistema de Gestión de Proyectos SENA

------------------------------------------------------------------------

## 1. Introducción

El presente documento describe la estructura de la base de datos del
proyecto **Sistema de Gestión de Proyectos SENA**, cuyo objetivo es
administrar proyectos formativos, tareas, entregables y adicionalmente
integrar un módulo de perfil profesional y vinculación empresarial.

La base de datos fue diseñada bajo el modelo relacional, garantizando:

-   Integridad referencial\
-   Normalización de datos\
-   Escalabilidad\
-   Seguridad y trazabilidad

------------------------------------------------------------------------

## 2. Objetivo de la Base de Datos

Permitir la gestión estructurada de:

-   Usuarios del sistema (aprendices, instructores, coordinadores)\
-   Proyectos formativos\
-   Fases y entregables\
-   Tareas y asignaciones\
-   Comunicación interna\
-   Trazabilidad de cambios\
-   Perfil profesional del aprendiz\
-   Consulta empresarial autorizada

------------------------------------------------------------------------

## 3. Estructura General del Sistema

El sistema se divide en dos módulos principales:

### 🔹 Módulo Académico

Gestión interna de proyectos formativos.

### 🔹 Módulo Profesional

Proyección del aprendiz hacia empresas externas mediante perfiles
visibles.

------------------------------------------------------------------------

# 4. Descripción de Tablas

## 4.1 roles

Define los tipos de usuario dentro del sistema.

Campos: - id_rol (PK) - nombre_rol - descripcion

Relación: Un rol puede estar asociado a múltiples usuarios.

------------------------------------------------------------------------

## 4.2 usuarios

Almacena la información de los usuarios.

Campos principales: - id_usuario (PK) - nombres - apellidos - correo
(UNIQUE) - contrasena - ficha - programa_formacion - id_rol (FK) -
estado - fecha_registro

------------------------------------------------------------------------

## 4.3 empresas

Representa las organizaciones externas.

Campos: - id_empresa (PK) - nombre - nit (UNIQUE) - sector -
correo_contacto - telefono - estado - fecha_registro

------------------------------------------------------------------------

## 4.4 perfiles_profesionales

Contiene la información profesional visible del aprendiz.

Campos: - id_perfil (PK) - id_usuario (FK, UNIQUE) - descripcion -
habilidades - proyectos_destacados - visible - consentimiento_datos -
fecha_actualizacion

Regla: El perfil solo será visible si el usuario activa la opción y
acepta el consentimiento.

------------------------------------------------------------------------

## 4.5 proyectos

Gestiona los proyectos formativos.

Campos: - id_proyecto (PK) - nombre - descripcion - fecha_inicio -
fecha_fin - porcentaje_avance - estado - visible_empresa - id_instructor
(FK) - fecha_creacion

------------------------------------------------------------------------

## 4.6 equipos_proyecto

Relaciona usuarios con proyectos (muchos a muchos).

Campos: - id_equipo (PK) - id_proyecto (FK) - id_usuario (FK) -
rol_en_equipo

Restricción UNIQUE (id_proyecto, id_usuario)

------------------------------------------------------------------------

## 4.7 fases_proyecto

Divide el proyecto en etapas.

Campos: - id_fase (PK) - nombre_fase - descripcion - fecha_inicio -
fecha_fin - porcentaje_avance - id_proyecto (FK)

------------------------------------------------------------------------

## 4.8 entregables

Registra los productos entregados.

Campos: - id_entregable (PK) - nombre - descripcion - fecha_entrega -
fecha_entregado - estado - url_drive - version - id_fase (FK)

------------------------------------------------------------------------

## 4.9 tareas

Gestiona actividades asignadas.

Campos: - id_tarea (PK) - titulo - descripcion - fecha_inicio -
fecha_vencimiento - estado - prioridad - porcentaje_avance - id_proyecto
(FK) - id_asignado (FK)

------------------------------------------------------------------------

## 4.10 mensajes

Permite comunicación interna.

Campos: - id_mensaje (PK) - contenido - fecha_envio - id_remitente
(FK) - id_proyecto (FK)

------------------------------------------------------------------------

## 4.11 notificaciones

Envía alertas a usuarios.

Campos: - id_notificacion (PK) - titulo - mensaje - tipo - leida -
fecha_envio - id_usuario (FK)

------------------------------------------------------------------------

## 4.12 repositorios

Registra repositorios externos.

Campos: - id_repositorio (PK) - url_github - rama_principal -
ultima_actualizacion - id_proyecto (FK)

------------------------------------------------------------------------

## 4.13 historial_cambios

Permite auditoría del sistema.

Campos: - id_historial (PK) - tabla_afectada - id_registro - accion -
fecha_cambio - id_usuario (FK)

------------------------------------------------------------------------

## 4.14 vistas_perfil

Registra qué empresa visualizó qué perfil.

Campos: - id_vista (PK) - id_empresa (FK) - id_perfil (FK) - fecha_vista

------------------------------------------------------------------------

# 5. Integridad Referencial

La base de datos implementa:

-   Claves primarias (PK)
-   Claves foráneas (FK)
-   Restricciones UNIQUE
-   Valores por defecto
-   Control de estados booleanos

------------------------------------------------------------------------

# 6. Seguridad

-   Separación de roles
-   Consentimiento de datos
-   Control de visibilidad
-   Registro de auditoría
-   Trazabilidad de accesos

------------------------------------------------------------------------

# 7. Normalización

El modelo se encuentra normalizado hasta Tercera Forma Normal (3FN):

-   Sin dependencias parciales
-   Sin redundancias innecesarias
-   Entidades correctamente separadas

------------------------------------------------------------------------

# 8. Conclusión

La base de datos permite gestionar proyectos formativos de manera
estructurada e integra un módulo innovador de perfil profesional que
fortalece la empleabilidad del aprendiz.

El diseño es escalable, seguro y adecuado para implementación
institucional.
