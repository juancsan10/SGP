# ⚙️ Requisitos del Sistema de Gestión de Proyectos SENA

## 📘 Contexto General

El presente documento complementa el análisis de entrevistas realizado para el desarrollo del **Sistema de Gestión de Proyectos SENA**, especificando los **Requisitos Funcionales (RF)** y **No Funcionales (RNF)** derivados del estudio de necesidades de instructores y aprendices.

El propósito de esta especificación es establecer una base clara y verificable para el diseño, desarrollo y validación del sistema en su primera versión (MVP).

---

## 🧩 Requisitos Funcionales (RF)

Los **Requisitos Funcionales** describen las capacidades que el sistema debe ofrecer para satisfacer las necesidades de los usuarios finales.  
A continuación, se presentan clasificados por módulo o área funcional.

---

### 🔹 RF1. Gestión de Usuarios
| Código | Requisito | Descripción |
|--------|------------|-------------|
| **RF1.1** | Registro de usuarios | El sistema debe permitir el registro de instructores y aprendices con roles diferenciados. |
| **RF1.2** | Autenticación segura | Los usuarios deben poder iniciar sesión mediante credenciales institucionales o cuenta SENA. |
| **RF1.3** | Gestión de roles | El sistema debe asignar permisos de acceso de acuerdo con el perfil (instructor/aprendiz). |
| **RF1.4** | Recuperación de contraseña | Debe ofrecer un mecanismo de recuperación o restablecimiento seguro de contraseñas. |

---

### 🔹 RF2. Gestión de Proyectos
| Código | Requisito | Descripción |
|--------|------------|-------------|
| **RF2.1** | Creación de proyectos | Los aprendices o instructores deben poder crear proyectos nuevos con nombre, descripción y objetivos. |
| **RF2.2** | Asignación de integrantes | El sistema debe permitir agregar o eliminar aprendices de un proyecto. |
| **RF2.3** | Definición de entregables | Debe ser posible registrar entregables por fases con sus respectivas fechas límite. |
| **RF2.4** | Control de versiones | El sistema debe guardar el historial de modificaciones de cada proyecto. |
| **RF2.5** | Estado del proyecto | El sistema debe mostrar el estado actual del proyecto (en curso, finalizado, pendiente de revisión). |

---

### 🔹 RF3. Seguimiento y Evaluación
| Código | Requisito | Descripción |
|--------|------------|-------------|
| **RF3.1** | Medición de progreso | Mostrar el porcentaje de avance del proyecto de forma gráfica y actualizada. |
| **RF3.2** | Trazabilidad | Permitir visualizar el historial de actividades y entregas por equipo. |
| **RF3.3** | Retroalimentación | Los instructores deben poder comentar y calificar avances o entregables. |
| **RF3.4** | Alertas y notificaciones | Generar alertas automáticas por entregas vencidas o próximas. |

---

### 🔹 RF4. Comunicación y Colaboración
| Código | Requisito | Descripción |
|--------|------------|-------------|
| **RF4.1** | Mensajería interna | El sistema debe incluir un chat o canal de comunicación directa tipo “WhatsApp”. |
| **RF4.2** | Comentarios en tareas | Permitir dejar comentarios dentro de cada entregable o fase. |
| **RF4.3** | Comunicación docente-aprendiz | Facilitar la interacción directa entre el instructor y los equipos de proyecto. |
| **RF4.4** | Notificaciones en tiempo real | Informar a los usuarios de nuevos mensajes, asignaciones o retroalimentaciones. |

---

### 🔹 RF5. Gestión de Tareas y Cronograma
| Código | Requisito | Descripción |
|--------|------------|-------------|
| **RF5.1** | Asignación de tareas | Permitir que el instructor o líder de equipo asigne tareas específicas a los integrantes. |
| **RF5.2** | Seguimiento de tareas | Mostrar el estado de las tareas: pendiente, en curso o completada. |
| **RF5.3** | Calendario de actividades | Incluir un calendario interactivo con hitos, entregas y eventos del proyecto. |
| **RF5.4** | Línea de tiempo | Visualizar cronológicamente el avance del proyecto y sus entregables. |

