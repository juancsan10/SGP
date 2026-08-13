// =====================================================
// pages/TareasPage.jsx
// Vista de tareas de todos los proyectos accesibles
// =====================================================
import { useState, useEffect } from 'react';
import { proyectosService, tareasService } from '../services/api.js';
import { estadoBadge, prioridadBadge, ProgressBar, LoadingCenter, EmptyState, formatFecha } from '../components/helpers.jsx';

export default function TareasPage() {
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
      <div className="page-header"><div className="page-header-left"><h1 className="page-title">Tareas</h1></div></div>
      <LoadingCenter />
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Tareas</h1>
          <p className="page-subtitle">{tareasFiltradas.length} de {tareas.length} tareas</p>
        </div>
      </div>

      <div className="page-body">
        {/* Filtros */}
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
