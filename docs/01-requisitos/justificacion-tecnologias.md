# Justificación Tecnológica y Arquitectura
## Sistema de Gestión de Proyectos SENA (SGP-SENA)

### 1. Introducción
El Sistema de Gestión de Proyectos SENA (SGP-SENA) tiene como objetivo centralizar la administración de proyectos formativos, aprendices, instructores, fichas y evaluaciones en una única plataforma web.

La solución fue diseñada bajo criterios de simplicidad, escalabilidad, facilidad de mantenimiento y buenas prácticas de desarrollo de software.

---

# 2. Tecnologías Utilizadas

## Frontend

### React.js
**¿Qué es?**
Biblioteca JavaScript para construir interfaces de usuario dinámicas.

**¿Por qué se utiliza?**
- Permite reutilizar componentes.
- Facilita el mantenimiento.
- Mejora la organización del proyecto.
- Optimiza la experiencia del usuario.

### Vite
**¿Qué es?**
Herramienta moderna para desarrollo Frontend.

**¿Por qué se utiliza?**
- Inicio rápido del proyecto.
- Recarga instantánea.
- Compilación optimizada.

### CSS3
**¿Por qué se utiliza?**
- Personalización visual.
- Diseño responsive.
- Adaptación a dispositivos móviles.

---

## Backend

### Node.js
**¿Qué es?**
Entorno de ejecución para JavaScript.

**¿Por qué se utiliza?**
- Alto rendimiento.
- Misma tecnología en frontend y backend.
- Amplio ecosistema.

### Express.js
**¿Qué es?**
Framework para Node.js.

**¿Por qué se utiliza?**
- Creación rápida de APIs.
- Organización de rutas.
- Fácil mantenimiento.

---

## Base de Datos

### MySQL
**¿Qué es?**
Sistema gestor de bases de datos relacional.

**¿Por qué se utiliza?**
- Estabilidad.
- Seguridad.
- Integridad referencial.
- Amplia adopción empresarial.

---

## Control de Versiones

### Git
Permite controlar cambios y trabajar en equipo.

### GitHub
Permite almacenar el código y gestionar versiones de manera colaborativa.

---

# 3. Arquitectura del Sistema

Se utiliza una arquitectura de tres capas.

## Capa de Presentación
Frontend desarrollado en React.

Responsabilidades:
- Mostrar información.
- Capturar datos.
- Gestionar navegación.

## Capa de Negocio
Backend desarrollado con Node.js y Express.

Responsabilidades:
- Validaciones.
- Reglas de negocio.
- Seguridad.
- Procesamiento de información.

## Capa de Datos
Base de datos MySQL.

Responsabilidades:
- Almacenamiento.
- Consultas.
- Integridad de la información.

---

# 4. Flujo General

Usuario → React → API Express → MySQL

1. El usuario realiza una acción.
2. React envía una solicitud.
3. Express procesa la petición.
4. MySQL almacena o consulta datos.
5. La respuesta retorna al usuario.

---

# 5. Ventajas de la Solución

- Arquitectura clara.
- Fácil mantenimiento.
- Escalable.
- Separación de responsabilidades.
- Compatible con estándares empresariales.
- Adecuada para proyectos académicos y reales.

---

# 6. Estado Actual del Proyecto

## Completado
- Análisis de requerimientos.
- Diseño de arquitectura.
- Modelo entidad-relación.
- Diseño de interfaces.
- Estructura inicial Frontend.
- Planeación Backend.

## En desarrollo
- Construcción de componentes React.
- Integración con API.
- Implementación de autenticación.

## Pendiente
- CRUD completo.
- Reportes.
- Notificaciones.
- Despliegue.
- Pruebas finales.

---

# 7. Conclusión

La combinación React + Node.js + Express + MySQL proporciona una solución moderna, escalable y fácil de mantener para el Sistema de Gestión de Proyectos SENA, permitiendo una evolución gradual del proyecto y una experiencia de usuario eficiente.
