 Restricciones del Sistema de Gestión de Proyectos SENA

## Contexto General

Durante el proceso de levantamiento y análisis de requisitos se identificaron una serie de **restricciones** que condicionan el diseño, desarrollo, implementación y mantenimiento del Sistema de Gestión de Proyectos SENA.  
Estas restricciones surgen de las **limitaciones institucionales, tecnológicas, normativas y operativas** propias del entorno académico del SENA, y deben ser consideradas obligatoriamente en todas las fases del proyecto.

Las restricciones aquí descritas definen los **límites de alcance y actuación** del sistema, así como los parámetros bajo los cuales el equipo de desarrollo podrá tomar decisiones técnicas y de gestión.

---

## 1. Restricciones Técnicas

Estas restricciones delimitan los aspectos relacionados con la infraestructura, las herramientas tecnológicas y las condiciones del entorno operativo.

| Código | Restricción | Descripción | Justificación |
|--------|--------------|-------------|----------------|
| RT1 | Infraestructura institucional | El sistema deberá implementarse dentro de los servidores o entornos virtuales aprobados por el área de TI del SENA. | Garantiza la seguridad de la información y la compatibilidad con la infraestructura existente. |
| RT2 | Tecnologías aprobadas | Solo se podrán utilizar lenguajes, frameworks y bases de datos previamente aprobados por el SENA (Node.js 18+, PHP 8+, PostgreSQL o MySQL). | Mantiene la estandarización técnica y facilita el soporte interno. |
| RT3 | Compatibilidad de navegadores | El sistema deberá funcionar correctamente en Google Chrome y Microsoft Edge, versiones institucionales. | Alinea el desarrollo con las herramientas disponibles en los equipos del SENA. |
| RT4 | Integración controlada | Las integraciones externas (GitHub, Google Drive, etc.) estarán sujetas a las políticas de ciberseguridad institucional. | Previene vulnerabilidades y fugas de información. |
| RT5 | Requerimiento de conexión | El sistema requiere conexión a Internet; su funcionamiento fuera de línea será parcial. | La sincronización de datos depende de servicios en línea. |
| RT6 | Arquitectura en capas | El sistema deberá implementarse bajo arquitectura en capas (Presentación, Lógica de Negocio y Persistencia). | Facilita el mantenimiento, escalabilidad y organización del sistema. |

---

## 2. Restricciones Operativas

Abarcan los límites funcionales y de uso dentro del contexto académico.

| Código | Restricción | Descripción | Justificación |
|--------|--------------|-------------|----------------|
| RO1 | Uso institucional exclusivo | El sistema estará limitado a instructores y aprendices activos dentro del SENA. | Evita accesos no autorizados. |
| RO2 | Capacidad inicial limitada | En la versión MVP, el sistema manejará un número limitado de proyectos simultáneos. | Permite validar estabilidad del sistema. |
| RO3 | Roles predefinidos | Inicialmente solo se contemplarán dos roles: Instructor y Aprendiz. | Simplifica la gestión de permisos. |
| RO4 | Implementación progresiva | El despliegue será por fases en centros de formación. | Reduce riesgos en producción. |
| RO5 | Soporte técnico interno | El mantenimiento estará a cargo del personal TI del SENA. | Garantiza control institucional. |

---

## 3. Restricciones de Seguridad y Cumplimiento Normativo

Lineamientos para protección de la información.

| Código | Restricción | Descripción | Justificación |
|--------|--------------|-------------|----------------|
| RS1 | Cumplimiento legal | El sistema debe cumplir la Ley 1581 de 2012 (protección de datos). | Protege la privacidad de usuarios. |
| RS2 | Control de acceso | El acceso requerirá autenticación obligatoria. | Evita accesos no autorizados. |
| RS3 | Almacenamiento institucional | La información debe alojarse en servidores del SENA. | Garantiza control de datos. |
| RS4 | Auditoría de uso | Se debe permitir el registro de acciones críticas del sistema. | Facilita control y trazabilidad. |
| RS5 | Propiedad intelectual | Los proyectos serán propiedad del SENA salvo acuerdo contrario. | Protege resultados institucionales. |

---

## 4. Restricciones de Alcance, Tiempo y Entregas

Limitaciones del desarrollo del sistema.

| Código | Restricción | Descripción | Justificación |
|--------|--------------|-------------|----------------|
| RA1 | Plazo de desarrollo | El MVP debe completarse dentro del periodo académico. | Cumple cronogramas institucionales. |
| RA2 | Alcance funcional controlado | No se incluirá analítica avanzada en el MVP. | Prioriza funcionalidades esenciales. |
| RA3 | Fase piloto controlada | Pruebas con grupo reducido de usuarios. | Minimiza riesgos. |
| RA4 | Recursos humanos limitados | Desarrollo sin contratación externa. | Ajuste a recursos reales disponibles. |

---

## 5. Restricciones de Recursos y Presupuesto

Limitaciones económicas y tecnológicas.

| Código | Restricción | Descripción | Justificación |
|--------|--------------|-------------|----------------|
| RR1 | Presupuesto institucional | El proyecto debe ajustarse al presupuesto aprobado. | Evita desviaciones financieras. |
| RR2 | Uso de software libre | Se priorizarán herramientas open source. | Reduce costos de licencias. |
| RR3 | Recursos de almacenamiento | Existirá un límite de almacenamiento por usuario. | Optimiza recursos del servidor. |
| RR4 | Ausencia de soporte externo | No se contratarán proveedores externos en fase inicial. | Refuerza autosuficiencia técnica. |

---

## 6. Restricciones Administrativas y de Gestión

Regulan la toma de decisiones del proyecto.

| Código | Restricción | Descripción | Justificación |
|--------|--------------|-------------|----------------|
| RG1 | Aprobación de cambios | Cambios deben ser aprobados por el comité del proyecto. | Control de versiones. |
| RG2 | Documentación obligatoria | Cada fase debe contar con documentación técnica. | Facilita mantenimiento y auditoría. |
| RG3 | Alineación pedagógica | El sistema debe alinearse con lineamientos educativos del SENA. | Garantiza pertinencia académica. |
| RG4 | Capacitación de usuarios | Usuarios deben recibir formación previa. | Reduce errores operativos. |

---

## Consideraciones Finales

Las restricciones aquí descritas son **obligatorias** y cualquier modificación deberá ser aprobada por el comité del proyecto.

Estas condiciones aseguran la **viabilidad, seguridad y sostenibilidad** del sistema durante todo su ciclo de vida.

---

**Autor:** Equipo de Análisis de Requisitos – Centro de Formación SENA  
**Versión:** 1.2 (Integrada)  
**Fecha:** 2026  