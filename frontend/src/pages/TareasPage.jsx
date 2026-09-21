// =====================================================
// pages/TareasPage.jsx
// Aprendiz: sus tareas (vista existente, sin cambios).
// Admin/Instructor: listado global de supervisión con
// filtros de servidor y paginación numerada (NUEVO).
// =====================================================
import { useState, useEffect } from 'react';
import { proyectosService, tareasService } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { estadoBadge, prioridadBadge, ProgressBar, LoadingCenter, EmptyState, formatFecha, Pagination } from '../components/helpers.jsx';

const LIMITE = 10;

export default function TareasPage() {
  const { esAdmin, esInstructor } = useAuth();
  const vistaSupervision = esAdmin || esInstructor;

  return vistaSupervision ? <TareasSupervision /> : <TareasAprendiz />;
}

// ── Aprendiz: comportamiento existente, sin cambios ─────────────
function TareasAprendiz() {
  const [tareas,  setTareas]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro,  setFiltro]  = useState('');
  const [estado,  setEstado]  = useState('');

  useEffect(() => {
    async function cargar() {
      try {
        const pRes = await proyectosService.getAll();
        const proyectos = pRes.data.data || [];

        const resultados = await Promise.allSettled(
          proyectos.map(p => tareasService.getByProyecto(p.id_proyecto)
            .then(r => (r.data.data || []).map(t => ({ ...t, proyecto_nombre: p.nombre })))
          )
        );

        const todas = resultados
          .filter(r => r.status === 'fulfilled')
          .flatMap(r => r.value);
        setTareas(todas);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    cargar();
  }, []);

  const tareasFiltradas = tareas.filter(t => {
    const matchTexto = t.titulo.toLowerCase().includes(filtro.toLowerCase()) ||
                       (t.asignado_nombre || '').toLowerCase().includes(filtro.toLowerCase()) ||
                       (t.proyecto_nombre || '').toLowerCase().includes(filtro.toLowerCase());
    const matchEstado = !estado || t.estado === estado;
    return matchTexto && matchEstado;
  });

  if (loading) return (
    <div>
      <div className="page-header"><div className="page-header-left"><h1 className="page-title">Mis Tareas</h1></div></div>
      <LoadingCenter />
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Mis Tareas</h1>
          <p className="page-subtitle">{tareasFiltradas.length} de {tareas.length} tareas</p>
        </div>
      </div>

      <div className="page-body">
        <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' }}>
          <input
            className="form-input"
            placeholder="🔍  Buscar tarea, asignado o proyecto…"
            value={filtro}
            onChange={e => setFiltro(e.target.value)}
            style={{ maxWidth:320 }}
          />
          <select className="form-select" value={estado} onChange={e=>setEstado(e.target.value)} style={{ maxWidth:180 }}>
            <option value="">Todos los estados</option>
            {['Pendiente','En curso','Completada','Cancelada'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {(filtro || estado) && (
            <button className="btn btn-ghost" onClick={() => { setFiltro(''); setEstado(''); }}>
              Limpiar filtros ×
            </button>
          )}
        </div>

        {tareasFiltradas.length === 0 ? (
          <EmptyState icon="✅" titulo="Sin tareas" desc="No hay tareas que coincidan con los filtros." />
        ) : (
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Tarea</th>
                    <th>Proyecto</th>
                    <th>Estado</th>
                    <th>Prioridad</th>
                    <th>Asignado a</th>
                    <th>Vencimiento</th>
                    <th>Avance</th>
                  </tr>
                </thead>
                <tbody>
                  {tareasFiltradas.map(t => (
                    <tr key={t.id_tarea}>
                      <td>
                        <strong>{t.titulo}</strong>
                        {t.descripcion && (
                          <div style={{ fontSize:11, color:'var(--slate-500)' }}>{t.descripcion.substring(0,60)}…</div>
                        )}
                      </td>
                      <td>
                        <span className="badge badge-slate">{t.proyecto_nombre}</span>
                      </td>
                      <td>{estadoBadge(t.estado)}</td>
                      <td>{prioridadBadge(t.prioridad)}</td>
                      <td>{t.asignado_nombre}</td>
                      <td>
                        {t.fecha_vencimiento ? (
                          <span style={{ color: new Date(t.fecha_vencimiento) < new Date() && t.estado !== 'Completada' ? 'var(--red-600)' : 'inherit' }}>
                            {formatFecha(t.fecha_vencimiento)}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ minWidth:120 }}>
                        <ProgressBar value={parseFloat(t.porcentaje_avance)||0} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Administrador/Instructor: supervisión global (NUEVO) ────────
function TareasSupervision() {
  const { esAdmin } = useAuth();
  const [tareas, setTareas] = useState([]);
  const [meta, setMeta] = useState({ total: 0, limit: LIMITE, offset: 0 });
  const [loading, setLoading] = useState(true);

  const [cc, setCc] = useState('');
  const [proyecto, setProyecto] = useState('');
  const [estado, setEstado] = useState('');
  const [prioridad, setPrioridad] = useState('');
  const [offset, setOffset] = useState(0);

  async function cargar() {
    setLoading(true);
    try {
      const params = { limit: LIMITE, offset };
      if (cc) params.cc = cc;
      if (proyecto) params.proyecto = proyecto;
      if (estado) params.estado = estado;
      if (prioridad) params.prioridad = prioridad;
      const r = await tareasService.getAllAdmin(params);
      setTareas(r.data.data || []);
      setMeta(r.data.meta || { total: 0, limit: LIMITE, offset: 0 });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  useEffect(() => { cargar(); }, [offset, estado, prioridad]); // eslint-disable-line
  useEffect(() => { setOffset(0); }, [cc, proyecto, estado, prioridad]);
  useEffect(() => {
    const t = setTimeout(() => { if (offset === 0) cargar(); }, 350);
    return () => clearTimeout(t);
  }, [cc, proyecto]); // eslint-disable-line

  if (loading && tareas.length === 0) return (
    <div>
      <div className="page-header"><div className="page-header-left"><h1 className="page-title">Tareas</h1></div></div>
      <LoadingCenter />
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Tareas</h1>
          <p className="page-subtitle">
            {esAdmin ? 'Supervisión de todos los proyectos' : 'Supervisión de tus proyectos'} · {meta.total} tarea(s)
          </p>
        </div>
      </div>

      <div className="page-body">
        {/* Filtros: por cc (aprendiz o instructor), proyecto, estado y prioridad */}
        <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' }}>
          <input
            className="form-input" style={{ maxWidth:220 }}
            placeholder="🔍  cc aprendiz o instructor…"
            value={cc} onChange={e => setCc(e.target.value.replace(/[^A-Za-z0-9.-]/g, ''))}
          />
          <input
            className="form-input" style={{ maxWidth:220 }}
            placeholder="Nombre del proyecto…"
            value={proyecto} onChange={e => setProyecto(e.target.value)}
          />
          <select className="form-select" value={estado} onChange={e=>setEstado(e.target.value)} style={{ maxWidth:170 }}>
            <option value="">Todos los estados</option>
            {['Pendiente','En curso','Completada','Cancelada'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select className="form-select" value={prioridad} onChange={e=>setPrioridad(e.target.value)} style={{ maxWidth:150 }}>
            <option value="">Toda prioridad</option>
            {['Baja','Media','Alta'].map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          {(cc || proyecto || estado || prioridad) && (
            <button className="btn btn-ghost" onClick={() => { setCc(''); setProyecto(''); setEstado(''); setPrioridad(''); }}>
              Limpiar filtros ×
            </button>
          )}
        </div>

        {tareas.length === 0 ? (
          <EmptyState icon="✅" titulo="Sin tareas" desc="No hay tareas que coincidan con los filtros." />
        ) : (
          <>
            <div className="card">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Tarea</th>
                      <th>Proyecto</th>
                      <th>Estado</th>
                      <th>Prioridad</th>
                      <th>Aprendiz (cc)</th>
                      <th>Instructor (cc)</th>
                      <th>Vencimiento</th>
                      <th>Avance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tareas.map(t => (
                      <tr key={t.id_tarea}>
                        <td><strong>{t.titulo}</strong></td>
                        <td><span className="badge badge-slate">{t.nombre_proyecto}</span></td>
                        <td>{estadoBadge(t.estado)}</td>
                        <td>{prioridadBadge(t.prioridad)}</td>
                        <td style={{ fontSize:12 }}>{t.asignado_nombre}<br/><span style={{ color:'var(--slate-500)' }}>{t.cc_aprendiz || '—'}</span></td>
                        <td style={{ fontSize:12 }}>{t.instructor_nombre}<br/><span style={{ color:'var(--slate-500)' }}>{t.cc_instructor || '—'}</span></td>
                        <td>
                          {t.fecha_vencimiento ? (
                            <span style={{ color: new Date(t.fecha_vencimiento) < new Date() && t.estado !== 'Completada' ? 'var(--red-600)' : 'inherit' }}>
                              {formatFecha(t.fecha_vencimiento)}
                            </span>
                          ) : '—'}
                        </td>
                        <td style={{ minWidth:120 }}>
                          <ProgressBar value={parseFloat(t.porcentaje_avance)||0} />
                        </td>
                      </tr>
                    ))}
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
