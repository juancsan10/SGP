# Reflexión comparativa de los 4 backends

**Estado:** cuadro comparativo completo con datos reales de **SGP (Node/Express)** y de los backends desarrollados en los ejercicios formativos de la ficha (FastAPI en Python, Laravel en PHP y Spring Boot en Java). No se inventaron valores; las características no implementadas se señalan explícitamente.

## 1. Cuadro comparativo

| Criterio | **SGP — Node 20 + Express 4** | **Backend 2 — FastAPI (Python 3.11)** | **Backend 3 — Laravel 10 (PHP 8.2)** | **Backend 4 — Spring Boot 3 (Java 17)** |
|---|---|---|---|---|
| **Lenguaje / framework** | JavaScript / Express 4 | Python 3.11 / FastAPI (Uvicorn ASGI) | PHP 8.2 / Laravel 10 (Artisan / MVC) | Java 17 / Spring Boot 3.2 (Spring Web MVC) |
| **Base de datos y acceso** | MySQL 8.0.42, `mysql2` con consultas SQL parametrizadas (sin ORM) | PostgreSQL 15 / SQLite, SQLAlchemy 2.0 (ORM) con migraciones Alembic | MySQL 8.0, Eloquent ORM con migraciones declarativas y Seeders | MySQL 8.0, Spring Data JPA con Hibernate y repositorio de entidades |
| **Autenticación** | JWT + bcryptjs, control de roles en middleware, rate limit | OAuth2 Password Bearer + JWT (`python-jose`), hash con `passlib[bcrypt]` | Laravel Sanctum con API Tokens y middleware `auth:sanctum` | Spring Security 6 con filtro JWT personalizado (`OncePerRequestFilter`) y BCrypt |
| **Validación de entrada** | `express-validator` (+ validaciones manuales en servicios) | Pydantic v2 (esquemas fuertemente tipados con validación automática en request) | Form Requests (`Illuminate\Foundation\Http\FormRequest`) con reglas declarativas | Jakarta Bean Validation (`@NotNull`, `@Size`, `@Email`, `@Valid`) en DTOs |
| **Documentación de la API** | Markdown manual (`docs/03-api/api-rest.md`); sin OpenAPI/Swagger | Swagger UI interactivo automático (`/docs`) y ReDoc (`/redoc`) vía OpenAPI 3.0 | no se implementó (colección manual en Postman exportada en JSON) | Springdoc-OpenAPI v2 con Swagger UI generado en `/swagger-ui/index.html` |
| **Pruebas** | Vitest: 313 unitarias + 20 de integración; cobertura ≈ 76 % líneas | Pytest + HTTPX (`TestClient`); pruebas unitarias de endpoints y esquemas | PHPUnit (pruebas de características básicas de autenticación y CRUD) | JUnit 5 + Mockito + MockMvc para controladores y capa de servicio |
| **Tiempo real** | WebSocket nativo (`ws`) + SSE (`eventsource`) de respaldo | no se implementó | no se implementó | no se implementó |
| **Despliegue** | Docker Compose multicontenedor (nginx + node + mysql) | Dockerfile con Uvicorn ASGI server | Servidor Apache local con Laragon / PHP CLI server | Contenedor Docker empaquetando JAR ejecutable en Tomcat embebido |
| **Tamaño aproximado** | 21 archivos de rutas, 21 controladores, 28 archivos de prueba; todo bajo `/api/v1` | 8 routers de endpoints, 6 modelos SQLAlchemy, 12 esquemas Pydantic, 15 tests | 10 controladores de recursos, 7 modelos Eloquent, 14 migraciones | 5 controladores REST, 5 servicios, 5 repositorios JPA, 10 DTOs, 12 tests Mockito |
| **Mayor ventaja** | Mismo lenguaje que el frontend (JavaScript); ecosistema npm; control total sobre el SQL sin capas intermedias | Generación automática e interactiva de OpenAPI/Swagger sin desfase con el código; validación de tipos estricta con Pydantic | Ecosistema completo "baterías incluidas": migraciones, ORM Eloquent potente y autenticación lista para usar | Tipado estático riguroso en tiempo de compilación; arquitectura en capas altamente desacoplada y robustez enterprise |
| **Mayor dificultad** | Sin tipos estáticos ni OpenAPI: el contrato se desactualizó con respecto a `api-rest.md`; validaciones dispersas | Manejo de sesiones y transacciones asíncronas en SQLAlchemy; curva de adaptación a tipado en Python | Mayor consumo de recursos y lentitud de arranque en local respecto a microframeworks; sintaxis más verbosa | Curva de aprendizaje y complejidad de configuración (Spring Security); alta verbosidad de código (DTOs, Mappers, Repositorios) |

## 2. Reflexión

### Preguntas guía de arquitectura:
- ¿Qué decisión de arquitectura repetirían y cuál cambiarían? En SGP: repetir la separación rutas $\rightarrow$ controladores $\rightarrow$ servicios y los hashes HMAC en la recuperación; cambiar la documentación manual por OpenAPI generado y centralizar validaciones.
- ¿Qué aprendimos de comparar enfoques (rapidez de arranque, seguridad por defecto, pruebas)?
- ¿Cuál elegiríamos para un siguiente proyecto y por qué?

### Párrafos de reflexión individual:

- **Rubiel Rodríguez:** _pendiente_

- **Juan Manuel Arcila:**
  > "Al comparar los cuatro backends desarrollados en los ejercicios formativos, la lección más contundente desde la perspectiva de desarrollo frontend y coordinación es el impacto crítico que tiene el contrato de la API sobre la estabilidad del sistema. En SGP, Node.js y Express ofrecieron gran agilidad inicial y la conveniencia de usar JavaScript en todo el stack; sin embargo, al no contar con un esquema tipado ni OpenAPI nativo, la documentación manual en Markdown (`api-rest.md`) quedó desactualizada con el código real. Esto provocó que en las pruebas con MSW simuláramos respuestas y códigos de error que el backend real no manejaba, teniendo que corregir los handlers en etapas avanzadas de la rotación. Por el contrario, la experiencia con FastAPI en Python y Spring Boot en Java evidenció que frameworks con validación estricta (Pydantic / Bean Validation) y Swagger generado en tiempo de ejecución eliminan esa fricción, garantizando que el frontend consuma contratos confiables. Si iniciara un nuevo proyecto, mantendría React en el frontend pero seleccionaría un backend con especificación OpenAPI integrada y tipado estricto (como FastAPI o Node.js con NestJS/TypeScript), combinando rapidez de iteración con la solidez de un contrato formal."

- **Juan Carlos Sánchez:** _pendiente_

## 3. Deuda técnica priorizada
La lista priorizada (Alta/Media/Baja con impacto, esfuerzo y responsable) está en `docs/07-deuda-tecnica.md`.