---

### 🔹 RF6. Integración y Almacenamiento
| Código | Requisito | Descripción |
|--------|------------|-------------|
| **RF6.1** | Integración con GitHub | Permitir enlazar repositorios para control de versiones y seguimiento del código. |
| **RF6.2** | Almacenamiento en la nube | Integración con servicios como Google Drive para subir entregables. |
| **RF6.3** | Exportación de reportes | Permitir exportar reportes en PDF o Excel con los avances del proyecto. |

---

## 🧠 Requisitos No Funcionales (RNF)

Los **Requisitos No Funcionales** establecen las condiciones de calidad, rendimiento, seguridad y usabilidad que el sistema debe cumplir.

---

### 🔹 RNF1. Usabilidad
| Código | Requisito | Descripción |
|--------|------------|-------------|
| **RNF1.1** | Interfaz intuitiva | La interfaz debe ser clara, moderna y accesible para usuarios con conocimientos básicos. |
| **RNF1.2** | Navegación fluida | Las funcionalidades principales deben ser accesibles con un máximo de tres clics. |
| **RNF1.3** | Accesibilidad | Cumplir con estándares de accesibilidad web (WCAG 2.1 AA). |

---

### 🔹 RNF2. Rendimiento
| Código | Requisito | Descripción |
|--------|------------|-------------|
| **RNF2.1** | Tiempo de respuesta | Las consultas y actualizaciones deben procesarse en menos de 3 segundos. |
| **RNF2.2** | Escalabilidad | El sistema debe soportar el crecimiento de usuarios y proyectos sin pérdida de rendimiento. |
| **RNF2.3** | Disponibilidad | Garantizar una disponibilidad mínima del 99% mensual en el entorno productivo. |

---

### 🔹 RNF3. Seguridad
| Código | Requisito | Descripción |
|--------|------------|-------------|
| **RNF3.1** | Autenticación segura | Implementar protocolos de seguridad (HTTPS, cifrado de contraseñas, tokens). |
| **RNF3.2** | Protección de datos | Cumplir con la Ley 1581 de 2012 sobre protección de datos personales. |
| **RNF3.3** | Control de accesos | Restringir las funcionalidades según los roles de usuario. |
| **RNF3.4** | Copias de seguridad | Realizar respaldos automáticos diarios de la base de datos. |

---

### 🔹 RNF4. Mantenibilidad
| Código | Requisito | Descripción |
|--------|------------|-------------|
| **RNF4.1** | Código modular | La arquitectura debe facilitar el mantenimiento y la incorporación de nuevas funciones. |
| **RNF4.2** | Documentación técnica | Debe existir documentación actualizada de API, base de datos y flujos de usuario. |
| **RNF4.3** | Pruebas automatizadas | El sistema debe contar con pruebas unitarias y de integración. |

---

### 🔹 RNF5. Compatibilidad
| Código | Requisito | Descripción |
|--------|------------|-------------|
| **RNF5.1** | Multiplataforma | Acceso desde navegadores modernos (Chrome, Firefox, Edge). |
| **RNF5.2** | Responsividad | Adaptar la interfaz a dispositivos móviles, tablets y escritorio. |
| **RNF5.3** | Integración con TICs externas | Compatibilidad con GitHub, Google Drive y herramientas ofimáticas. |

---

## 🧩 Resumen de Prioridades

| Tipo | Prioridad Alta | Prioridad Media | Prioridad Baja |
|------|----------------|----------------|----------------|
| **Funcionales (RF)** | Registro, gestión de proyectos, seguimiento, comunicación | Asignación de tareas, dashboard, reportes | Integraciones externas |
| **No Funcionales (RNF)** | Seguridad, rendimiento, usabilidad | Compatibilidad, accesibilidad | Escalabilidad futura |

---

> ✍️ **Autor:** Equipo de Análisis de Requisitos – Centro de Formación SENA  
> 📅 **Fecha:** 2025-11-12  
> 🧩 **Documento complementario al Análisis de Requisitos V001**