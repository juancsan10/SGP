// =====================================================
// database/seed.js
// Inserta datos de ejemplo con contraseñas hasheadas
//
// USO:  node database/seed.js
// (ejecutar DESPUÉS de: pnpm install)
// =====================================================

require('dotenv').config();
const mysql  = require('mysql2/promise');
const bcrypt = require('bcryptjs');

// ── Configuración de conexión (usa .env si existe) ──
const DB_CONFIG = {
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME     || 'SistemaGestionProyectosSENA',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
};

async function seed() {
  console.log('\n🌱  SGP – Iniciando carga de datos de ejemplo...\n');
  console.log(`📡  Conectando a MySQL en ${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}\n`);

  let conn;
  try {
    conn = await mysql.createConnection(DB_CONFIG);
    console.log('✅  Conexión exitosa\n');
  } catch (err) {
    console.error('❌  Error de conexión:', err.message);
    console.error('\n📋  Verifica que:');
    console.error('    1. MySQL esté corriendo');
    console.error('    2. El archivo .env tenga las credenciales correctas');
    console.error('    3. La base de datos exista (importa schema.sql primero)\n');
    process.exit(1);
  }

  try {
    // Deshabilitar foreign key checks para limpiar sin errores de orden
    await conn.execute('SET FOREIGN_KEY_CHECKS = 0');

    // Limpiar tablas en orden inverso de dependencias
    // (se agregan aquí las 5 tablas nuevas: comentarios, archivos,
    // evaluaciones, reuniones, github_integration)
    const tablas = [
      'password_reset_tokens','historial_cambios','notificaciones','mensajes','repositorios',
      'comentarios','archivos','evaluaciones','reuniones','github_integration',
      'entregables','tareas','fases_proyecto','equipos_proyecto',
      'proyectos','usuarios','roles',
    ];
    for (const tabla of tablas) {
      await conn.execute(`TRUNCATE TABLE ${tabla}`);
    }
    await conn.execute('SET FOREIGN_KEY_CHECKS = 1');
    console.log('🗑️   Tablas limpiadas\n');

    // ── ROLES ──────────────────────────────────────────
    await conn.execute(`
      INSERT INTO roles (id_rol, nombre_rol, descripcion) VALUES
      (1, 'Administrador', 'Control total del sistema'),
      (2, 'Instructor',    'Gestiona proyectos y aprendices'),
      (3, 'Aprendiz',      'Participa en proyectos asignados')
    `);
    console.log('✅  Roles insertados');

    // ── USUARIOS (con contraseña "123" hasheada correctamente) ──
    console.log('🔐  Generando hashes de contraseñas...');
    const hash = await bcrypt.hash('123', 10);
    console.log('    Hash generado:', hash);

    await conn.execute(`
      INSERT INTO usuarios
        (id_usuario, nombres, apellidos, correo, contrasena, ficha, programa_formacion, id_rol, estado)
      VALUES
        (1,  'Juan',      'Perez',      'juan@mail.com',   ?,   '001', 'ADSO', 1, 1),
        (2,  'Maria',     'Gomez',      'maria@mail.com',  ?,   '002', 'ADSO', 2, 1),
        (3,  'Carlos',    'Lopez',      'carlos@mail.com', ?,   '003', 'ADSO', 3, 1),
        (4,  'Ana',       'Martinez',   'ana@mail.com',    ?,   '004', 'ADSO', 3, 1),
        (5,  'Luis',      'Rodriguez',  'luis@mail.com',   ?,   '005', 'ADSO', 2, 1),
        (6,  'Sofia',     'Hernandez',  'sofia@mail.com',  ?,   '006', 'ADSO', 3, 1),
        (7,  'Pedro',     'Ramirez',    'pedro@mail.com',  ?,   '007', 'ADSO', 3, 1),
        (8,  'Laura',     'Torres',     'laura@mail.com',  ?,   '008', 'ADSO', 2, 1),
        (9,  'Diego',     'Flores',     'diego@mail.com',  ?,   '009', 'ADSO', 3, 1),
        (10, 'Valentina', 'Castro',     'vale@mail.com',   ?,   '010', 'ADSO', 3, 1)
    `, Array(10).fill(hash));
    console.log('✅  Usuarios insertados (contraseña: 123)');

    // ── PROYECTOS ───────────────────────────────────────
    await conn.execute(`
      INSERT INTO proyectos
        (id_proyecto, nombre, descripcion, fecha_inicio, fecha_fin, porcentaje_avance, estado, id_instructor)
      VALUES
        (1, 'Sistema Web SENA',
            'Desarrollo de un sistema web para gestión académica del SENA',
            '2025-01-01', '2025-06-30', 65.00, 'Activo', 2),
        (2, 'App Móvil Aprendices',
            'Aplicación móvil para seguimiento de actividades de aprendices',
            '2025-02-01', '2025-07-31', 30.00, 'Activo', 5),
        (3, 'IA para Orientación Vocacional',
            'Sistema de inteligencia artificial para orientación vocacional SENA',
            '2025-03-01', '2025-08-31', 10.00, 'En Planificación', 5),
        (4, 'E-Learning Platform',
            'Plataforma de aprendizaje en línea para cursos virtuales',
            '2025-04-01', '2025-09-30', 0.00, 'En Planificación', 2)
    `);
    console.log('✅  Proyectos insertados');

    // ── EQUIPOS ─────────────────────────────────────────
    await conn.execute(`
      INSERT INTO equipos_proyecto (id_proyecto, id_usuario, rol_en_equipo) VALUES
      (1, 3,  'Desarrollador Frontend'),
      (1, 4,  'Desarrolladora Backend'),
      (1, 6,  'Analista QA'),
      (2, 7,  'Desarrollador Móvil'),
      (2, 9,  'Diseñador UI/UX'),
      (3, 10, 'Investigadora IA'),
      (3, 4,  'Desarrolladora Python')
    `);
    console.log('✅  Equipos insertados');

    // ── FASES ────────────────────────────────────────────
    await conn.execute(`
      INSERT INTO fases_proyecto
        (id_fase, nombre_fase, descripcion, fecha_inicio, fecha_fin, porcentaje_avance, id_proyecto)
      VALUES
        (1, 'Análisis de Requerimientos',
            'Levantamiento y documentación de requerimientos del sistema',
            '2025-01-01', '2025-01-31', 100.00, 1),
        (2, 'Diseño de Arquitectura',
            'Diseño de la arquitectura técnica y UI/UX',
            '2025-02-01', '2025-02-28', 100.00, 1),
        (3, 'Desarrollo',
            'Implementación del código fuente',
            '2025-03-01', '2025-05-31', 60.00, 1),
        (4, 'Pruebas',
            'Testing y control de calidad',
            '2025-06-01', '2025-06-30', 0.00, 1),
        (5, 'Análisis',
            'Análisis inicial de la app móvil',
            '2025-02-01', '2025-03-15', 80.00, 2),
        (6, 'Desarrollo MVP',
            'Desarrollo del producto mínimo viable',
            '2025-03-16', '2025-06-30', 20.00, 2)
    `);
    console.log('✅  Fases insertadas');

    // ── ENTREGABLES ──────────────────────────────────────
    await conn.execute(`
      INSERT INTO entregables
        (nombre, descripcion, fecha_entrega, estado, id_fase)
      VALUES
        ('Documento de Requerimientos',  'SRS completo del sistema', '2025-01-20', 'Entregado',  1),
        ('Casos de Uso',                 'Diagramas UML completos',  '2025-01-31', 'Entregado',  1),
        ('Prototipo Figma',              'Mockups de todas las vistas','2025-02-20', 'Entregado', 2),
        ('Diagrama de Base de Datos',    'MER y MR del sistema',     '2025-02-28', 'Entregado',  2),
        ('Módulo de Autenticación',      'Login y registro',         '2025-03-31', 'Entregado',  3),
        ('Módulo de Proyectos',          'CRUD de proyectos',        '2025-04-30', 'Entregado',  3),
        ('Módulo de Tareas',             'Gestión de tareas',        '2025-05-31', 'En Revisión',3)
    `);
    console.log('✅  Entregables insertados');

    // ── TAREAS ───────────────────────────────────────────
    await conn.execute(`
      INSERT INTO tareas
        (titulo, descripcion, fecha_inicio, fecha_vencimiento, estado, prioridad, porcentaje_avance, id_proyecto, id_asignado)
      VALUES
        ('Configurar repositorio GitHub',    'Crear repo y estructura',          '2025-01-05','2025-01-10','Completada','Alta',  100.00,1,3),
        ('Diseñar modelo de base de datos',  'MER + diccionario de datos',       '2025-01-10','2025-01-25','Completada','Alta',  100.00,1,4),
        ('Implementar API REST',             'Endpoints del backend Node.js',    '2025-03-01','2025-04-15','Completada','Alta',  100.00,1,3),
        ('Desarrollar interfaz de usuario',  'Frontend React con todas las vistas','2025-03-15','2025-05-15','En curso', 'Alta',   70.00,1,4),
        ('Pruebas unitarias',                'Jest + cobertura >80%',            '2025-06-01','2025-06-20','Pendiente', 'Media',   0.00,1,6),
        ('Diseño de pantallas app',          'Wireframes y mockups en Figma',    '2025-02-01','2025-02-28','Completada','Alta',  100.00,2,9),
        ('Configurar React Native',          'Setup del proyecto móvil',         '2025-03-16','2025-03-31','Completada','Alta',  100.00,2,7),
        ('Módulo de autenticación app',      'Login biométrico y JWT',           '2025-04-01','2025-05-15','En curso',  'Alta',   50.00,2,7),
        ('Integrar API backend',             'Conectar app con API REST',        '2025-05-16','2025-06-30','Pendiente', 'Media',   0.00,2,9),
        ('Investigar modelos de ML',         'Revisar algoritmos recomendación', '2025-03-01','2025-04-30','En curso',  'Alta',   40.00,3,10)
    `);
    console.log('✅  Tareas insertadas');

    // ── MENSAJES ─────────────────────────────────────────
    await conn.execute(`
      INSERT INTO mensajes (contenido, id_remitente, id_proyecto) VALUES
      ('Buenos días equipo, ¿cómo va el avance del módulo de autenticación?', 2, 1),
      ('Listo, ya terminé el backend del login. Subí los cambios al repo.',   3, 1),
      ('Perfecto Carlos. Ana, ¿puedes revisar y hacer el frontend?',          2, 1),
      ('Claro, lo reviso hoy en la tarde y tengo algo para mañana.',         4, 1),
      ('Recuerden la reunión de seguimiento el viernes a las 2pm.',           2, 1),
      ('Confirmado, ahí estaremos.',                                          3, 1),
      ('Equipo app: el prototipo de Figma está aprobado, iniciamos dev.',     5, 2),
      ('Genial! Ya configuré el proyecto en React Native.',                   7, 2)
    `);
    console.log('✅  Mensajes insertados');

    // ── NOTIFICACIONES ───────────────────────────────────
    await conn.execute(`
      INSERT INTO notificaciones (titulo, mensaje, tipo, leida, id_usuario) VALUES
      ('Nueva tarea asignada',     'Se te asignó: Desarrollar interfaz de usuario', 'tarea',   0, 4),
      ('Nueva tarea asignada',     'Se te asignó: Pruebas unitarias',               'tarea',   0, 6),
      ('Mensaje en Sistema Web',   'Maria Gomez escribió en el chat del proyecto',  'mensaje', 1, 3),
      ('Nueva tarea asignada',     'Se te asignó: Módulo de autenticación app',     'tarea',   0, 7),
      ('Bienvenido al SGP',        'Tu cuenta ha sido activada exitosamente',       'sistema', 1, 3),
      ('Bienvenido al SGP',        'Tu cuenta ha sido activada exitosamente',       'sistema', 1, 4),
      ('Proyecto actualizado',     'El proyecto App Móvil tiene nuevas tareas',     'sistema', 0, 9)
    `);
    console.log('✅  Notificaciones insertadas');

    // ── REPOSITORIOS ─────────────────────────────────────
    await conn.execute(`
      INSERT INTO repositorios (url_github, rama_principal, ultima_actualizacion, id_proyecto) VALUES
      ('https://github.com/sena-adso/sistema-web',    'main',    NOW(), 1),
      ('https://github.com/sena-adso/app-movil',      'develop', NOW(), 2),
      ('https://github.com/sena-adso/ia-vocacional',  'main',    NOW(), 3)
    `);
    console.log('✅  Repositorios insertados');

    // ── COMENTARIOS (NUEVO: retroalimentación sobre entregables, RN-015) ──
    // Nota: id_entregable 1-7 corresponden a los entregables sembrados arriba
    // (fueron creados con AUTO_INCREMENT, así que asumimos ese orden 1..7).
    await conn.execute(`
      INSERT INTO comentarios (contenido, id_usuario, id_entregable) VALUES
      ('Buen trabajo con el documento, solo falta detallar el alcance en la sección 3.', 2, 1),
      ('Corregido, gracias por la observación.', 3, 1),
      ('Los diagramas de casos de uso están completos y bien documentados.', 2, 2)
    `);
    console.log('✅  Comentarios insertados');

    // ── EVALUACIONES (NUEVO, RN-016) ──────────────────────
    // Solo se evalúan entregables de proyectos en estado "En Revisión".
    // Ninguno de los proyectos sembrados está en ese estado todavía, así
    // que esta tabla queda vacía intencionalmente (ver RN-016 en
    // reglas-de-negocio.md). Cambia el estado de un proyecto a
    // "En Revisión" vía PUT /proyectos/:id para poder probar el endpoint
    // POST /evaluaciones.

    // ── REUNIONES (NUEVO) ──────────────────────────────────
    await conn.execute(`
      INSERT INTO reuniones (titulo, descripcion, fecha_reunion, lugar, id_proyecto) VALUES
      ('Seguimiento semanal Sistema Web', 'Revisión de avance del sprint actual', '2025-06-06 14:00:00', 'Sala virtual - Meet', 1),
      ('Kickoff App Móvil', 'Reunión inicial de planificación', '2025-02-05 09:00:00', 'Bloque 5 - Sala 302', 2)
    `);
    console.log('✅  Reuniones insertadas');

    // ── GITHUB_INTEGRATION (NUEVO) ─────────────────────────
    // El "token" de ejemplo es un valor ficticio; en un caso real cada
    // usuario lo genera desde GitHub (Settings > Developer settings > PAT).
    await conn.execute(`
      INSERT INTO github_integration (github_username, github_token, id_usuario) VALUES
      ('carlos-lopez-dev', 'ghp_ejemploFicticioNoUsarEnProduccion01', 3),
      ('ana-martinez-dev',  'ghp_ejemploFicticioNoUsarEnProduccion02', 4)
    `);
    console.log('✅  Integraciones de GitHub insertadas');

    console.log('\n✅✅✅  ¡SEED COMPLETADO EXITOSAMENTE!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Cuentas de acceso (contraseña: 123)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  👤 juan@mail.com    → Administrador');
    console.log('  👤 maria@mail.com   → Instructor');
    console.log('  👤 luis@mail.com    → Instructor');
    console.log('  👤 carlos@mail.com  → Aprendiz');
    console.log('  👤 ana@mail.com     → Aprendiz');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('  Ahora ejecuta:  pnpm run dev\n');

  } catch (err) {
    console.error('\n❌  Error durante el seed:', err.message);
    if (err.code === 'ER_NO_SUCH_TABLE') {
      console.error('\n📋  La tabla no existe. Importa primero el schema.sql en MySQL Workbench.\n');
    }
    process.exit(1);
  } finally {
    await conn.end();
  }
}

seed();
