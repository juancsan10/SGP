// =====================================================
// context/NotificacionesContext.jsx
// Contexto global de notificaciones en tiempo real (RF4.4 / HU-28)
// Conexión WebSocket nativa con auto-reconexión y fallback
// =====================================================
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext.jsx';
import { notificacionesService } from '../services/api.js';

const NotificacionesContext = createContext(null);

// Señal auditiva sutil y agradable al recibir una notificación en vivo (Web Audio API)
function sonarNotificacion() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // Nota Re5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // Nota La5

    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // Si la política de audio del navegador lo restringe hasta interacción, no interrumpe
  }
}

export function NotificacionesProvider({ children }) {
  const { usuario } = useAuth();
  const [notificaciones, setNotificaciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [conectado, setConectado] = useState(false);
  const [toasts, setToasts] = useState([]);
  const wsRef = useRef(null);
  const reconectarTimerRef = useRef(null);
  const intentoReconexionRef = useRef(0);

  // Cargar notificaciones desde el API REST
  const cargarNotificaciones = useCallback(async () => {
    if (!usuario?.id) return;
    try {
      setLoading(true);
      const res = await notificacionesService.getByUsuario(usuario.id);
      setNotificaciones(res.data.data || []);
    } catch (err) {
      console.warn('Error al cargar notificaciones iniciales:', err.message);
    } finally {
      setLoading(false);
    }
  }, [usuario?.id]);

  // Descartar un toast flotante
  const eliminarToast = useCallback((toastId) => {
    setToasts(prev => prev.filter(t => t.id !== toastId));
  }, []);

  // Agregar toast con auto-cierre después de 6 segundos
  const agregarToast = useCallback((notif) => {
    const toastId = `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const nuevoToast = {
      id: toastId,
      ...notif,
      timestamp: Date.now()
    };
    setToasts(prev => [nuevoToast, ...prev.slice(0, 4)]); // Máximo 5 visibles a la vez

    setTimeout(() => {
      eliminarToast(toastId);
    }, 6000);
  }, [eliminarToast]);

  // Marcar una notificación individual como leída
  const marcarLeida = useCallback(async (id) => {
    try {
      await notificacionesService.marcarLeida(id);
      setNotificaciones(prev =>
        prev.map(n => n.id_notificacion === id ? { ...n, leida: 1 } : n)
      );
    } catch (err) {
      console.error('Error al marcar leída:', err);
      throw err;
    }
  }, []);

  // Marcar todas como leídas
  const marcarTodasLeidas = useCallback(async () => {
    if (!usuario?.id) return;
    try {
      await notificacionesService.marcarTodasLeidas(usuario.id);
      setNotificaciones(prev => prev.map(n => ({ ...n, leida: 1 })));
    } catch (err) {
      console.error('Error al marcar todas leídas:', err);
      throw err;
    }
  }, [usuario?.id]);

  // Conectar WebSocket en tiempo real
  const conectarWebSocket = useCallback(() => {
    if (!usuario?.id) return;

    const token = localStorage.getItem('sgp_token');
    if (!token) return;

    // Si ya hay un WebSocket abierto o conectando, no duplicar
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const host = window.location.host;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Conectar a través del proxy de Vite (/ws) o directo al backend
    const wsUrl = `${protocol}//${host}/ws?token=${encodeURIComponent(token)}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConectado(true);
        intentoReconexionRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const mensaje = JSON.parse(event.data);

          if (mensaje.type === 'NUEVA_NOTIFICACION' && mensaje.data) {
            const nuevaNotif = mensaje.data;

            // 1. Agregar a la lista si no existe ya
            setNotificaciones(prev => {
              if (prev.some(n => n.id_notificacion === nuevaNotif.id_notificacion)) {
                return prev;
              }
              return [nuevaNotif, ...prev];
            });

            // 2. Mostrar toast flotante en pantalla
            agregarToast(nuevaNotif);

            // 3. Sonido sutil
            sonarNotificacion();
          } else if (mensaje.type === 'NOTIFICACION_LEIDA') {
            const idTarget = mensaje.data?.id_notificacion;
            setNotificaciones(prev =>
              prev.map(n => n.id_notificacion === idTarget ? { ...n, leida: 1 } : n)
            );
          } else if (mensaje.type === 'TODAS_LEIDAS') {
            setNotificaciones(prev => prev.map(n => ({ ...n, leida: 1 })));
          }
        } catch (e) {
          console.warn('Error al procesar mensaje WebSocket:', e);
        }
      };

      ws.onclose = (event) => {
        setConectado(false);
        wsRef.current = null;

        // Auto-reconexión exponencial si el usuario sigue en sesión
        if (usuario?.id && event.code !== 1000) {
          const tiempoEspera = Math.min(1000 * Math.pow(1.8, intentoReconexionRef.current), 15000);
          intentoReconexionRef.current += 1;
          clearTimeout(reconectarTimerRef.current);
          reconectarTimerRef.current = setTimeout(() => {
            conectarWebSocket();
          }, tiempoEspera);
        }
      };

      ws.onerror = () => {
        // ws.onclose se disparará y manejará la reconexión
      };
    } catch (err) {
      console.warn('Error iniciando conexión WebSocket:', err);
    }
  }, [usuario?.id, agregarToast]);

  // Efecto principal de ciclo de vida
  useEffect(() => {
    if (usuario?.id) {
      cargarNotificaciones();
      conectarWebSocket();
    } else {
      setNotificaciones([]);
      setToasts([]);
      setConectado(false);
      if (wsRef.current) {
        wsRef.current.close(1000, 'Sesión cerrada');
        wsRef.current = null;
      }
      clearTimeout(reconectarTimerRef.current);
    }

    return () => {
      clearTimeout(reconectarTimerRef.current);
      if (wsRef.current) {
        wsRef.current.close(1000, 'Componente desmontado');
        wsRef.current = null;
      }
    };
  }, [usuario?.id, cargarNotificaciones, conectarWebSocket]);

  // Conteo reactivo en vivo de no leídas
  const noLeidas = notificaciones.filter(n => !n.leida).length;

  return (
    <NotificacionesContext.Provider
      value={{
        notificaciones,
        setNotificaciones,
        noLeidas,
        conectado,
        loading,
        toasts,
        eliminarToast,
        marcarLeida,
        marcarTodasLeidas,
        recargar: cargarNotificaciones,
      }}
    >
      {children}
    </NotificacionesContext.Provider>
  );
}

export function useNotificaciones() {
  const ctx = useContext(NotificacionesContext);
  if (!ctx) throw new Error('useNotificaciones debe usarse dentro de <NotificacionesProvider>');
  return ctx;
}
