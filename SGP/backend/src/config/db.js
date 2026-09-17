const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  database: process.env.DB_NAME || 'SistemaGestionProyectosSENA',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // mysql2 espera un offset UTC (p. ej. '-05:00') o 'Z', no un nombre de
  // zona horaria IANA. 'America/Bogota' generaba un warning y era ignorado.
  // Colombia no tiene horario de verano, así que el offset es fijo.
  timezone: '-05:00',
});

pool.getConnection()
  .then(conn => {
    console.log('✅ Conexión a MySQL establecida');
    conn.release();
  })
  .catch(err => {
    console.error('❌ Error conectando a MySQL:', err.message);
  });

module.exports = pool;
