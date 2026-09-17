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

// ── Fechas relativas a "hoy" (NUEVO) ─────────────────
// ANTES: las fechas de proyectos/fases/entregables/tareas estaban escritas
// como texto fijo (ej. '2025-01-20'), así que en cuanto pasaba esa fecha,
// TODO el seed quedaba "vencido" desde el día 1 de cualquier demo nueva.
// AHORA: se calculan en el momento de correr el seed, relativas a la
// fecha real del sistema, para que los elementos pendientes/en curso
// siempre queden coherentes (y el buscador de alertas/calendario tenga
// algo real que mostrar) sin importar cuándo se ejecute esto.
function fechaRelativa(diasDesdeHoy) {
  const d = new Date();
  d.setDate(d.getDate() + diasDesdeHoy);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}
function fechaHoraRelativa(diasDesdeHoy, hora) {
  return `${fechaRelativa(diasDesdeHoy)} ${hora}`;
}

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
    const tablas = [
      'password_reset_tokens', 'entregas_tareas', 'historial_cambios', 'notificaciones', 'mensajes', 'repositorios',
      'comentarios', 'archivos', 'evaluaciones', 'reuniones', 'github_integration',
      'entregables', 'tareas', 'fases_proyecto', 'equipos_proyecto',
      'proyectos', 'usuarios', 'roles',
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

    // ── USUARIOS ──────────────────────────────────────
    // NUEVO: nombres, correos e "identificacion" (cédula) realistas en
    // vez de datos genéricos de prueba (juan@mail.com, "001".."010") —
    // así el buscador de aprendices por identificación (sección 12-13 del
    // README) tiene datos reales que encontrar, no una tabla vacía.
    console.log('🔐  Generando hashes de contraseñas...');
    const hash = await bcrypt.hash('Sena2026*', 10);
    console.log('    Hash generado:', hash);

    await conn.execute(`
      INSERT INTO usuarios
        (id_usuario, nombres, apellidos, correo, identificacion, contrasena, ficha, programa_formacion, id_rol, estado)
      VALUES
        (1,  'Diana Patricia',  'Ríos Ocampo',        'diana.rios@sgpsena.local',      '1002003001', ?, NULL,   NULL,                          1, 1),
        (2,  'Laura Marcela',   'Gómez Rodríguez',     'laura.gomez@sgpsena.local',     '1002003002', ?, NULL,   NULL,                          2, 1),
        (3,  'Miguel Ángel',    'Torres Salcedo',      'miguel.torres@sgpsena.local',   '1002003003', ?, NULL,   NULL,                          2, 1),
        (4,  'Carlos Andrés',   'Herrera Martínez',    'carlos.herrera@sgpsena.local',  '1098765001', ?, '2825431', 'ADSO',                    3, 1),
        (5,  'Juan David',      'Martínez López',      'juan.martinez@sgpsena.local',   '1098765002', ?, '2825431', 'ADSO',                    3, 1),
        (6,  'Valentina',       'Castaño Ruiz',         'valentina.castano@sgpsena.local','1098765003',?, '2825431', 'ADSO',                    3, 1),
        (7,  'Andrés Felipe',   'Suárez Peña',          'andres.suarez@sgpsena.local',   '1098765004', ?, '2825789', 'Análisis y Desarrollo de Software', 3, 1),
        (8,  'Camila',          'Zapata Bedoya',        'camila.zapata@sgpsena.local',   '1098765005', ?, '2825789', 'Análisis y Desarrollo de Software', 3, 1),
        (9,  'Sebastián',       'Ortiz Muñoz',          'sebastian.ortiz@sgpsena.local', '1098765006', ?, '2825789', 'Análisis y Desarrollo de Software', 3, 1),
        (10, 'Mariana',         'Restrepo Vélez',       'mariana.restrepo@sgpsena.local','1098765007', ?, '2826150', 'Inteligencia Artificial',  3, 1)
    `, Array(10).fill(hash));
    console.log('✅  Usuarios insertados (contraseña: Sena2026*)');

    // ── PROYECTOS ───────────────────────────────────────
    await conn.execute(`
      INSERT INTO proyectos
        (id_proyecto, nombre, descripcion, fecha_inicio, fecha_fin, porcentaje_avance, estado, id_instructor)
      VALUES
        (1, 'Sistema Web SENA',
            'Desarrollo de un sistema web para gestión académica del SENA',
            '${fechaRelativa(-120)}', '${fechaRelativa(30)}', 65.00, 'Activo', 2),
        (2, 'App Móvil Aprendices',
            'Aplicación móvil para seguimiento de actividades de aprendices',
            '${fechaRelativa(-90)}', '${fechaRelativa(60)}', 30.00, 'Activo', 3),
        (3, 'IA para Orientación Vocacional',
            'Sistema de inteligencia artificial para orientación vocacional SENA',
            '${fechaRelativa(-30)}', '${fechaRelativa(120)}', 10.00, 'En Planificación', 3),
        (4, 'E-Learning Platform',
            'Plataforma de aprendizaje en línea para cursos virtuales',
            '${fechaRelativa(-10)}', '${fechaRelativa(150)}', 0.00, 'En Planificación', 2)
    `);
    console.log('✅  Proyectos insertados');

    // ── EQUIPOS ─────────────────────────────────────────
    await conn.execute(`
      INSERT INTO equipos_proyecto (id_proyecto, id_usuario, rol_en_equipo) VALUES
      (1, 4,  'Desarrollador Frontend'),
      (1, 5,  'Desarrollador Backend'),
      (1, 6,  'Analista QA'),
      (2, 7,  'Desarrollador Móvil'),
      (2, 8,  'Diseñadora UI/UX'),
      (3, 10, 'Investigadora IA'),
      (3, 9,  'Desarrollador Python')
    `);
    console.log('✅  Equipos insertados');

    // ── FASES ────────────────────────────────────────────
    await conn.execute(`
      INSERT INTO fases_proyecto
        (id_fase, nombre_fase, descripcion, fecha_inicio, fecha_fin, porcentaje_avance, id_proyecto)
      VALUES
        (1, 'Análisis de Requerimientos',
            'Levantamiento y documentación de requerimientos del sistema',
            '${fechaRelativa(-120)}', '${fechaRelativa(-90)}', 100.00, 1),
        (2, 'Diseño de Arquitectura',
            'Diseño de la arquitectura técnica y UI/UX',
            '${fechaRelativa(-89)}', '${fechaRelativa(-60)}', 100.00, 1),
        (3, 'Desarrollo',
            'Implementación del código fuente',
            '${fechaRelativa(-59)}', '${fechaRelativa(15)}', 60.00, 1),
        (4, 'Pruebas',
            'Testing y control de calidad',
            '${fechaRelativa(16)}', '${fechaRelativa(30)}', 0.00, 1),
        (5, 'Análisis',
            'Análisis inicial de la app móvil',
            '${fechaRelativa(-90)}', '${fechaRelativa(-45)}', 80.00, 2),
        (6, 'Desarrollo MVP',
            'Desarrollo del producto mínimo viable',
            '${fechaRelativa(-44)}', '${fechaRelativa(45)}', 20.00, 2)
    `);
    console.log('✅  Fases insertadas');

    // ── ENTREGABLES ──────────────────────────────────────
    // Los ya "Entregado" quedan con fecha pasada; los pendientes/en
    // revisión quedan en el futuro (y siempre dentro del rango de su fase).
    await conn.execute(`
      INSERT INTO entregables
        (nombre, descripcion, fecha_entrega, estado, id_fase)
      VALUES
        ('Documento de Requerimientos',  'SRS completo del sistema',   '${fechaRelativa(-110)}', 'Entregado',  1),
        ('Casos de Uso',                 'Diagramas UML completos',    '${fechaRelativa(-100)}', 'Entregado',  1),
        ('Prototipo Figma',              'Mockups de todas las vistas','${fechaRelativa(-85)}',  'Entregado',  2),
        ('Diagrama de Base de Datos',    'MER y MR del sistema',       '${fechaRelativa(-80)}',  'Entregado',  2),
        ('Módulo de Autenticación',      'Login y registro',           '${fechaRelativa(-58)}',  'Entregado',  3),
        ('Módulo de Proyectos',          'CRUD de proyectos',          '${fechaRelativa(-30)}',  'Entregado',  3),
        ('Módulo de Tareas',             'Gestión de tareas',          '${fechaRelativa(2)}',    'En Revisión',3),
        ('Plan de Pruebas',              'Casos de prueba unitarias y de integración', '${fechaRelativa(17)}', 'Pendiente', 4),
        ('Reporte Final de Pruebas',     'Resultados de QA y cobertura de código',     '${fechaRelativa(28)}', 'Pendiente', 4)
    `);
    console.log('✅  Entregables insertados');

    // ── TAREAS ───────────────────────────────────────────
    await conn.execute(`
      INSERT INTO tareas
        (titulo, descripcion, fecha_inicio, fecha_vencimiento, estado, prioridad, porcentaje_avance, id_proyecto, id_asignado)
      VALUES
        ('Configurar repositorio GitHub',    'Crear repo y estructura',            '${fechaRelativa(-118)}','${fechaRelativa(-113)}','Completada','Alta',  100.00,1,4),
        ('Diseñar modelo de base de datos',  'MER + diccionario de datos',         '${fechaRelativa(-113)}','${fechaRelativa(-98)}', 'Completada','Alta',  100.00,1,5),
        ('Implementar API REST',             'Endpoints del backend Node.js',      '${fechaRelativa(-90)}', '${fechaRelativa(-75)}', 'Completada','Alta',  100.00,1,4),
        ('Desarrollar interfaz de usuario',  'Frontend React con todas las vistas','${fechaRelativa(-75)}', '${fechaRelativa(10)}',  'En curso',  'Alta',   70.00,1,5),
        ('Pruebas unitarias',                'Jest + cobertura >80%',              '${fechaRelativa(5)}',   '${fechaRelativa(25)}',  'Pendiente', 'Media',   0.00,1,6),
        ('Diseño de pantallas app',          'Wireframes y mockups en Figma',      '${fechaRelativa(-90)}', '${fechaRelativa(-62)}', 'Completada','Alta',  100.00,2,8),
        ('Configurar React Native',          'Setup del proyecto móvil',           '${fechaRelativa(-61)}', '${fechaRelativa(-46)}', 'Completada','Alta',  100.00,2,7),
        ('Módulo de autenticación app',      'Login biométrico y JWT',             '${fechaRelativa(-45)}', '${fechaRelativa(15)}',  'En curso',  'Alta',   50.00,2,7),
        ('Integrar API backend',             'Conectar app con API REST',          '${fechaRelativa(16)}',  '${fechaRelativa(40)}',  'Pendiente', 'Media',   0.00,2,8),
        ('Investigar modelos de ML',         'Revisar algoritmos recomendación',   '${fechaRelativa(-30)}', '${fechaRelativa(30)}',  'En curso',  'Alta',   40.00,3,10)
    `);
    console.log('✅  Tareas insertadas');

    // ── ENTREGAS DE TAREAS (NUEVO) ──────────────────────
    // Ejemplos con los 4 estados del flujo de revisión (sección 11 del
    // README): Entregada, Requiere corrección, Corregida, Aprobada. Así
    // el módulo de Entregas se puede probar en vivo sin tener que crear
    // datos manualmente primero.
    await conn.execute(`
      INSERT INTO entregas_tareas
        (id_tarea, id_aprendiz, comentario_aprendiz, url_entrega, estado, observacion_instructor, fecha_revision)
      VALUES
        (1, 4, 'Repositorio creado con la estructura base del proyecto.', 'https://github.com/sena-adso/sistema-web', 'Aprobada', 'Buen trabajo, estructura clara y bien organizada.', NOW()),
        (4, 5, 'Avance del frontend, faltan los últimos 2 componentes.',  NULL, 'Requiere corrección', 'Falta el componente de notificaciones y el responsive en móvil.', NOW()),
        (8, 7, 'Login con JWT implementado, pendiente biometría.',        NULL, 'Corregida', NULL, NULL)
    `);
    console.log('✅  Entregas de tareas insertadas');

    // ── MENSAJES ─────────────────────────────────────────
    await conn.execute(`
      INSERT INTO mensajes (contenido, id_remitente, id_proyecto) VALUES
      ('Buenos días equipo, ¿cómo va el avance del módulo de autenticación?', 2, 1),
      ('Listo, ya terminé el backend del login. Subí los cambios al repo.',   4, 1),
      ('Perfecto Carlos. Juan, ¿puedes revisar y hacer el frontend?',         2, 1),
      ('Claro, lo reviso hoy en la tarde y tengo algo para mañana.',          5, 1),
      ('Recuerden la reunión de seguimiento el viernes a las 2pm.',           2, 1),
      ('Confirmado, ahí estaremos.',                                          4, 1),
      ('Equipo app: el prototipo de Figma está aprobado, iniciamos dev.',     3, 2),
      ('Genial! Ya configuré el proyecto en React Native.',                   7, 2)
    `);
    console.log('✅  Mensajes insertados');

    // ── NOTIFICACIONES ───────────────────────────────────
    await conn.execute(`
      INSERT INTO notificaciones (titulo, mensaje, tipo, leida, id_usuario) VALUES
      ('Nueva tarea asignada',     'Se te asignó: Desarrollar interfaz de usuario', 'tarea',   0, 5),
      ('Nueva tarea asignada',     'Se te asignó: Pruebas unitarias',               'tarea',   0, 6),
      ('Mensaje en Sistema Web',   'Laura Gómez escribió en el chat del proyecto',  'mensaje', 1, 4),
      ('Nueva tarea asignada',     'Se te asignó: Módulo de autenticación app',     'tarea',   0, 7),
      ('Bienvenido al SGP',        'Tu cuenta ha sido activada exitosamente',       'sistema', 1, 4),
      ('Bienvenido al SGP',        'Tu cuenta ha sido activada exitosamente',       'sistema', 1, 5),
      ('Proyecto actualizado',     'El proyecto App Móvil tiene nuevas tareas',     'sistema', 0, 8)
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

    // ── COMENTARIOS (RN-015) ──────────────────────────────
    // Nota: id_entregable 1-9 corresponden a los entregables sembrados arriba.
    await conn.execute(`
      INSERT INTO comentarios (contenido, id_usuario, id_entregable) VALUES
      ('Buen trabajo con el documento, solo falta detallar el alcance en la sección 3.', 2, 1),
      ('Corregido, gracias por la observación.', 4, 1),
      ('Los diagramas de casos de uso están completos y bien documentados.', 2, 2)
    `);
    console.log('✅  Comentarios insertados');

    // ── EVALUACIONES (RN-016) ─────────────────────────────
    // Solo se evalúan entregables de proyectos en estado "En Revisión".
    // Ninguno de los proyectos sembrados está en ese estado todavía, así
    // que esta tabla queda vacía intencionalmente. Cambia el estado de un
    // proyecto a "En Revisión" vía PUT /proyectos/:id para probar
    // POST /evaluaciones.

    // ── REUNIONES ──────────────────────────────────────────
    // Una histórica (ya ocurrió) y una próxima, para que el Calendario y
    // la Línea de Tiempo tengan algo pendiente que mostrar.
    await conn.execute(`
      INSERT INTO reuniones (titulo, descripcion, fecha_reunion, lugar, id_proyecto) VALUES
      ('Seguimiento semanal Sistema Web', 'Revisión de avance del sprint actual', '${fechaHoraRelativa(3, '14:00:00')}', 'Sala virtual - Meet', 1),
      ('Kickoff App Móvil', 'Reunión inicial de planificación', '${fechaHoraRelativa(-85, '09:00:00')}', 'Bloque 5 - Sala 302', 2)
    `);
    console.log('✅  Reuniones insertadas');

    // ── GITHUB_INTEGRATION ─────────────────────────────────
    // El "token" de ejemplo es un valor ficticio; en un caso real cada
    // usuario lo genera desde GitHub (Settings > Developer settings > PAT).
    await conn.execute(`
      INSERT INTO github_integration (github_username, github_token, id_usuario) VALUES
      ('carlos-herrera-dev', 'ghp_ejemploFicticioNoUsarEnProduccion01', 4),
      ('juan-martinez-dev',  'ghp_ejemploFicticioNoUsarEnProduccion02', 5)
    `);
    console.log('✅  Integraciones de GitHub insertadas');

    console.log('\n✅✅✅  ¡SEED COMPLETADO EXITOSAMENTE!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Cuentas de acceso (contraseña: Sena2026*)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  👤 diana.rios@sgpsena.local      → Administrador');
    console.log('  👤 laura.gomez@sgpsena.local     → Instructor');
    console.log('  👤 miguel.torres@sgpsena.local   → Instructor');
    console.log('  👤 carlos.herrera@sgpsena.local  → Aprendiz (identificación: 1098765001)');
    console.log('  👤 juan.martinez@sgpsena.local   → Aprendiz (identificación: 1098765002)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

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
