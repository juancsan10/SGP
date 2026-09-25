// =====================================================
// pages/HistorialPage.jsx
// Historial de cambios / auditoría (solo Admin).
// NUEVO: dashboard de estadísticas consolidadas arriba +
// búsqueda con filtros de servidor y paginación numerada.
// =====================================================
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { historialService } from '../services/api.js';
import { LoadingCenter, EmptyState, Pagination, portalDestino } from '../components/helpers.jsx';

const ACCIONES = {
  INSERT: { label: 'Creación',  cls: 'badge-green' },
  UPDATE: { label: 'Edición',   cls: 'badge-blue'  },
  DELETE: { label: 'Eliminación', cls: 'badge-red' },
  DELETE_PERMANENTE: { label: 'Usuario eliminado', cls: 'badge-red' }, // NUEVO
};

// ── NUEVO: usuarios eliminados con su cuestionario ────────────────
const ETIQUETAS_RESUMEN = {
  proyectos: 'Proyectos reasignados', tareas: 'Tareas eliminadas', entregas: 'Entregas eliminadas',
  equipos: 'Equipos de los que salió', mensajes: 'Mensajes conservados', comentarios: 'Comentarios conservados',
  evaluaciones: 'Evaluaciones conservadas', notificaciones: 'Notificaciones eliminadas', solicitudes: 'Solicitudes eliminadas',
};

function DetalleEliminacion({ id, onClose }) {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    historialService.getEliminacion(id)
      .then(r => setD(r.data.data))
      .catch(err => setError(err.response?.data?.message || 'No se pudo cargar el registro'));
  }, [id]);
  const resumen = d?.resumen ? Object.entries(d.resumen).filter(([k, n]) => ETIQUETAS_RESUMEN[k] && n > 0) : [];
  // Portal: se monta en <body> para quedar por encima del encabezado fijo.
  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Justificación de eliminación</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {error && <div className="alert alert-error">{error}</div>}
          {!d && !error && <LoadingCenter />}
          {d && (
            <>
              <div style={{ background: 'var(--red-50)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
                <div style={{ fontWeight: 700 }}>{d.nombre_completo}</div>
                <div style={{ fontSize: 12, color: 'var(--slate-600)' }}>{d.rol} · cc {d.identificacion || '—'} · {d.correo}</div>
                <div style={{ fontSize: 11, color: 'var(--slate-500)', marginTop: 4 }}>
                  Eliminado por {d.admin_nombre} el {new Date(d.fecha_eliminacion).toLocaleString('es-CO')}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Motivo</label>
                <div><span className="badge badge-red">{d.motivo}</span></div>
              </div>
              <div className="form-group">
                <label className="form-label">Descripción</label>
                <p style={{ fontSize: 13, whiteSpace: 'pre-wrap', background: 'var(--slate-50)', borderRadius: 8, padding: '10px 12px' }}>{d.descripcion}</p>
              </div>
              <div className="form-group">
                <label className="form-label">Archivos de soporte ({d.archivos.length})</label>
                {d.archivos.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--slate-500)' }}>No se adjuntaron archivos.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {d.archivos.map(a => (
                      <a key={a.id_archivo} href={a.ruta_archivo} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13 }}>
                        📄 {a.nombre_original} ↗
                      </a>
                    ))}
                  </div>
                )}
              </div>
              {resumen.length > 0 && (
                <div className="form-group">
                  <label className="form-label">Información afectada</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px 12px', fontSize: 12 }}>
                    {resumen.map(([k, n]) => (
                      <div key={k} style={{ display: 'contents' }}>
                        <span style={{ color: 'var(--slate-600)' }}>{ETIQUETAS_RESUMEN[k]}</span><strong>{n}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        <div className="modal-footer"><button className="btn btn-secondary" onClick={onClose}>Cerrar</button></div>
      </div>
    </div>,
    portalDestino()
  );
}

function UsuariosEliminados() {
  const [filas, setFilas] = useState([]);
  const [meta, setMeta] = useState({ total: 0, limit: 5, offset: 0 });
  const [offset, setOffset] = useState(0);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const [verId, setVerId] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      historialService.getEliminaciones({ limit: 5, offset, q: q || undefined })
        .then(r => { setFilas(r.data.data || []); setMeta(r.data.meta); setError(''); })
        .catch(err => setError(err.response?.data?.message || 'No se pudo cargar el registro de eliminaciones'));
    }, 300);
    return () => clearTimeout(t);
  }, [offset, q]);
  useEffect(() => { setOffset(0); }, [q]);

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <div className="card-header" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <strong>🗑️ Usuarios eliminados · {meta.total}</strong>
        <input className="form-input" style={{ maxWidth: 260 }} placeholder="Buscar nombre, cc, correo o motivo…"
          value={q} onChange={e => setQ(e.target.value)} />
      </div>
      {error && <div className="alert alert-error" style={{ margin: 12 }}>{error}</div>}
      {filas.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">🗂️</div><h3>Sin usuarios eliminados</h3>
          <p>Cada eliminación queda aquí con su motivo, descripción y archivos de soporte.</p></div>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Usuario</th><th>Rol</th><th>Motivo</th><th>Soportes</th><th>Fecha</th><th></th></tr></thead>
              <tbody>
                {filas.map(f => (
                  <tr key={f.id_eliminacion}>
                    <td style={{ fontSize: 12 }}><strong style={{ fontSize: 13 }}>{f.nombre_completo}</strong><br />
                      <span style={{ color: 'var(--slate-500)' }}>cc {f.identificacion || '—'} · {f.correo}</span></td>
                    <td><span className="badge badge-slate">{f.rol}</span></td>
                    <td style={{ fontSize: 12 }}>{f.motivo}</td>
                    <td style={{ fontSize: 12 }}>{f.total_archivos > 0 ? `📎 ${f.total_archivos}` : '—'}</td>
                    <td style={{ fontSize: 12 }}>{new Date(f.fecha_eliminacion).toLocaleString('es-CO')}</td>
                    <td><button className="btn btn-secondary btn-sm" onClick={() => setVerId(f.id_eliminacion)}>Ver justificación</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '0 12px' }}>
            <Pagination total={meta.total} limit={meta.limit} offset={meta.offset} onChange={setOffset} />
          </div>
        </>
      )}
      {verId && <DetalleEliminacion id={verId} onClose={() => setVerId(null)} />}
    </div>
  );
}

