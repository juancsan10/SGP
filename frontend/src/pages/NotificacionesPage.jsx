// =====================================================
// pages/NotificacionesPage.jsx
// Gestión de notificaciones en tiempo real (RF4.4 / HU-28)
// Actualización automática sin recargar vía WebSocket nativo
// =====================================================
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotificaciones } from '../context/NotificacionesContext.jsx';
import { notificacionesService } from '../services/api.js';
import { LoadingCenter, EmptyState, Pagination } from '../components/helpers.jsx';

const LIMITE = 10; // Tamaño de página

const tipoIcon = {
  mensaje: '💬',
  tarea:   '✅',
  sistema: '⚙️',
  mantenimiento: '🛠️',
  advertencia: '⚠️',
  informativo: 'ℹ️',
  vencimiento: '⏰',
};

const prioridadColor = {
  Alta: 'var(--red-600)',
  Media: 'var(--amber-500)',
  Baja: 'var(--slate-400)'
};

export default function NotificacionesPage() {
  const { usuario, esAdmin } = useAuth();
  const {
    notificaciones: notifs,
    noLeidas,
    conectado,
    loading: loadingContext,
    marcarLeida: marcarLeidaCtx,
    marcarTodasLeidas: marcarTodasCtx,
    recargar
  } = useNotificaciones();

  const [tab, setTab] = useState('recibidas'); // 'recibidas' | 'enviadas' (solo Admin)
  const [offset, setOffset] = useState(0); // Paginación
  const [errorLista, setErrorLista] = useState('');

  // Solo Administrador: notificaciones que él mismo ha enviado
  const [enviadas, setEnviadas] = useState([]);
  const [metaEnviadas, setMetaEnviadas] = useState({ total: 0, limit: LIMITE, offset: 0 });
  const [offsetEnviadas, setOffsetEnviadas] = useState(0);
  const [loadingEnviadas, setLoadingEnviadas] = useState(false);
  const [errorEnviadas, setErrorEnviadas] = useState('');

  // Solo Administrador: modal para crear notificación
  const [modalCrear, setModalCrear] = useState(false);
  const [form, setForm] = useState({ titulo: '', mensaje: '', tipo: 'informativo', prioridad: 'Media', rol_destino: 'Aprendiz' });
  const [enviando, setEnviando] = useState(false);
  const [errorCrear, setErrorCrear] = useState('');
  const [okCrear, setOkCrear] = useState('');

  // Carga la pestaña "Enviadas" solo cuando el Admin la abre
  async function cargarEnviadas() {
    setLoadingEnviadas(true);
    setErrorEnviadas('');
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

  useEffect(() => {
    if (esAdmin && tab === 'enviadas') cargarEnviadas();
  }, [tab, offsetEnviadas]); // eslint-disable-line

  async function handleMarcarLeida(id) {
    setErrorLista('');
    try {
      await marcarLeidaCtx(id);
    } catch (err) {
      setErrorLista(err.response?.data?.message || 'No se pudo marcar como leída');
    }
  }

  async function handleMarcarTodasLeidas() {
    setErrorLista('');
    try {
      await marcarTodasCtx();
    } catch (err) {
      setErrorLista(err.response?.data?.message || 'No se pudieron marcar todas como leídas');
    }
  }

  async function enviarBroadcast(e) {
    e.preventDefault();
    setEnviando(true);
    setErrorCrear('');
    setOkCrear('');
    try {
      const r = await notificacionesService.broadcast(form);
      setOkCrear(r.data.message || 'Notificación enviada en tiempo real');
      setForm({ titulo: '', mensaje: '', tipo: 'informativo', prioridad: 'Media', rol_destino: 'Aprendiz' });
      setTimeout(() => {
        setModalCrear(false);
        setOkCrear('');
      }, 1200);

      // Si el Admin también es destinatario o si está viendo Enviadas, refresca
      await recargar();
      if (tab === 'enviadas') {
        setOffsetEnviadas(0);
        await cargarEnviadas();
      }
    } catch (err) {
      setErrorCrear(err.response?.data?.message || 'No se pudo enviar la notificación');
    } finally {
      setEnviando(false);
    }
  }

  const notifsPagina = notifs.slice(offset, offset + LIMITE);

  if (loadingContext && notifs.length === 0) {
    return (
      <div>
        <div className="page-header">
          <div className="page-header-left">
            <h1 className="page-title">Notificaciones</h1>
          </div>
        </div>
        <LoadingCenter />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 className="page-title">Notificaciones</h1>
            <span
              className="live-indicator"
              id="live-status-badge"
              title={conectado ? 'Conectado al servidor WebSocket. Las notificaciones se actualizan automáticamente.' : 'Reconectando WebSocket...'}
            >
              <span
                className="live-indicator-dot"
                style={{ background: conectado ? '#10b981' : '#f59e0b' }}
              />
              {conectado ? 'Tiempo real activo' : 'Conectando…'}
            </span>
          </div>
          <p className="page-subtitle" id="notif-subtitle">
            {tab === 'recibidas'
              ? (noLeidas > 0 ? `${noLeidas} sin leer (actualización automática)` : 'Todo leído · Al día')
              : `${metaEnviadas.total} envío(s) realizados`}
          </p>
        </div>
        <div className="page-header-right" style={{ display: 'flex', gap: 10 }}>
          {esAdmin && (
            <button
              className="btn btn-primary"
              id="btn-nueva-notificacion"
              onClick={() => { setErrorCrear(''); setOkCrear(''); setModalCrear(true); }}
            >
              + Nueva notificación
            </button>
          )}
          {tab === 'recibidas' && noLeidas > 0 && (
            <button
              className="btn btn-secondary"
              id="btn-marcar-todas"
              onClick={handleMarcarTodasLeidas}
            >
              ✓ Marcar todas como leídas
            </button>
          )}
        </div>
      </div>

      {/* Solo Administrador: pestañas Recibidas / Enviadas */}
      {esAdmin && (
        <div style={{ display: 'flex', gap: 4, padding: '0 28px', borderBottom: '1px solid var(--slate-200)', background: 'var(--white)' }}>
          <button
            onClick={() => setTab('recibidas')}
            className="btn btn-ghost"
            id="tab-recibidas"
            style={{
              borderRadius: 0,
              borderBottom: tab === 'recibidas' ? '2px solid var(--role-primary, var(--green-600))' : '2px solid transparent',
              fontWeight: tab === 'recibidas' ? 700 : 500
            }}
          >
            Recibidas ({notifs.length})
          </button>
          <button
            onClick={() => setTab('enviadas')}
            className="btn btn-ghost"
            id="tab-enviadas"
            style={{
              borderRadius: 0,
              borderBottom: tab === 'enviadas' ? '2px solid var(--role-primary, var(--green-600))' : '2px solid transparent',
              fontWeight: tab === 'enviadas' ? 700 : 500
            }}
          >
            Enviadas por mí
          </button>
        </div>
      )}

      {errorLista && (
        <div style={{ padding: '12px 28px' }}>
          <div className="alert alert-danger" role="alert">{errorLista}</div>
        </div>
      )}

      {/* ── PESTAÑA: RECIBIDAS (En vivo) ── */}
      {tab === 'recibidas' && (
        <div className="content-area" id="notificaciones-container">
          {notifs.length === 0 ? (
            <EmptyState
              icono="🔔"
              titulo="Sin notificaciones"
              desc="Te avisaremos al instante cuando te asignen tareas, agenden reuniones o recibas mensajes nuevos."
            />
          ) : (
            <>
              <div
                id="notificaciones-list"
                style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
              >
                {notifsPagina.map(n => {
                  const icono = tipoIcon[n.tipo] || '🔔';
                  const colorBorde = prioridadColor[n.prioridad] || 'var(--slate-300)';
                  return (
                    <div
                      key={n.id_notificacion}
                      id={`notif-${n.id_notificacion}`}
                      className={`card ${n.leida ? '' : 'notif-card-new'}`}
                      style={{
                        borderLeft: `4px solid ${colorBorde}`,
                        background: n.leida ? 'var(--white)' : 'var(--slate-50, #f8fafc)',
                        transition: 'all 0.3s ease',
                      }}
                    >
                      <div className="card-body" style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                        <span style={{ fontSize: 24, lineHeight: 1 }}>{icono}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                            <span style={{ fontWeight: n.leida ? 600 : 700, fontSize: 14, color: 'var(--slate-900)' }}>
                              {n.titulo}
                            </span>
                            <span className={`badge ${n.prioridad === 'Alta' ? 'badge-red' : 'badge-slate'}`}>
                              {n.prioridad}
                            </span>
                            {!n.leida && (
                              <span className="badge badge-blue" style={{ fontSize: 10 }}>
                                Nueva
                              </span>
                            )}
                          </div>
                          <p style={{ margin: '0 0 6px', color: 'var(--slate-700)', fontSize: 13, lineHeight: 1.45 }}>
                            {n.mensaje}
                          </p>
                          <span style={{ fontSize: 11, color: 'var(--slate-500)' }}>
                            {new Date(n.fecha_envio).toLocaleString('es-CO')}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {n.leida ? (
                            <span className="badge badge-slate">Leída</span>
                          ) : (
                            <button
                              className="btn btn-secondary btn-sm"
                              id={`btn-leer-${n.id_notificacion}`}
                              onClick={() => handleMarcarLeida(n.id_notificacion)}
                            >
                              Marcar leída
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {notifs.length > LIMITE && (
                <Pagination
                  total={notifs.length}
                  limit={LIMITE}
                  offset={offset}
                  onChange={setOffset}
                />
              )}
            </>
          )}
        </div>
      )}

      {/* ── PESTAÑA: ENVIADAS (solo Admin) ── */}
      {esAdmin && tab === 'enviadas' && (
        <div className="content-area">
          {errorEnviadas && <div className="alert alert-danger">{errorEnviadas}</div>}
          {loadingEnviadas ? (
            <LoadingCenter />
          ) : enviadas.length === 0 ? (
            <EmptyState
              icono="📤"
              titulo="Aún no has enviado ninguna notificación"
              desc="Usa '+ Nueva notificación' para avisar a aprendices o instructores en tiempo real."
            />
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {enviadas.map(n => (
                  <div key={n.id_notificacion} className="card" style={{ borderLeft: `3px solid ${prioridadColor[n.prioridad] || 'var(--slate-300)'}` }}>
                    <div className="card-body" style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 24, lineHeight: 1 }}>{tipoIcon[n.tipo] || '🔔'}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>{n.titulo}</span>
                          <span className={`badge ${n.prioridad === 'Alta' ? 'badge-red' : 'badge-slate'}`}>{n.prioridad}</span>
                          <span className="badge badge-blue">
                            {n.total_leidas} de {n.total_destinatarios} leídas
                          </span>
                        </div>
                        <p style={{ margin: '0 0 6px', color: 'var(--slate-700)', fontSize: 13 }}>{n.mensaje}</p>
                        <div style={{ fontSize: 11, color: 'var(--slate-500)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          <span>Enviada: {new Date(n.fecha_envio).toLocaleString('es-CO')}</span>
                          <span>Destinatarios: {n.destinatarios}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {metaEnviadas.total > LIMITE && (
                <Pagination
                  total={metaEnviadas.total}
                  limit={metaEnviadas.limit}
                  offset={offsetEnviadas}
                  onChange={setOffsetEnviadas}
                />
              )}
            </>
          )}
        </div>
      )}

      {/* Modal solo Administrador: crear notificación */}
      {modalCrear && (
        <div className="modal-backdrop" onClick={() => setModalCrear(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <span className="modal-title">Nueva notificación en tiempo real</span>
              <button className="modal-close" onClick={() => setModalCrear(false)}>×</button>
            </div>
            <form onSubmit={enviarBroadcast}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {errorCrear && <div className="alert alert-danger">{errorCrear}</div>}
                {okCrear && <div className="alert alert-success">{okCrear}</div>}

                <div className="form-group">
                  <label className="form-label">Destinatarios</label>
                  <select
                    className="form-select"
                    id="form-rol-destino"
                    value={form.rol_destino}
                    onChange={e => setForm({ ...form, rol_destino: e.target.value })}
                  >
                    <option value="Aprendiz">Todos los aprendices activos</option>
                    <option value="Instructor">Todos los instructores activos</option>
                    <option value="Todos">Todos los aprendices e instructores</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="form-group">
                    <label className="form-label">Tipo</label>
                    <select
                      className="form-select"
                      id="form-tipo"
                      value={form.tipo}
                      onChange={e => setForm({ ...form, tipo: e.target.value })}
                    >
                      <option value="informativo">Informativo</option>
                      <option value="mantenimiento">Mantenimiento</option>
                      <option value="advertencia">Advertencia</option>
                      <option value="sistema">Sistema</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Prioridad</label>
                    <select
                      className="form-select"
                      id="form-prioridad"
                      value={form.prioridad}
                      onChange={e => setForm({ ...form, prioridad: e.target.value })}
                    >
                      <option value="Baja">Baja</option>
                      <option value="Media">Media</option>
                      <option value="Alta">Alta</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Título</label>
                  <input
                    type="text"
                    className="form-input"
                    id="form-titulo"
                    value={form.titulo}
                    onChange={e => setForm({ ...form, titulo: e.target.value })}
                    placeholder="Ej: Mantenimiento programado de la plataforma"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Mensaje</label>
                  <textarea
                    className="form-textarea"
                    id="form-mensaje"
                    rows={4}
                    value={form.mensaje}
                    onChange={e => setForm({ ...form, mensaje: e.target.value })}
                    placeholder="Escribe el contenido detallado de la notificación..."
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setModalCrear(false)}
                  disabled={enviando}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  id="btn-submit-broadcast"
                  disabled={enviando}
                >
                  {enviando ? 'Enviando…' : 'Enviar en tiempo real'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
