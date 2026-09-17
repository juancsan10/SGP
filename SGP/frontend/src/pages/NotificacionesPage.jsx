// =====================================================
// pages/NotificacionesPage.jsx
// Gestión de notificaciones del usuario en sesión
// =====================================================
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { notificacionesService } from '../services/api.js';
import { LoadingCenter, EmptyState } from '../components/helpers.jsx';

export default function NotificacionesPage() {
  const { usuario } = useAuth();
  const [notifs,  setNotifs]  = useState([]);
  const [loading, setLoading] = useState(true);

  async function cargar() {
    try {
      const r = await notificacionesService.getByUsuario(usuario.id);
      setNotifs(r.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { cargar(); }, [usuario.id]);

  async function marcarLeida(id) {
    try {
      await notificacionesService.marcarLeida(id);
      setNotifs(prev => prev.map(n => n.id_notificacion === id ? { ...n, leida: 1 } : n));
    } catch (err) { console.error(err); }
  }

  async function marcarTodasLeidas() {
    try {
      await notificacionesService.marcarTodasLeidas(usuario.id);
      setNotifs(prev => prev.map(n => ({ ...n, leida: 1 })));
    } catch (err) { console.error(err); }
  }

  const noLeidas = notifs.filter(n => !n.leida).length;

  const tipoIcon = {
    mensaje: '💬',
    tarea:   '✅',
    sistema: '⚙️',
  };

  if (loading) return (
    <div>
      <div className="page-header"><div className="page-header-left"><h1 className="page-title">Notificaciones</h1></div></div>
      <LoadingCenter />
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Notificaciones</h1>
          <p className="page-subtitle">
            {noLeidas > 0 ? `${noLeidas} sin leer` : 'Todo leído'}
          </p>
        </div>
        {noLeidas > 0 && (
          <button className="btn btn-secondary" onClick={marcarTodasLeidas}>
            ✓ Marcar todas como leídas
          </button>
        )}
      </div>

      <div className="page-body">
        {notifs.length === 0 ? (
          <EmptyState
            icon="🔔"
            titulo="Sin notificaciones"
            desc="Aquí aparecerán tus alertas de tareas y mensajes."
          />
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {notifs.map(n => (
              <div
                key={n.id_notificacion}
                className="card"
                style={{
                  borderLeft: n.leida ? undefined : '3px solid var(--green-500)',
                  background: n.leida ? 'var(--white)' : 'var(--green-50)',
                }}
              >
                <div style={{ padding:'14px 18px', display:'flex', alignItems:'center', gap:14 }}>
                  <div style={{ fontSize:24 }}>{tipoIcon[n.tipo] || '🔔'}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight: n.leida ? 500 : 700, fontSize:14, color:'var(--slate-900)', marginBottom:2 }}>
                      {n.titulo}
                    </div>
                    {n.mensaje && (
                      <div style={{ fontSize:13, color:'var(--slate-600)' }}>{n.mensaje}</div>
                    )}
                    <div style={{ fontSize:11, color:'var(--slate-400)', marginTop:4 }}>
                      {new Date(n.fecha_envio).toLocaleString('es-CO')}
                    </div>
                  </div>
                  <div style={{ flexShrink:0 }}>
                    {n.leida ? (
                      <span className="badge badge-slate">Leída</span>
                    ) : (
                      <button className="btn btn-secondary btn-sm" onClick={() => marcarLeida(n.id_notificacion)}>
                        Marcar leída
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
