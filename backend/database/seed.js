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
const fs     = require('fs');
const path   = require('path');

// Carpeta donde el backend guarda los archivos subidos (la misma que usa
// src/middlewares/upload.middleware.js). El seed deja aquí un PDF de
// ejemplo para que los adjuntos sembrados se puedan abrir de verdad.
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const PDF_EJEMPLO = 'ejemplo-documento-requerimientos.pdf';

function crearPdfEjemplo() {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const destino = path.join(UPLOAD_DIR, PDF_EJEMPLO);
  if (fs.existsSync(destino)) return;
  const texto = 'SGP SENA - Documento de ejemplo (seed)';
  const contenido = `BT /F1 18 Tf 60 740 Td (${texto}) Tj ET`;
  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${contenido.length} >>\nstream\n${contenido}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objetos.forEach((o, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach(o => { pdf += `${String(o).padStart(10, '0')} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  fs.writeFileSync(destino, pdf);
}

// ── Configuración de conexión (usa .env si existe) ──
const DB_CONFIG = {
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME     || 'SistemaGestionProyectosSENA',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
};

// ── Administrador único del sistema ──────────────────
const ADMIN_CORREO     = 'rubiel.tads@gmail.com';
const ADMIN_CONTRASENA = 'ELruby2oo4@';

// ── Fechas relativas a "hoy" ──────────────────────────
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
      'comentarios', 'archivos', 'evaluaciones', 'reuniones', 'github_integration', 'solicitudes_equipo',
      'solicitudes', 'eliminaciones_archivos', 'eliminaciones_usuario',
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
    // AMPLIADO: 3 aprendices más (11-13) para dar más variedad de datos
    // y demostrar la paginación con volumen real, no apenas 1-2 páginas.
    // El sistema tiene UN ÚNICO Administrador (id 1), con credenciales
    // propias. El resto de cuentas de demo comparten 'Sena2026*'.
    console.log('🔐  Generando hashes de contraseñas...');
    const hash = await bcrypt.hash('Sena2026*', 10);
    const hashAdmin = await bcrypt.hash(ADMIN_CONTRASENA, 10);

    await conn.execute(`
      INSERT INTO usuarios
        (id_usuario, nombres, apellidos, correo, identificacion, contrasena, ficha, programa_formacion, id_rol, estado)
      VALUES
        (1,  'Rubiel',          'Rodríguez',           ?,                               '1002003001', ?, NULL,   NULL,                          1, 1),
        (2,  'Laura Marcela',   'Gómez Rodríguez',     'laura.gomez@sgpsena.local',     '1002003002', ?, NULL,   NULL,                          2, 1),
        (3,  'Miguel Ángel',    'Torres Salcedo',      'miguel.torres@sgpsena.local',   '1002003003', ?, NULL,   NULL,                          2, 1),
        (4,  'Carlos Andrés',   'Herrera Martínez',    'carlos.herrera@sgpsena.local',  '1098765001', ?, '2825431', 'ADSO',                    3, 1),
        (5,  'Juan David',      'Martínez López',      'juan.martinez@sgpsena.local',   '1098765002', ?, '2825431', 'ADSO',                    3, 1),
        (6,  'Valentina',       'Castaño Ruiz',         'valentina.castano@sgpsena.local','1098765003',?, '2825431', 'ADSO',                    3, 1),
        (7,  'Andrés Felipe',   'Suárez Peña',          'andres.suarez@sgpsena.local',   '1098765004', ?, '2825789', 'Análisis y Desarrollo de Software', 3, 1),
        (8,  'Camila',          'Zapata Bedoya',        'camila.zapata@sgpsena.local',   '1098765005', ?, '2825789', 'Análisis y Desarrollo de Software', 3, 1),
        (9,  'Sebastián',       'Ortiz Muñoz',          'sebastian.ortiz@sgpsena.local', '1098765006', ?, '2825789', 'Análisis y Desarrollo de Software', 3, 1),
        (10, 'Mariana',         'Restrepo Vélez',       'mariana.restrepo@sgpsena.local','1098765007', ?, '2826150', 'Inteligencia Artificial',  3, 1),
        (11, 'Diego',           'Ramírez Ortiz',        'diego.ramirez@sgpsena.local',   '1098765008', ?, '2826150', 'Inteligencia Artificial',  3, 1),
        (12, 'Natalia',         'Cárdenas Ruiz',        'natalia.cardenas@sgpsena.local','1098765009', ?, '2827200', 'Análisis y Desarrollo de Software', 3, 1),
        (13, 'Santiago',        'Molina Vega',          'santiago.molina@sgpsena.local', '1098765010', ?, '2827200', 'Análisis y Desarrollo de Software', 3, 1)
    `, [ADMIN_CORREO, hashAdmin, ...Array(12).fill(hash)]);
    console.log('✅  Usuarios insertados (1 Administrador único + 12 cuentas de demo)');

    // ── PROYECTOS ───────────────────────────────────────
    // AMPLIADO: 3 proyectos más (5-7), para tener 7 en total — suficiente
    // para que la paginación de la sección Proyectos (6 por página) se
    // vea funcionando con datos reales desde el primer arranque.
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
            '${fechaRelativa(-10)}', '${fechaRelativa(150)}', 0.00, 'En Planificación', 2),
        (5, 'Sistema de Biblioteca Digital',
            'Plataforma para gestión de préstamos y catálogo de la biblioteca SENA',
            '${fechaRelativa(-45)}', '${fechaRelativa(90)}', 45.00, 'Activo', 2),
        (6, 'Portal de Egresados',
            'Red de seguimiento y contacto con egresados del SENA',
            '${fechaRelativa(-20)}', '${fechaRelativa(100)}', 15.00, 'Activo', 3),
        (7, 'Sistema de Inventario de Laboratorios',
            'Control de equipos y reservas de los laboratorios de cómputo',
            '${fechaRelativa(-5)}', '${fechaRelativa(120)}', 5.00, 'En Planificación', 2)
    `);
    console.log('✅  Proyectos insertados');

    // ── EQUIPOS ─────────────────────────────────────────
    // AMPLIADO: equipos para los 3 proyectos nuevos, más 2 aprendices
    // existentes agregados a un segundo proyecto (dentro del límite de
    // RN-001: máximo 2 proyectos activos por aprendiz).
    await conn.execute(`
      INSERT INTO equipos_proyecto (id_proyecto, id_usuario, rol_en_equipo) VALUES
      (1, 4,  'Desarrollador Frontend'),
      (1, 5,  'Desarrollador Backend'),
      (1, 6,  'Analista QA'),
      (2, 7,  'Desarrollador Móvil'),
      (2, 8,  'Diseñadora UI/UX'),
      (3, 10, 'Investigadora IA'),
      (3, 9,  'Desarrollador Python'),
      (5, 11, 'Desarrollador Backend'),
      (5, 12, 'Desarrolladora Frontend'),
      (6, 13, 'Desarrollador Full Stack'),
      (6, 9,  'Analista de Datos'),
      (7, 6,  'Analista QA')
    `);
    console.log('✅  Equipos insertados');

    // ── FASES ────────────────────────────────────────────
    // AMPLIADO: fases para los proyectos 5, 6 y 7.
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
            '${fechaRelativa(-44)}', '${fechaRelativa(45)}', 20.00, 2),
        (7, 'Análisis y Diseño',
            'Levantamiento de requerimientos y diseño de base de datos de la biblioteca',
            '${fechaRelativa(-45)}', '${fechaRelativa(-15)}', 100.00, 5),
        (8, 'Desarrollo',
            'Implementación del catálogo y módulo de préstamos',
            '${fechaRelativa(-14)}', '${fechaRelativa(60)}', 40.00, 5),
        (9, 'Investigación',
            'Encuestas y análisis de necesidades de los egresados',
            '${fechaRelativa(-20)}', '${fechaRelativa(10)}', 60.00, 6),
        (10, 'Levantamiento de Requerimientos',
            'Inventario inicial de equipos y necesidades de reserva',
            '${fechaRelativa(-5)}', '${fechaRelativa(25)}', 10.00, 7)
    `);
    console.log('✅  Fases insertadas');

    // ── ENTREGABLES ──────────────────────────────────────
    // AMPLIADO: entregables de los proyectos nuevos.
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
        ('Reporte Final de Pruebas',     'Resultados de QA y cobertura de código',     '${fechaRelativa(28)}', 'Pendiente', 4),
        ('Documento de requerimientos biblioteca', 'Alcance y funcionalidades del catálogo', '${fechaRelativa(-40)}', 'Entregado', 7),
        ('Prototipo de catálogo',        'Mockups de búsqueda y préstamo de libros',   '${fechaRelativa(20)}', 'Pendiente', 8),
        ('Informe de investigación egresados', 'Resultados de la encuesta de seguimiento', '${fechaRelativa(5)}', 'Pendiente', 9)
    `);
    console.log('✅  Entregables insertados');

    // ── TAREAS ───────────────────────────────────────────
    // AMPLIADO: 5 tareas más (11-15) en los proyectos nuevos, para pasar
    // de 10 a 15 tareas totales — suficiente para que la paginación del
    // listado global de Tareas (10 por página) muestre 2 páginas reales.
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
        ('Investigar modelos de ML',         'Revisar algoritmos recomendación',   '${fechaRelativa(-30)}', '${fechaRelativa(30)}',  'En curso',  'Alta',   40.00,3,10),
        ('Diseñar esquema de base de datos biblioteca', 'Tablas de libros, préstamos y usuarios', '${fechaRelativa(-40)}', '${fechaRelativa(-20)}', 'Completada', 'Alta', 100.00,5,11),
        ('Implementar catálogo de libros',   'Búsqueda y filtros del catálogo',    '${fechaRelativa(-14)}', '${fechaRelativa(20)}',  'En curso',  'Alta',   55.00,5,12),
        ('Recopilar datos de egresados',     'Base de datos inicial de contacto',  '${fechaRelativa(-15)}', '${fechaRelativa(10)}',  'Pendiente', 'Media',   0.00,6,13),
        ('Diseñar encuesta de seguimiento',  'Encuesta de satisfacción laboral',   '${fechaRelativa(-18)}', '${fechaRelativa(5)}',   'En curso',  'Media',  30.00,6,9),
        ('Inventariar equipos de laboratorio','Levantamiento físico de equipos',   '${fechaRelativa(-5)}',  '${fechaRelativa(25)}',  'Pendiente', 'Baja',    0.00,7,6)
    `);
    console.log('✅  Tareas insertadas');

    // ── ENTREGAS DE TAREAS ──────────────────────────────
    // AMPLIADO: un ejemplo más (tarea 11, biblioteca) para variar los
    // proyectos representados, no solo Sistema Web SENA.
    await conn.execute(`
      INSERT INTO entregas_tareas
        (id_tarea, id_aprendiz, comentario_aprendiz, url_entrega, ruta_archivo, estado, observacion_instructor, calificacion, fecha_revision)
      VALUES
        (1, 4, 'Repositorio creado con la estructura base del proyecto.', 'https://github.com/sena-adso/sistema-web', '/uploads/${PDF_EJEMPLO}', 'Aprobada', 'Buen trabajo, estructura clara y bien organizada.', 92.00, NOW()),
        (4, 5, 'Avance del frontend, faltan los últimos 2 componentes.',  NULL, NULL, 'Requiere corrección', 'Falta el componente de notificaciones y el responsive en móvil.', 58.00, NOW()),
        (8, 7, 'Login con JWT implementado, pendiente biometría.',        NULL, NULL, 'Corregida', NULL, NULL, NULL),
        (11, 11, 'Esquema de base de datos normalizado a 3FN, incluye índices.', 'https://github.com/sena-adso/biblioteca-digital', NULL, 'Aprobada', 'Excelente normalización.', 97.00, NOW())
    `);
    console.log('✅  Entregas de tareas insertadas');

    // ── MENSAJES ─────────────────────────────────────────
    // AMPLIADO: mensajes en los proyectos nuevos también.
    await conn.execute(`
      INSERT INTO mensajes (contenido, id_remitente, id_proyecto) VALUES
      ('Buenos días equipo, ¿cómo va el avance del módulo de autenticación?', 2, 1),
      ('Listo, ya terminé el backend del login. Subí los cambios al repo.',   4, 1),
      ('Perfecto Carlos. Juan, ¿puedes revisar y hacer el frontend?',         2, 1),
      ('Claro, lo reviso hoy en la tarde y tengo algo para mañana.',          5, 1),
      ('Recuerden la reunión de seguimiento el viernes a las 2pm.',           2, 1),
      ('Confirmado, ahí estaremos.',                                          4, 1),
      ('Equipo app: el prototipo de Figma está aprobado, iniciamos dev.',     3, 2),
      ('Genial! Ya configuré el proyecto en React Native.',                   7, 2),
      ('¿Cómo va el esquema de la base de datos de la biblioteca?',           2, 5),
      ('Ya está listo y aprobado, empiezo con el catálogo esta semana.',      11, 5),
      ('¿Tenemos ya los primeros resultados de la encuesta de egresados?',    3, 6),
      ('Vamos en un 30%, la mayoría responde por correo institucional.',      9, 6)
    `);
    console.log('✅  Mensajes insertados');

    // ── NOTIFICACIONES ───────────────────────────────────
    // AMPLIADO — dos partes nuevas:
    // 1) más notificaciones "de sistema" para los usuarios nuevos.
    // 2) NOTIFICACIONES CREADAS POR EL ADMINISTRADOR (id_creador=1), para
    //    que la pestaña "Enviadas por mí" de Notificaciones no aparezca
    //    vacía la primera vez que un Admin la abre — esto es justo lo que
    //    el equipo reportó no poder ver. Cada broadcast usa NOW() (o
    //    DATE_SUB) UNA sola vez por sentencia INSERT, así todas sus filas
    //    comparten el mismo fecha_envio y se agrupan correctamente.
    await conn.execute(`
      INSERT INTO notificaciones (titulo, mensaje, tipo, leida, id_usuario) VALUES
      ('Nueva tarea asignada',     'Se te asignó: Desarrollar interfaz de usuario', 'tarea',   0, 5),
      ('Nueva tarea asignada',     'Se te asignó: Pruebas unitarias',               'tarea',   0, 6),
      ('Mensaje en Sistema Web',   'Laura Gómez escribió en el chat del proyecto',  'mensaje', 1, 4),
      ('Nueva tarea asignada',     'Se te asignó: Módulo de autenticación app',     'tarea',   0, 7),
      ('Bienvenido al SGP',        'Tu cuenta ha sido activada exitosamente',       'sistema', 1, 4),
      ('Bienvenido al SGP',        'Tu cuenta ha sido activada exitosamente',       'sistema', 1, 5),
      ('Proyecto actualizado',     'El proyecto App Móvil tiene nuevas tareas',     'sistema', 0, 8),
      ('Nueva tarea asignada',     'Se te asignó: Implementar catálogo de libros',  'tarea',   0, 12),
      ('Nueva tarea asignada',     'Se te asignó: Recopilar datos de egresados',    'tarea',   0, 13),
      ('Bienvenido al SGP',        'Tu cuenta ha sido activada exitosamente',       'sistema', 1, 11)
    `);

    // NUEVO: broadcast de ejemplo #1 — a los 2 instructores, con 1 ya leída.
    await conn.execute(`
      INSERT INTO notificaciones (titulo, mensaje, tipo, prioridad, id_usuario, id_creador, leida, fecha_envio) VALUES
      ('Mantenimiento programado del sistema', 'El sistema estará en mantenimiento el sábado de 2am a 4am por actualización de infraestructura.', 'mantenimiento', 'Alta', 2, 1, 1, NOW()),
      ('Mantenimiento programado del sistema', 'El sistema estará en mantenimiento el sábado de 2am a 4am por actualización de infraestructura.', 'mantenimiento', 'Alta', 3, 1, 0, NOW())
    `);

    // NUEVO: broadcast de ejemplo #2 — a 5 aprendices, enviado hace 2 días.
    await conn.execute(`
      INSERT INTO notificaciones (titulo, mensaje, tipo, prioridad, id_usuario, id_creador, leida, fecha_envio) VALUES
      ('Recordatorio: actualiza tu información de perfil', 'Verifica que tu ficha y programa de formación estén correctos en tu perfil.', 'informativo', 'Baja', 4, 1, 1, DATE_SUB(NOW(), INTERVAL 2 DAY)),
      ('Recordatorio: actualiza tu información de perfil', 'Verifica que tu ficha y programa de formación estén correctos en tu perfil.', 'informativo', 'Baja', 5, 1, 1, DATE_SUB(NOW(), INTERVAL 2 DAY)),
      ('Recordatorio: actualiza tu información de perfil', 'Verifica que tu ficha y programa de formación estén correctos en tu perfil.', 'informativo', 'Baja', 6, 1, 0, DATE_SUB(NOW(), INTERVAL 2 DAY)),
      ('Recordatorio: actualiza tu información de perfil', 'Verifica que tu ficha y programa de formación estén correctos en tu perfil.', 'informativo', 'Baja', 7, 1, 0, DATE_SUB(NOW(), INTERVAL 2 DAY)),
      ('Recordatorio: actualiza tu información de perfil', 'Verifica que tu ficha y programa de formación estén correctos en tu perfil.', 'informativo', 'Baja', 8, 1, 0, DATE_SUB(NOW(), INTERVAL 2 DAY))
    `);
    console.log('✅  Notificaciones insertadas (incluye 2 envíos de ejemplo del Administrador)');

    // ── REPOSITORIOS ─────────────────────────────────────
    // AMPLIADO: repos para los proyectos nuevos, con semáforo variado
    // (verde/amarillo/rojo) para que la funcionalidad se vea en acción
    // desde el primer arranque, sin tener que configurarla a mano.
    await conn.execute(`
      INSERT INTO repositorios (url_github, rama_principal, activo, estado_semaforo, ultima_actualizacion, id_proyecto) VALUES
      ('https://github.com/sena-adso/sistema-web',    'main',    TRUE, 'verde',    NOW(), 1),
      ('https://github.com/sena-adso/app-movil',      'develop', TRUE, 'verde',    NOW(), 2),
      ('https://github.com/sena-adso/ia-vocacional',  'main',    TRUE, 'verde',    NOW(), 3),
      ('https://github.com/sena-adso/biblioteca-digital', 'main',    TRUE, 'verde',    NOW(), 5),
      ('https://github.com/sena-adso/portal-egresados',   'develop', TRUE, 'amarillo', NOW(), 6),
      ('https://github.com/sena-adso/inventario-labs',    'main',    TRUE, 'rojo',     NOW(), 7)
    `);
    console.log('✅  Repositorios insertados');

    // ── COMENTARIOS (RN-015) ──────────────────────────────
    await conn.execute(`
      INSERT INTO comentarios (contenido, id_usuario, id_entregable) VALUES
      ('Buen trabajo con el documento, solo falta detallar el alcance en la sección 3.', 2, 1),
      ('Corregido, gracias por la observación.', 4, 1),
      ('Los diagramas de casos de uso están completos y bien documentados.', 2, 2),
      ('Subí la versión final del SRS con el alcance ajustado.', 4, 1),
      ('Revisaré los diagramas con el equipo antes de la siguiente fase.', 5, 2)
    `);
    console.log('✅  Comentarios insertados');

    // ── ARCHIVOS ADJUNTOS DE ENTREGABLES ───────────────────
    // Un PDF real (generado arriba) para que el Administrador pueda abrir
    // los documentos adjuntos desde el detalle del proyecto.
    crearPdfEjemplo();
    await conn.execute(`
      INSERT INTO archivos (nombre_archivo, ruta_archivo, id_entregable) VALUES
      ('SRS - Documento de requerimientos.pdf', '/uploads/${PDF_EJEMPLO}', 1),
      ('Casos de uso - UML.pdf',                '/uploads/${PDF_EJEMPLO}', 2)
    `);
    console.log('✅  Archivos de entregables insertados');

    // ── EVALUACIONES (RN-016) ─────────────────────────────
    // RN-016 aplica al CREAR una evaluación (proyecto "En Revisión"). Estas
    // dos son evaluaciones históricas de una fase ya cerrada, para que la
    // supervisión del Administrador tenga calificaciones que consultar.
    await conn.execute(`
      INSERT INTO evaluaciones (calificacion, comentarios, id_entregable, id_usuario) VALUES
      (88.50, 'Requerimientos completos; mejorar la trazabilidad con los casos de uso.', 1, 2),
      (94.00, 'Diagramas claros y consistentes con el SRS.', 2, 2)
    `);
    console.log('✅  Evaluaciones insertadas');

    // ── REUNIONES ──────────────────────────────────────────
    // AMPLIADO: reuniones también para los proyectos nuevos.
    await conn.execute(`
      INSERT INTO reuniones (titulo, descripcion, fecha_reunion, lugar, id_proyecto) VALUES
      ('Seguimiento semanal Sistema Web', 'Revisión de avance del sprint actual', '${fechaHoraRelativa(3, '14:00:00')}', 'Sala virtual - Meet', 1),
      ('Kickoff App Móvil', 'Reunión inicial de planificación', '${fechaHoraRelativa(-85, '09:00:00')}', 'Bloque 5 - Sala 302', 2),
      ('Kickoff Biblioteca Digital', 'Reunión inicial de planificación del proyecto', '${fechaHoraRelativa(-40, '10:00:00')}', 'Sala virtual - Meet', 5),
      ('Seguimiento Portal de Egresados', 'Revisión de avance de la encuesta de seguimiento', '${fechaHoraRelativa(5, '15:00:00')}', 'Bloque 3 - Sala 201', 6)
    `);
    console.log('✅  Reuniones insertadas');

    // ── SOLICITUDES DE EQUIPO (NUEVO) ─────────────────────
    // Una solicitud pendiente de ejemplo, para que el panel de
    // aprobación del Administrador (en la pestaña Equipo del proyecto 1)
    // tenga algo real que mostrar desde el primer arranque.
    await conn.execute(`
      INSERT INTO solicitudes_equipo (id_equipo, id_proyecto, id_usuario_afectado, motivo, estado, id_instructor_solicita) VALUES
      (3, 1, 6, 'Bajo desempeño y ausencias reiteradas en las últimas 3 semanas.', 'Pendiente', 2)
    `);
    console.log('✅  Solicitud de equipo de ejemplo insertada');

    // ── SOLICITUDES AL ADMINISTRADOR (NUEVO) ──────────────
    // Las genera un Instructor o un Aprendiz; el Administrador las atiende
    // desde la sección "Solicitudes" de su panel de control.
    await conn.execute(`
      INSERT INTO solicitudes (id_solicitante, tipo, asunto, descripcion, id_proyecto, estado, respuesta_admin, id_admin_resuelve, fecha_solicitud, fecha_resolucion) VALUES
      (4, 'Actualización de datos', 'Corregir mi número de identificación',
          'Al registrarme digité mal un número de mi cédula. El correcto termina en 0011.', NULL, 'Pendiente', NULL, NULL, NOW() - INTERVAL 1 DAY, NULL),
      (3, 'Soporte técnico', 'No puedo adjuntar archivos de más de 10 MB',
          'Los videos de demostración de la app superan el límite. ¿Se puede ampliar o hay otra vía?', 2, 'Pendiente', NULL, NULL, NOW() - INTERVAL 3 HOUR, NULL),
      (7, 'Acceso o cuenta', 'No me llegaba el correo de recuperación',
          'Intenté restablecer mi contraseña y no recibí el enlace.', NULL, 'Atendida',
          'Se verificó el correo registrado; ya puedes solicitar el enlace de nuevo.', 1, NOW() - INTERVAL 5 DAY, NOW() - INTERVAL 4 DAY)
    `);
    console.log('✅  Solicitudes al Administrador insertadas');

    // ── GITHUB_INTEGRATION ─────────────────────────────────
    await conn.execute(`
      INSERT INTO github_integration (github_username, github_token, id_usuario) VALUES
      ('carlos-herrera-dev', 'ghp_ejemploFicticioNoUsarEnProduccion01', 4),
      ('juan-martinez-dev',  'ghp_ejemploFicticioNoUsarEnProduccion02', 5),
      ('diego-ramirez-dev',  'ghp_ejemploFicticioNoUsarEnProduccion03', 11)
    `);
    console.log('✅  Integraciones de GitHub insertadas');

    console.log('\n✅✅✅  ¡SEED COMPLETADO EXITOSAMENTE!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  👤 ${ADMIN_CORREO} → Administrador (único)`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Cuentas de demo (contraseña: Sena2026*)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  👤 laura.gomez@sgpsena.local     → Instructor');
    console.log('  👤 miguel.torres@sgpsena.local   → Instructor');
    console.log('  👤 carlos.herrera@sgpsena.local  → Aprendiz (identificación: 1098765001)');
    console.log('  👤 juan.martinez@sgpsena.local   → Aprendiz (identificación: 1098765002)');
    console.log('  👤 diego.ramirez@sgpsena.local   → Aprendiz (identificación: 1098765008)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  📊 13 usuarios · 7 proyectos · 10 fases · 12 entregables');
    console.log('  📊 15 tareas · 4 entregas · 12 mensajes · 6 repositorios');
    console.log('  📊 2 envíos de notificaciones del Administrador (pestaña "Enviadas")');
    console.log('  📊 1 solicitud de equipo pendiente de aprobar (proyecto 1, pestaña Equipo)');
    console.log('  📊 3 solicitudes al Administrador (2 pendientes) · 2 evaluaciones · 2 adjuntos PDF');
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
