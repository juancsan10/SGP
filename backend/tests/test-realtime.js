// =====================================================
// test-realtime.js
// Verificación automatizada de actualización en tiempo real (RF4.4 / HU-28)
// =====================================================
const WebSocket = require('ws');

async function run() {
  console.log('🧪 [TEST 1] Autenticando Aprendiz y Administrador...');

  // 1. Login Aprendiz
  const loginAprendizRes = await fetch('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo: 'carlos.herrera@sgpsena.local', contrasena: 'Sena2026*' })
  });
  const dataAprendiz = await loginAprendizRes.json();
  if (!dataAprendiz.success) throw new Error('Fallo login Aprendiz: ' + JSON.stringify(dataAprendiz));
  const tokenAprendiz = dataAprendiz.data.token;
  const userAprendiz = dataAprendiz.data.usuario;
  console.log(`✅ Aprendiz autenticado: ID ${userAprendiz.id} (${userAprendiz.nombres} ${userAprendiz.apellidos})`);

  // 2. Login Admin
  const loginAdminRes = await fetch('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo: 'rubiel.tads@gmail.com', contrasena: 'ELruby2oo4@' })
  });
  const dataAdmin = await loginAdminRes.json();
  if (!dataAdmin.success) throw new Error('Fallo login Admin: ' + JSON.stringify(dataAdmin));
  const tokenAdmin = dataAdmin.data.token;
  console.log(`✅ Administrador autenticado: ID ${dataAdmin.data.usuario.id}`);

  // 3. Conectar WebSocket del Aprendiz
  console.log('\n🔌 [TEST 2] Estableciendo conexión WebSocket para el Aprendiz...');
  const wsUrl = `ws://localhost:3000/ws?token=${encodeURIComponent(tokenAprendiz)}`;
  const ws = new WebSocket(wsUrl);

  const conexionPromise = new Promise((resolve, reject) => {
    ws.on('open', () => {
      console.log('✅ WebSocket del Aprendiz ABIERTO en ws://localhost:3000/ws');
    });

    ws.on('message', (msg) => {
      const parsed = JSON.parse(msg.toString());
      if (parsed.type === 'CONECTADO') {
        console.log(`✅ Evento recibido del servidor: CONECTADO para usuario ${parsed.usuario?.id}`);
        resolve();
      }
    });

    ws.on('error', reject);
    setTimeout(() => reject(new Error('Timeout esperando conexión WS')), 4000);
  });

  await conexionPromise;

  // 4. Preparar escucha de notificación en tiempo real
  console.log('\n📡 [TEST 3] Admin envía notificación broadcast en tiempo real...');
  const tituloPrueba = `Alerta en Tiempo Real #${Date.now()}`;
  const mensajePrueba = `Esta es una prueba de verificación automática para HU-28 sin recargar. Timestamp: ${new Date().toISOString()}`;

  let notificacionRecibida = null;
  const notificacionPromise = new Promise((resolve, reject) => {
    ws.on('message', (msg) => {
      try {
        const parsed = JSON.parse(msg.toString());
        if (parsed.type === 'NUEVA_NOTIFICACION' && parsed.data?.titulo === tituloPrueba) {
          notificacionRecibida = parsed.data;
          console.log('🎉 ¡NOTIFICACIÓN EN TIEMPO REAL RECIBIDA POR WEBSOCKET SIN RECARGAR!');
          console.log(`   - ID Notificación: ${notificacionRecibida.id_notificacion}`);
          console.log(`   - Título: ${notificacionRecibida.titulo}`);
          console.log(`   - Mensaje: ${notificacionRecibida.mensaje}`);
          console.log(`   - Prioridad: ${notificacionRecibida.prioridad}`);
          console.log(`   - Tipo: ${notificacionRecibida.tipo}`);
          resolve(notificacionRecibida);
        }
      } catch (e) {}
    });

    setTimeout(() => reject(new Error('Timeout: La notificación no llegó por WebSocket en 5s')), 5000);
  });

  // El Admin dispara el broadcast
  const broadcastRes = await fetch('http://localhost:3000/api/v1/notificaciones/broadcast', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tokenAdmin}`
    },
    body: JSON.stringify({
      titulo: tituloPrueba,
      mensaje: mensajePrueba,
      tipo: 'sistema',
      prioridad: 'Alta',
      rol_destino: 'Aprendiz'
    })
  });
  const broadcastData = await broadcastRes.json();
  console.log(`   - Respuesta API broadcast: ${JSON.stringify(broadcastData)}`);

  // Esperar a que llegue al socket del aprendiz
  const notif = await notificacionPromise;
  if (!notif) throw new Error('No se recibió la notificación en tiempo real');

  // 5. Test sincronización al marcar leída
  console.log('\n👁️ [TEST 4] Verificando evento en tiempo real al marcar leída...');
  const leidaPromise = new Promise((resolve, reject) => {
    ws.on('message', (msg) => {
      try {
        const parsed = JSON.parse(msg.toString());
        if (parsed.type === 'NOTIFICACION_LEIDA' && parsed.data?.id_notificacion === notif.id_notificacion) {
          console.log(`✅ Evento NOTIFICACION_LEIDA recibido en tiempo real para ID ${notif.id_notificacion}`);
          resolve();
        }
      } catch (e) {}
    });
    setTimeout(() => reject(new Error('Timeout esperando evento NOTIFICACION_LEIDA')), 4000);
  });

  // Aprendiz marca leída
  await fetch(`http://localhost:3000/api/v1/notificaciones/${notif.id_notificacion}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${tokenAprendiz}`
    }
  });

  await leidaPromise;

  ws.close();
  console.log('\n🏆 ¡TODAS LAS PRUEBAS DE TIEMPO REAL HU-28 PASARON CON 100% DE ÉXITO!');
  process.exit(0);
}

run().catch(err => {
  console.error('\n❌ ERROR EN LA VERIFICACIÓN DE TIEMPO REAL:', err);
  process.exit(1);
});
