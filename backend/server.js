require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════════════╗
  ║    🎓  SISTEMA G.P.S – Gestión de Proyectos SENA    ║
  ║    🚀  Servidor corriendo en http://localhost:${PORT}  ║
  ║    📡  API Base: http://localhost:${PORT}/api/v1      ║
  ╚══════════════════════════════════════════════════════╝
  `);
});
