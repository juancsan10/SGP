// =====================================================
// pages/NotificacionesPage.jsx
// Gestión de notificaciones del usuario en sesión.
// Administrador: además puede crear notificaciones para
// un usuario puntual o un rol completo, con tipo y
// prioridad (NUEVO).
// =====================================================
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { notificacionesService } from '../services/api.js';
import { LoadingCenter, EmptyState, Pagination } from '../components/helpers.jsx';

const LIMITE = 10; // NUEVO: tamaño de página

export default function NotificacionesPage() {
  const { usuario, esAdmin } = useAuth();
  const [notifs,  setNotifs]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [offset,  setOffset]  = useState(0); // NUEVO: paginación

  // NUEVO — solo Administrador: crear notificación
  const [modalCrear, setModalCrear] = useState(false);
  const [form, setForm] = useState({ titulo: '', mensaje: '', tipo: 'informativo', prioridad: 'Media', rol_destino: 'Aprendiz' });
  const [enviando, setEnviando] = useState(false);
  const [errorCrear, setErrorCrear] = useState('');
  const [okCrear, setOkCrear] = useState('');

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

  async function enviarBroadcast(e) {
    e.preventDefault(); setEnviando(true); setErrorCrear(''); setOkCrear('');
    try {
      const r = await notificacionesService.broadcast(form);
      setOkCrear(r.data.message || 'Notificación enviada');
      setForm({ titulo: '', mensaje: '', tipo: 'informativo', prioridad: 'Media', rol_destino: 'Aprendiz' });
      setTimeout(() => { setModalCrear(false); setOkCrear(''); }, 1200);
      await cargar();
    } catch (err) {
      setErrorCrear(err.response?.data?.message || 'No se pudo enviar la notificación');
    } finally {
      setEnviando(false);
    }
  }

  const noLeidas = notifs.filter(n => !n.leida).length;
  const notifsPagina = notifs.slice(offset, offset + LIMITE); // NUEVO: página actual

  const tipoIcon = {
    mensaje: '💬',
    tarea:   '✅',
    sistema: '⚙️',
    mantenimiento: '🛠️',
    advertencia: '⚠️',
    informativo: 'ℹ️',
  };

  // NUEVO: semáforo de prioridad
  const prioridadColor = { Alta: 'var(--red-600)', Media: 'var(--amber-500)', Baja: 'var(--slate-400)' };

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
        <div className="page-header-right" style={{ display:'flex', gap:10 }}>
          {esAdmin && (
            <button className="btn btn-primary" onClick={() => { setErrorCrear(''); setOkCrear(''); setModalCrear(true); }}>
              + Nueva notificación
            </button>
          )}
          {noLeidas > 0 && (
            <button className="btn btn-secondary" onClick={marcarTodasLeidas}>
              ✓ Marcar todas como leídas
            </button>
          )}
        </div>
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
            {notifsPagina.map(n => (
              <div
                key={n.id_notificacion}
                className="card"
                style={{
                  borderLeft: `3px solid ${n.leida ? 'transparent' : (prioridadColor[n.prioridad] || 'var(--green-500)')}`,
                  background: n.leida ? 'var(--white)' : 'var(--green-50)',
                }}
              >
                <div style={{ padding:'14px 18px', display:'flex', alignItems:'center', gap:14 }}>
                  <div style={{ fontSize:24 }}>{tipoIcon[n.tipo] || '🔔'}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
                      <span style={{ fontWeight: n.leida ? 500 : 700, fontSize:14, color:'var(--slate-900)' }}>
                        {n.titulo}
                      </span>
                      {n.prioridad && n.prioridad !== 'Media' && (
                        <span className={`badge ${n.prioridad === 'Alta' ? 'badge-red' : 'badge-slate'}`}>{n.prioridad}</span>
                      )}
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
        {/* NUEVO: paginación numerada */}
        <Pagination total={notifs.length} limit={LIMITE} offset={offset} onChange={setOffset} />
      </div>

      {/* NUEVO — solo Administrador: crear notificación para un rol o usuario */}
      {modalCrear && (
        <div className="modal-overlay" onClick={() => setModalCrear(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Nueva notificación</span>
              <button className="modal-close" onClick={() => setModalCrear(false)}>×</button>
            </div>
            <form onSubmit={enviarBroadcast}>
              <div className="modal-body">
                {errorCrear && <div className="alert alert-error">{errorCrear}</div>}
                {okCrear && <div className="alert alert-success">{okCrear}</div>}

                <div className="form-group">
                  <label className="form-label">Destinatarios *</label>
                  <select className="form-select" value={form.rol_destino}
                    onChange={e => setForm({ ...form, rol_destino: e.target.value })}>
                    <option value="Aprendiz">Todos los aprendices</option>
                    <option value="Instructor">Todos los instructores</option>
                    <option value="Todos">Aprendices e instructores</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Título *</label>
                  <input className="form-input" value={form.titulo}
                    onChange={e => setForm({ ...form, titulo: e.target.value })} required maxLength={150} />
                </div>

                <div className="form-group">
                  <label className="form-label">Mensaje *</label>
                  <textarea className="form-textarea" value={form.mensaje}
                    onChange={e => setForm({ ...form, mensaje: e.target.value })} required />
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div className="form-group">
                    <label className="form-label">Tipo</label>
                    <select className="form-select" value={form.tipo}
                      onChange={e => setForm({ ...form, tipo: e.target.value })}>
                      <option value="informativo">ℹ️ Informativo</option>
                      <option value="mantenimiento">🛠️ Mantenimiento</option>
                      <option value="advertencia">⚠️ Advertencia (incumplimiento)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Prioridad</label>
                    <select className="form-select" value={form.prioridad}
                      onChange={e => setForm({ ...form, prioridad: e.target.value })}>
                      <option value="Baja">🟢 Baja</option>
                      <option value="Media">🟡 Media</option>
                      <option value="Alta">🔴 Alta</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalCrear(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={enviando}>
                  {enviando ? 'Enviando…' : 'Enviar notificación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
