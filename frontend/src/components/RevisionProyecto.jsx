// =====================================================
// components/RevisionProyecto.jsx  (NUEVO)
// Pestaña "Revisión" del detalle de un proyecto — solo Administrador.
// Reúne lo que el Administrador supervisa, sin poder modificarlo:
//   · por cada entregable: documentos adjuntos (se abren en otra pestaña),
//     comentarios del instructor y de los aprendices, y la evaluación;
//   · las entregas de tareas con su calificación y retroalimentación.
// =====================================================
import { useEffect, useState } from 'react';
import { proyectosService } from '../services/api.js';
import { estadoBadge, formatFecha, LoadingCenter } from './helpers.jsx';
import { CalificacionChip, DetalleEntregaModal } from './CalificacionEntrega.jsx';

const FILTROS = [
  { id: 'todos', label: 'Todos' },
  { id: 'documentos', label: 'Con documentos' },
  { id: 'comentarios', label: 'Con comentarios' },
  { id: 'evaluados', label: 'Evaluados' },
];

function rolBadge(rol) {
  const cls = rol === 'Instructor' ? 'badge-blue' : rol === 'Aprendiz' ? 'badge-green' : 'badge-slate';
  return <span className={`badge ${cls}`} style={{ fontSize: 10 }}>{rol}</span>;
}

function Bloque({ icono, titulo, vacio, children, cantidad }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--slate-600)', marginBottom: 8 }}>
        {icono} {titulo} <span style={{ color: 'var(--slate-400)', fontWeight: 500 }}>({cantidad})</span>
      </div>
      {cantidad === 0 ? <p style={{ fontSize: 12, color: 'var(--slate-400)' }}>{vacio}</p> : children}
    </div>
  );
}

