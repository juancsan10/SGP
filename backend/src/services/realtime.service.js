// =====================================================
// services/realtime.service.js
// Servicio central de notificaciones en tiempo real (RF4.4 / HU-28)
// Soporta WebSocket (nativo con ws) y Server-Sent Events (SSE)
// =====================================================
const { WebSocketServer, WebSocket } = require('ws');
const jwt = require('jsonwebtoken');

// Mapa de usuarios a sockets WebSocket activos: id_usuario (Number) -> Set<WebSocket>
const wsClients = new Map();

// Mapa de usuarios a clientes SSE activos: id_usuario (Number) -> Set<res>
const sseClients = new Map();

let wss = null;

function addWsClient(userId, ws) {
  const uid = Number(userId);
  if (!wsClients.has(uid)) {
    wsClients.set(uid, new Set());
  }
  wsClients.get(uid).add(ws);
  ws.userId = uid;
}

function removeWsClient(userId, ws) {
  const uid = Number(userId);
  if (wsClients.has(uid)) {
    const set = wsClients.get(uid);
    set.delete(ws);
    if (set.size === 0) wsClients.delete(uid);
  }
}

function initWebSocketServer(server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    let authenticated = false;

    // Intentar autenticar por query parameter ?token=...
    try {
      const url = new URL(req.url, 'http://localhost');
      const token = url.searchParams.get('token');
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        addWsClient(decoded.id, ws);
        authenticated = true;
        ws.send(JSON.stringify({
          type: 'CONECTADO',
          message: 'Conexión en tiempo real establecida (SGP SENA)',
          usuario: { id: decoded.id, rol: decoded.rol }
        }));
      }
    } catch (err) {
      // Token inválido o expirado en URL
    }

    // Temporizador para autenticación por mensaje si no venía en URL
    const authTimeout = setTimeout(() => {
      if (!authenticated && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ERROR', message: 'Tiempo de autenticación expirado' }));
        ws.close(4001, 'No autenticado');
      }
    }, 5000);

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'AUTH' && msg.token) {
          const decoded = jwt.verify(msg.token, process.env.JWT_SECRET);
          addWsClient(decoded.id, ws);
          authenticated = true;
          clearTimeout(authTimeout);
          ws.send(JSON.stringify({
            type: 'CONECTADO',
            message: 'Conexión en tiempo real autenticada (SGP SENA)',
            usuario: { id: decoded.id, rol: decoded.rol }
          }));
        } else if (msg.type === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
        }
      } catch (e) {
        ws.send(JSON.stringify({ type: 'ERROR', message: 'Mensaje inválido o token no válido' }));
      }
    });

    ws.on('close', () => {
      clearTimeout(authTimeout);
      if (ws.userId) removeWsClient(ws.userId, ws);
    });

    ws.on('error', () => {
      clearTimeout(authTimeout);
      if (ws.userId) removeWsClient(ws.userId, ws);
    });
  });

  // Heartbeat para limpiar sockets huérfanos cada 30 segundos
  const interval = setInterval(() => {
    if (!wss) return;
    wss.clients.forEach(ws => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  return wss;
}

// ── Soporte SSE (Server-Sent Events) como transporte secundario ──
function registerSseClient(userId, res) {
  const uid = Number(userId);
  if (!sseClients.has(uid)) {
    sseClients.set(uid, new Set());
  }
  sseClients.get(uid).add(res);

  res.on('close', () => {
    if (sseClients.has(uid)) {
      const set = sseClients.get(uid);
      set.delete(res);
      if (set.size === 0) sseClients.delete(uid);
    }
  });
}

// ── Emisión de Notificaciones en Tiempo Real ──
function enviarNotificacionAUsuario(id_usuario, notificacion) {
  const uid = Number(id_usuario);
  const payload = JSON.stringify({
    type: 'NUEVA_NOTIFICACION',
    data: notificacion,
    timestamp: new Date().toISOString()
  });

  let socketsEnviados = 0;

  // Enviar por WebSocket
  if (wsClients.has(uid)) {
    wsClients.get(uid).forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(payload);
          socketsEnviados++;
        } catch (err) {
          // Fallo al enviar a socket
        }
      }
    });
  }

  // Enviar por SSE si hay conexiones activas
  if (sseClients.has(uid)) {
    sseClients.get(uid).forEach(res => {
      try {
        res.write(`event: notificacion\ndata: ${payload}\n\n`);
      } catch (err) {
        // Fallo en stream SSE
      }
    });
  }

  return socketsEnviados;
}

function emitirEventoUsuario(id_usuario, tipoEvento, data = {}) {
  const uid = Number(id_usuario);
  const payload = JSON.stringify({
    type: tipoEvento,
    data,
    timestamp: new Date().toISOString()
  });

  if (wsClients.has(uid)) {
    wsClients.get(uid).forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        try { ws.send(payload); } catch {}
      }
    });
  }

  if (sseClients.has(uid)) {
    sseClients.get(uid).forEach(res => {
      try { res.write(`event: ${tipoEvento.toLowerCase()}\ndata: ${payload}\n\n`); } catch {}
    });
  }
}

function getStats() {
  let totalWs = 0;
  wsClients.forEach(set => { totalWs += set.size; });
  let totalSse = 0;
  sseClients.forEach(set => { totalSse += set.size; });
  return {
    usuariosConectadosWs: wsClients.size,
    totalConexionesWs: totalWs,
    usuariosConectadosSse: sseClients.size,
    totalConexionesSse: totalSse
  };
}

module.exports = {
  initWebSocketServer,
  registerSseClient,
  enviarNotificacionAUsuario,
  emitirEventoUsuario,
  getStats
};
