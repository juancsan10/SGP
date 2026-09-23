// =====================================================
// pages/HistorialPage.jsx
// Historial de cambios / auditoría (solo Admin).
// NUEVO: dashboard de estadísticas consolidadas arriba +
// búsqueda con filtros de servidor y paginación numerada.
// =====================================================
import { useState, useEffect } from 'react';
import { historialService } from '../services/api.js';
import { LoadingCenter, EmptyState, Pagination } from '../components/helpers.jsx';

const ACCIONES = {
  INSERT: { label: 'Creación',  cls: 'badge-green' },
  UPDATE: { label: 'Edición',   cls: 'badge-blue'  },
  DELETE: { label: 'Eliminación', cls: 'badge-red' },
};

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
