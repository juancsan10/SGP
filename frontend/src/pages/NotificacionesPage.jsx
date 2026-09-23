// =====================================================
// pages/NotificacionesPage.jsx
// Gestión de notificaciones del usuario en sesión.
// Administrador: además puede crear notificaciones para
// un usuario puntual o un rol completo, con tipo y
// prioridad, y ver un historial de lo que él mismo ha
// enviado (NUEVO — pestaña "Enviadas").
// =====================================================
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { notificacionesService } from '../services/api.js';
import { LoadingCenter, EmptyState, Pagination } from '../components/helpers.jsx';

const LIMITE = 10; // NUEVO: tamaño de página

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

export default function NotificacionesPage() {
  const { usuario, esAdmin } = useAuth();
  const [tab, setTab] = useState('recibidas'); // NUEVO: 'recibidas' | 'enviadas' (solo Admin)

  const [notifs,  setNotifs]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [offset,  setOffset]  = useState(0); // NUEVO: paginación
  const [errorLista, setErrorLista] = useState(''); // NUEVO: aviso visible si falla cargar o marcar como leída

  // NUEVO — solo Administrador: notificaciones que él mismo ha enviado
  const [enviadas, setEnviadas] = useState([]);
  const [metaEnviadas, setMetaEnviadas] = useState({ total: 0, limit: LIMITE, offset: 0 });
  const [offsetEnviadas, setOffsetEnviadas] = useState(0);
  const [loadingEnviadas, setLoadingEnviadas] = useState(false);
  const [errorEnviadas, setErrorEnviadas] = useState('');

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
      setErrorLista(err.response?.data?.message || 'No se pudieron cargar las notificaciones');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { cargar(); }, [usuario.id]);

  // NUEVO: carga la pestaña "Enviadas" solo cuando el Admin la abre.
  async function cargarEnviadas() {
    setLoadingEnviadas(true); setErrorEnviadas('');
    try {
      const r = await notificacionesService.getEnviadas({ limit: LIMITE, offset: offsetEnviadas });
      setEnviadas(r.data.data || []);
      setMetaEnviadas(r.data.meta || { total: 0, limit: LIMITE, offset: 0 });
    } catch (err) {
      setErrorEnviadas(err.response?.data?.message || 'No se pudieron cargar tus notificaciones enviadas');
    } finally {
      setLoadingEnviadas(false);
    }
  }
  useEffect(() => { if (esAdmin && tab === 'enviadas') cargarEnviadas(); }, [tab, offsetEnviadas]); // eslint-disable-line

  async function marcarLeida(id) {
    setErrorLista('');
    try {
      await notificacionesService.marcarLeida(id);
      setNotifs(prev => prev.map(n => n.id_notificacion === id ? { ...n, leida: 1 } : n));
    } catch (err) {
      // NUEVO: antes esto fallaba en silencio — el botón "Marcar leída"
      // no daba ninguna señal de que algo salió mal.
      setErrorLista(err.response?.data?.message || 'No se pudo marcar como leída');
    }
  }

  async function marcarTodasLeidas() {
    setErrorLista('');
    try {
      await notificacionesService.marcarTodasLeidas(usuario.id);
      setNotifs(prev => prev.map(n => ({ ...n, leida: 1 })));
    } catch (err) {
      setErrorLista(err.response?.data?.message || 'No se pudieron marcar todas como leídas');
    }
  }

  async function enviarBroadcast(e) {
    e.preventDefault(); setEnviando(true); setErrorCrear(''); setOkCrear('');
    try {
      const r = await notificacionesService.broadcast(form);
      setOkCrear(r.data.message || 'Notificación enviada');
      setForm({ titulo: '', mensaje: '', tipo: 'informativo', prioridad: 'Media', rol_destino: 'Aprendiz' });
      setTimeout(() => { setModalCrear(false); setOkCrear(''); }, 1200);
      await cargar();
      // NUEVO: si el Admin ya está viendo "Enviadas", refresca esa lista también.
      if (tab === 'enviadas') { setOffsetEnviadas(0); await cargarEnviadas(); }
    } catch (err) {
      setErrorCrear(err.response?.data?.message || 'No se pudo enviar la notificación');
    } finally {
      setEnviando(false);
    }
  }

  const noLeidas = notifs.filter(n => !n.leida).length;
  const notifsPagina = notifs.slice(offset, offset + LIMITE); // NUEVO: página actual

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
            {tab === 'recibidas'
              ? (noLeidas > 0 ? `${noLeidas} sin leer` : 'Todo leído')
              : `${metaEnviadas.total} envío(s) realizados`}
          </p>
        </div>
        <div className="page-header-right" style={{ display:'flex', gap:10 }}>
          {esAdmin && (
            <button className="btn btn-primary" onClick={() => { setErrorCrear(''); setOkCrear(''); setModalCrear(true); }}>
              + Nueva notificación
            </button>
          )}
          {tab === 'recibidas' && noLeidas > 0 && (
            <button className="btn btn-secondary" onClick={marcarTodasLeidas}>
              ✓ Marcar todas como leídas
            </button>
          )}
        </div>
      </div>

      {/* NUEVO — solo Administrador: pestañas Recibidas / Enviadas */}
      {esAdmin && (
        <div style={{ display:'flex', gap:4, padding:'0 28px', borderBottom:'1px solid var(--slate-200)', background:'var(--white)' }}>
          <button
            onClick={() => setTab('recibidas')}
            className="btn btn-ghost"
            style={{ borderRadius:0, borderBottom: tab==='recibidas' ? '2px solid var(--role-primary, var(--green-600))' : '2px solid transparent', fontWeight: tab==='recibidas' ? 700 : 500 }}
          >
            Recibidas
          </button>
          <button
            onClick={() => setTab('enviadas')}
            className="btn btn-ghost"
            style={{ borderRadius:0, borderBottom: tab==='enviadas' ? '2px solid var(--role-primary, var(--green-600))' : '2px solid transparent', fontWeight: tab==='enviadas' ? 700 : 500 }}
          >
            Enviadas por mí
          </button>
        </div>
      )}

      <div className="page-body">
        {tab === 'recibidas' ? (
          <>
            {/* NUEVO: aviso visible si falla cargar o marcar como leída */}
            {errorLista && <div className="alert alert-error" style={{ marginBottom: 16 }}>{errorLista}</div>}

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
          </>
        ) : (
          // NUEVO — pestaña "Enviadas por mí"
          <>
            {errorEnviadas && <div className="alert alert-error" style={{ marginBottom: 16 }}>{errorEnviadas}</div>}
            {loadingEnviadas ? <LoadingCenter /> : enviadas.length === 0 ? (
              <EmptyState
                icon="📤"
                titulo="Aún no has enviado ninguna notificación"
                desc="Usa '+ Nueva notificación' para avisar a aprendices o instructores."
              />
            ) : (
              <>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {enviadas.map(n => (
                    <div key={n.id_notificacion} className="card" style={{ borderLeft: `3px solid ${prioridadColor[n.prioridad] || 'var(--slate-300)'}` }}>
                      <div style={{ padding:'14px 18px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                          <span style={{ fontSize:18 }}>{tipoIcon[n.tipo] || '🔔'}</span>
                          <span style={{ fontWeight:700, fontSize:14 }}>{n.titulo}</span>
                          {n.prioridad && n.prioridad !== 'Media' && (
                            <span className={`badge ${n.prioridad === 'Alta' ? 'badge-red' : 'badge-slate'}`}>{n.prioridad}</span>
                          )}
                          <span className="badge badge-blue">
                            {n.total_leidas} de {n.total_destinatarios} leídas
                          </span>
                        </div>
                        {n.mensaje && <div style={{ fontSize:13, color:'var(--slate-600)', marginBottom:6 }}>{n.mensaje}</div>}
                        <div style={{ fontSize:11, color:'var(--slate-500)' }}>
                          Para: {n.destinatarios}
                        </div>
                        <div style={{ fontSize:11, color:'var(--slate-400)', marginTop:4 }}>
                          {new Date(n.fecha_envio).toLocaleString('es-CO')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <Pagination total={metaEnviadas.total} limit={metaEnviadas.limit} offset={metaEnviadas.offset} onChange={setOffsetEnviadas} />
              </>
            )}
          </>
        )}
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