export default function RevisionProyecto({ idProyecto }) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [entregaVer, setEntregaVer] = useState(null);

  useEffect(() => {
    let vigente = true;
    proyectosService.getRevision(idProyecto)
      .then(r => { if (vigente) setDatos(r.data.data); })
      .catch(err => { if (vigente) setError(err.response?.data?.message || 'No se pudo cargar la revisión del proyecto'); });
    return () => { vigente = false; };
  }, [idProyecto]);

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!datos) return <LoadingCenter />;

  const { entregables, entregas } = datos;
  const totales = {
    documentos: entregables.reduce((n, e) => n + e.archivos.length, 0) + entregas.filter(x => x.ruta_archivo).length,
    comentarios: entregables.reduce((n, e) => n + e.comentarios.length, 0),
    evaluaciones: entregables.reduce((n, e) => n + e.evaluaciones.length, 0),
    calificadas: entregas.filter(x => x.calificacion !== null).length,
  };
  const visibles = entregables.filter(e =>
    filtro === 'documentos' ? e.archivos.length > 0 :
    filtro === 'comentarios' ? e.comentarios.length > 0 :
    filtro === 'evaluados' ? e.evaluaciones.length > 0 : true);

  return (
    <div>
      <div className="alert alert-info" style={{ marginBottom: 16 }}>
        <span>
          <strong>Vista de supervisión.</strong> Como administrador revisas los documentos adjuntos, los comentarios
          del instructor y de los aprendices, y las calificaciones. No comentas ni calificas: eso le corresponde al instructor.
        </span>
      </div>

      <div className="stats-grid" style={{ marginBottom: 20 }}>
        {[
          ['📎', totales.documentos, 'Documentos adjuntos', 'blue'],
          ['💬', totales.comentarios, 'Comentarios', 'green'],
          ['📝', totales.evaluaciones, 'Evaluaciones de entregables', 'amber'],
          ['✅', `${totales.calificadas}/${entregas.length}`, 'Entregas calificadas', 'green'],
        ].map(([ico, val, label, color]) => (
          <div className="stat-card" key={label}>
            <div className={`stat-icon ${color}`}>{ico}</div>
            <div><div className="stat-value">{val}</div><div className="stat-label">{label}</div></div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {FILTROS.map(f => (
          <button key={f.id} className={`btn btn-sm ${filtro === f.id ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFiltro(f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      <h3 style={{ fontSize: 14, margin: '4px 0 10px' }}>Entregables</h3>
      {visibles.length === 0 && (
        <div className="card"><div className="empty-state"><div className="empty-state-icon">📭</div><h3>Nada que revisar con este filtro</h3></div></div>
      )}
      {visibles.map(e => (
        <div className="card" key={e.id_entregable} style={{ marginBottom: 12 }}>
          <div className="card-header" style={{ justifyContent: 'space-between' }}>
            <div>
              <strong>{e.nombre}</strong>
              <span style={{ fontSize: 12, color: 'var(--slate-500)', marginLeft: 8 }}>{e.nombre_fase} · {formatFecha(e.fecha_entrega)}</span>
            </div>
            {estadoBadge(e.estado)}
          </div>
          <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
            <Bloque icono="📎" titulo="Documentos" cantidad={e.archivos.length} vacio="Sin documentos adjuntos.">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {e.archivos.map(a => (
                  <a key={a.id_archivo} href={a.ruta_archivo} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between', gap: 8, textDecoration: 'none' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📄 {a.nombre_archivo}</span>
                    <span style={{ color: 'var(--slate-400)', flexShrink: 0 }}>Abrir ↗</span>
                  </a>
                ))}
              </div>
            </Bloque>
            <Bloque icono="💬" titulo="Comentarios" cantidad={e.comentarios.length} vacio="Sin comentarios.">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {e.comentarios.map(c => (
                  <div key={c.id_comentario} style={{ background: 'var(--slate-50)', borderRadius: 8, padding: '8px 10px' }}>
                    <div style={{ fontSize: 11, color: 'var(--slate-500)', marginBottom: 3, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <strong style={{ color: 'var(--slate-700)' }}>{c.autor_nombre}</strong> {rolBadge(c.autor_rol)}
                      <span>{new Date(c.fecha_comentario).toLocaleString('es-CO')}</span>
                    </div>
                    <div style={{ fontSize: 13 }}>{c.contenido}</div>
                  </div>
                ))}
              </div>
            </Bloque>
            <Bloque icono="📝" titulo="Evaluación" cantidad={e.evaluaciones.length} vacio="Aún no evaluado.">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {e.evaluaciones.map(v => (
                  <div key={v.id_evaluacion} style={{ background: 'var(--green-50)', borderRadius: 8, padding: '8px 10px' }}>
                    <CalificacionChip valor={v.calificacion} />
                    {v.comentarios && <div style={{ fontSize: 12, color: 'var(--slate-600)', marginTop: 6 }}>{v.comentarios}</div>}
                    <div style={{ fontSize: 11, color: 'var(--slate-500)', marginTop: 4 }}>
                      {v.evaluador_nombre} · {new Date(v.fecha_evaluacion).toLocaleDateString('es-CO')}
                    </div>
                  </div>
                ))}
              </div>
            </Bloque>
          </div>
        </div>
      ))}

      <h3 style={{ fontSize: 14, margin: '24px 0 10px' }}>Entregas de tareas</h3>
      {entregas.length === 0 ? (
        <div className="card"><div className="empty-state"><div className="empty-state-icon">📤</div><h3>Sin entregas de tareas</h3></div></div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Tarea</th><th>Aprendiz (cc)</th><th>Estado</th><th>Calificación</th><th>Material</th><th>Retroalimentación</th><th></th></tr>
              </thead>
              <tbody>
                {entregas.map(x => (
                  <tr key={x.id_entrega}>
                    <td><strong>{x.titulo_tarea}</strong></td>
                    <td style={{ fontSize: 12 }}>{x.aprendiz_nombre}<br /><span style={{ color: 'var(--slate-500)' }}>{x.cc_aprendiz || '—'}</span></td>
                    <td>{estadoBadge(x.estado)}</td>
                    <td><CalificacionChip valor={x.calificacion} /></td>
                    <td style={{ fontSize: 12 }}>
                      {x.ruta_archivo && <div><a href={x.ruta_archivo} target="_blank" rel="noopener noreferrer">📄 Archivo ↗</a></div>}
                      {x.url_entrega && <div><a href={x.url_entrega} target="_blank" rel="noopener noreferrer">🔗 Enlace ↗</a></div>}
                      {!x.ruta_archivo && !x.url_entrega && <span style={{ color: 'var(--slate-400)' }}>—</span>}
                    </td>
                    <td style={{ fontSize: 12, maxWidth: 240 }}>{x.observacion_instructor || <span style={{ color: 'var(--slate-400)' }}>Sin revisar</span>}</td>
                    <td><button className="btn btn-secondary btn-sm" onClick={() => setEntregaVer(x.id_entrega)}>Ver</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {entregaVer && <DetalleEntregaModal idEntrega={entregaVer} onClose={() => setEntregaVer(null)} />}
    </div>
  );
}
