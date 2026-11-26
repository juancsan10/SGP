require('dotenv').config();
const { assertEnv } = require('./src/config/env');
try { assertEnv(); } catch (e) { process.exit(1); } // fail-fast con mensaje claro
const http = require('http');
const app = require('./src/app');
const db = require('./src/config/db');
const { runExpirationAlerts } = require('./src/services/alerts.service');
const { initWebSocketServer } = require('./src/services/realtime.service');

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

// Inicializar el servidor WebSocket en la ruta /ws (RF4.4 / HU-28)
initWebSocketServer(server);

server.listen(PORT, () => {
  console.log(`🚀 SGP API en http://localhost:${PORT}`);
  console.log(`🔌 WebSocket servidor en ws://localhost:${PORT}/ws`);
  runExpirationAlerts().catch(console.error);
  setInterval(() => runExpirationAlerts().catch(console.error), 60 * 60 * 1000);
});
