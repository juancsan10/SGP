// Validación de variables de entorno al arrancar (fail-fast).
// Reúne TODOS los problemas en una sola pasada para que quien despliega
// corrija todo de una vez, en vez de descubrirlos uno por uno.
// Siempre obligatoria: JWT_SECRET. El resto es obligatoria en producción
// (en desarrollo db.js y app.js tienen valores por defecto).
const SIEMPRE = ['JWT_SECRET'];
const PRODUCCION = ['DB_HOST', 'DB_NAME', 'DB_USER', 'FRONTEND_URL'];
const REQUERIDAS = [...SIEMPRE, ...PRODUCCION];

function validateEnv(env = process.env) {
  const errores = [];
  const avisos = [];
  const produccion = env.NODE_ENV === 'production';
  const usaUrl = Boolean(env.DATABASE_URL);

  for (const k of produccion ? REQUERIDAS : SIEMPRE) {
    if (usaUrl && k.startsWith('DB_')) continue; // DATABASE_URL reemplaza a DB_*
    if (!env[k]) errores.push(`Falta la variable obligatoria ${k}`);
  }
  if (produccion && !usaUrl && !env.DB_PASSWORD) errores.push('Falta la variable obligatoria DB_PASSWORD (en producción)');
  if (env.JWT_SECRET && env.JWT_SECRET.length < 32) {
    (produccion ? errores : avisos).push('JWT_SECRET debería tener al menos 32 caracteres');
  }
  if (env.MAIL_MODE === 'smtp') {
    for (const k of ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS']) {
      if (!env[k]) errores.push(`MAIL_MODE=smtp requiere ${k}`);
    }
  }
  if (produccion && env.MAIL_MODE !== 'smtp') avisos.push('MAIL_MODE no es smtp: los códigos de recuperación no se enviarán por correo');
  return { errores, avisos, produccion };
}

// Llamar al arrancar el servidor: imprime estado y termina con código 1 si hay errores.
function assertEnv(env = process.env, log = console) {
  const { errores, avisos, produccion } = validateEnv(env);
  avisos.forEach(a => log.warn(`⚠️  ${a}`));
  if (errores.length) {
    log.error(`❌ Configuración inválida (${produccion ? 'production' : env.NODE_ENV || 'development'}):`);
    errores.forEach(e => log.error(`   - ${e}`));
    log.error('   Copia .env.example a .env y complétalo. Ver README, sección «Variables de entorno».');
    throw new Error(`Configuración inválida: ${errores.length} problema(s)`);
  }
  log.log(`✅ Variables de entorno validadas (${env.NODE_ENV || 'development'})`);
}

module.exports = { validateEnv, assertEnv, REQUERIDAS };