const LIMITE = 15;

// ── Mini barra horizontal (sin dependencias de gráficas) ─────────
function BarraLista({ items, campoLabel, campoValor }) {
  const max = Math.max(1, ...items.map(i => i[campoValor]));
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {items.map((it, i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:140, fontSize:12, color:'var(--slate-600)', flexShrink:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            {it[campoLabel]}
          </div>
          <div style={{ flex:1, background:'var(--slate-100)', borderRadius:6, overflow:'hidden', height:18 }}>
            <div style={{ width:`${(it[campoValor]/max)*100}%`, background:'var(--role-primary, var(--green-600))', height:'100%' }} />
          </div>
          <div style={{ width:30, fontSize:12, fontWeight:700, textAlign:'right' }}>{it[campoValor]}</div>
        </div>
      ))}
    </div>
  );
}

export default function HistorialPage() {
  // ── Dashboard (NUEVO) ────────────────────────────
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [errorStats, setErrorStats] = useState(''); // NUEVO: aviso visible si falla el dashboard

  // ── Listado detallado con filtros de servidor (NUEVO) ─
  const [historial, setHistorial] = useState([]);
  const [meta, setMeta] = useState({ total: 0, limit: LIMITE, offset: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(''); // NUEVO: aviso visible si falla la búsqueda
  const [q, setQ] = useState('');
  const [accion, setAccion] = useState('');
  const [tabla, setTabla] = useState('');
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    historialService.getEstadisticas()
      .then(r => setStats(r.data.data))
      .catch(err => setErrorStats(err.response?.data?.message || 'No se pudieron cargar las estadísticas'))
      .finally(() => setLoadingStats(false));
  }, []);

  async function cargar() {
    setLoading(true); setError('');
    try {
      const params = { limit: LIMITE, offset };
      if (q) params.q = q;
      if (accion) params.accion = accion;
      if (tabla) params.tabla = tabla;
      const r = await historialService.getAll(params);
      setHistorial(r.data.data || []);
      setMeta(r.data.meta || { total: 0, limit: LIMITE, offset: 0 });
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo cargar el historial');
    }
    finally { setLoading(false); }
  }

  useEffect(() => { cargar(); }, [offset, accion, tabla]); // eslint-disable-line
  useEffect(() => { setOffset(0); }, [q, accion, tabla]);
  useEffect(() => {
    const t = setTimeout(() => { if (offset === 0) cargar(); }, 350);
    return () => clearTimeout(t);
  }, [q]); // eslint-disable-line

  const tablasConocidas = stats?.porTabla?.map(t => t.tabla_afectada) || [];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Historial</h1>
          <p className="page-subtitle">Auditoría y estadísticas consolidadas del sistema</p>
        </div>
      </div>

      <div className="page-body">
        {/* ── Dashboard consolidado (NUEVO) ──────────── */}
        {loadingStats ? <LoadingCenter texto="Cargando estadísticas…" /> : errorStats ? (
          <div className="alert alert-error" style={{ marginBottom: 20 }}>{errorStats}</div>
        ) : stats && (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon green">👥</div>
                <div><div className="stat-value">{stats.totales.usuarios_activos}</div><div className="stat-label">Usuarios activos ({stats.totales.total_usuarios} total)</div></div>
              </div>
              <div className="stat-card">
                <div className="stat-icon blue">📁</div>
                <div><div className="stat-value">{stats.totales.proyectos_activos}</div><div className="stat-label">Proyectos activos ({stats.totales.total_proyectos} total)</div></div>
              </div>
              <div className="stat-card">
                <div className="stat-icon green">✅</div>
                <div><div className="stat-value">{stats.totales.tareas_completadas}</div><div className="stat-label">Tareas completadas ({stats.totales.total_tareas} total)</div></div>
              </div>
              <div className="stat-card">
                <div className="stat-icon amber">📤</div>
                <div><div className="stat-value">{stats.totales.entregas_con_correccion}</div><div className="stat-label">Entregas con corrección</div></div>
              </div>
              <div className="stat-card">
                <div className="stat-icon amber">👤</div>
                <div><div className="stat-value">{stats.totales.solicitudes_pendientes}</div><div className="stat-label">Solicitudes de equipo pendientes</div></div>
              </div>
              <div className="stat-card">
                <div className="stat-icon red">🚦</div>
                <div><div className="stat-value">{stats.totales.repositorios_con_alerta}</div><div className="stat-label">Repositorios con alerta de semáforo</div></div>
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:24 }}>
              <div className="card">
                <div className="card-header"><strong>📊 Actividad por tabla</strong></div>
                <div className="card-body">
                  {stats.porTabla.length === 0 ? <p style={{ fontSize:13, color:'var(--slate-500)' }}>Sin datos.</p> : (
                    <BarraLista items={stats.porTabla} campoLabel="tabla_afectada" campoValor="total" />
                  )}
                </div>
              </div>
              <div className="card">
                <div className="card-header"><strong>⚙️ Actividad por tipo de acción</strong></div>
                <div className="card-body">
                  {stats.porAccion.length === 0 ? <p style={{ fontSize:13, color:'var(--slate-500)' }}>Sin datos.</p> : (
                    <BarraLista items={stats.porAccion} campoLabel="accion" campoValor="total" />
                  )}
                </div>
              </div>
            </div>

            <div className="card" style={{ marginBottom:24 }}>
              <div className="card-header"><strong>🏆 Usuarios con más actividad registrada</strong></div>
              <div className="card-body">
                {stats.usuariosMasActivos.length === 0 ? <p style={{ fontSize:13, color:'var(--slate-500)' }}>Sin datos.</p> : (
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Usuario</th><th>Rol</th><th>Acciones registradas</th></tr></thead>
                      <tbody>
                        {stats.usuariosMasActivos.map((u, i) => (
                          <tr key={i}>
                            <td>{u.usuario}</td>
                            <td><span className="badge badge-slate">{u.rol}</span></td>
                            <td><strong>{u.total_acciones}</strong></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── Búsqueda detallada con filtros de servidor (NUEVO) ── */}
        {/* NUEVO: registro de eliminaciones con su cuestionario */}
        <UsuariosEliminados />

        <h3 style={{ fontFamily:'var(--font-display)', fontSize:16, marginBottom:12 }}>🔍 Búsqueda detallada</h3>
        <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' }}>
          <input
            className="form-input" style={{ maxWidth:260 }}
            placeholder="🔍  Buscar tabla o usuario…"
            value={q} onChange={e=>setQ(e.target.value)}
          />
          <select className="form-select" style={{ maxWidth:180 }} value={accion} onChange={e=>setAccion(e.target.value)}>
            <option value="">Todas las acciones</option>
            {Object.keys(ACCIONES).map(a=><option key={a} value={a}>{ACCIONES[a].label}</option>)}
          </select>
          <select className="form-select" style={{ maxWidth:200 }} value={tabla} onChange={e=>setTabla(e.target.value)}>
            <option value="">Todas las tablas</option>
            {tablasConocidas.map(t=><option key={t} value={t}>{t}</option>)}
          </select>
          {(q||accion||tabla) && (
            <button className="btn btn-ghost" onClick={()=>{setQ('');setAccion('');setTabla('');}}>
              Limpiar ×
            </button>
          )}
        </div>

        {/* NUEVO: aviso visible si falla la búsqueda */}
        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        {loading && historial.length === 0 ? <LoadingCenter /> : historial.length === 0 ? (
          <EmptyState icon="📋" titulo="Sin registros" desc="No hay cambios que coincidan." />
        ) : (
          <>
            <div className="card">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>#</th><th>Tabla</th><th>Registro</th>
                      <th>Acción</th><th>Usuario</th><th>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historial.map(h => {
                      const acc = ACCIONES[h.accion] || { label: h.accion, cls: 'badge-slate' };
                      return (
                        <tr key={h.id_historial}>
                          <td style={{ color:'var(--slate-400)', fontSize:11 }}>#{h.id_historial}</td>
                          <td>
                            <span className="badge badge-slate" style={{ fontFamily:'monospace', fontSize:10 }}>
                              {h.tabla_afectada}
                            </span>
                          </td>
                          <td style={{ fontSize:12 }}>ID: {h.id_registro ?? '—'}</td>
                          <td><span className={`badge ${acc.cls}`}>{acc.label}</span></td>
                          <td style={{ fontSize:13 }}>{h.usuario_nombre || '—'}</td>
                          <td style={{ fontSize:11, color:'var(--slate-500)' }}>
                            {new Date(h.fecha_cambio).toLocaleString('es-CO')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <Pagination total={meta.total} limit={meta.limit} offset={meta.offset} onChange={setOffset} />
          </>
        )}
      </div>
    </div>
  );
}
